use std::{cell::RefCell, fs, io, sync::Once};

use landscape2_core::{
    data::{
        Category, CrunchbaseData, GithubData, Organization, Repository, RepositoryGithubData, Subcategory,
    },
    datasets::embed::{self, Classification},
    settings::{Footer, GoogleTagManager, Header, Images},
};
use pretty_assertions::assert_eq;
use serde_json::Value;
use tempfile::TempDir;

use super::*;

thread_local! {
    /// Logs written from the thread while it captures them (see
    /// [`capture_logs`]).
    static CAPTURED_LOGS: RefCell<Option<Vec<u8>>> = const { RefCell::new(None) };
}

/// Valid landscape data file.
const DATA_YAML: &str = include_str!("../testdata/data.yml");

/// Landscape games file with a quiz option missing from the landscape data.
const GAMES_UNKNOWN_OPTION_YAML: &str = include_str!("../testdata/games-unknown-option.yml");

/// Sample SVG logo used in the tests.
const SAMPLE_SVG: &str = include_str!("../testdata/logos/sample.svg");

/// Description containing HTML and JSON special characters.
const TRICKY_DESCRIPTION: &str = "The \"cloud native\" <landscape> & more\non two lines";

/// Logs writer that keeps the logs written from the threads capturing them,
/// discarding the rest.
struct CapturedLogs;

impl io::Write for CapturedLogs {
    /// [`io::Write::flush`].
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }

    /// [`io::Write::write`].
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        CAPTURED_LOGS.with_borrow_mut(|logs| {
            if let Some(logs) = logs {
                logs.extend_from_slice(buf);
            }
        });
        Ok(buf.len())
    }
}

#[test]
fn test_report_summary_file_name_format() {
    assert_eq!(
        clomonitor::report_summary_file_name("cncf", "artifact-hub"),
        "clomonitor_cncf_artifact-hub.svg"
    );
}

#[tokio::test]
async fn test_copy_data_sources_files_writes_fetched_bytes() {
    // Setup server expectations, serving the data file only once
    let data = "categories: []\r\n# Données\n";
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", "/data.yml")
        .with_status(200)
        .with_body(data)
        .expect(1)
        .create_async()
        .await;

    // Setup the build arguments, with a local settings file, and the output directory
    let tmp_dir = TempDir::new().unwrap();
    let settings = "foundation: Foundation\nurl: https://landscape.example\n";
    let settings_file = tmp_dir.path().join("settings.yml");
    fs::write(&settings_file, settings).unwrap();
    let args = build_args(
        DataSource::new_from_url(format!("{}/data.yml", server.url())),
        SettingsSource {
            settings_file: Some(settings_file),
            settings_url: None,
        },
        tmp_dir.path().join("out"),
    );
    setup_output_dir(&args.output_dir, &[]).unwrap();

    // Run the sources reading and copy, as the build does
    let raw_sources = RawSources::read(&args).await.unwrap();
    copy_data_sources_files(&args, &raw_sources).unwrap();

    // Check the fetched and local sources are written, and the url fetched once
    let sources_path = args.output_dir.join(SOURCES_PATH);
    assert_eq!(fs::read(sources_path.join("data.yml")).unwrap(), data.as_bytes());
    assert_eq!(
        fs::read_to_string(sources_path.join("settings.yml")).unwrap(),
        settings
    );
    assert!(!sources_path.join("games.yml").exists());
    assert!(!sources_path.join("guide.yml").exists());
    mock.assert_async().await;
}

#[test]
fn test_generate_api_writes_nested_endpoint_files() {
    // Setup a landscape with a project in a subcategory and the output directory
    let tmp_dir = TempDir::new().unwrap();
    let landscape_data = LandscapeData {
        categories: vec![Category {
            name: "App Definition".to_string(),
            normalized_name: "app-definition".to_string(),
            subcategories: vec![Subcategory {
                name: "Database".to_string(),
                normalized_name: "database".to_string(),
            }],
        }],
        items: vec![Item {
            category: "App Definition".to_string(),
            id: "app-definition--database--project".to_string(),
            maturity: Some("graduated".to_string()),
            name: "Project".to_string(),
            subcategory: "Database".to_string(),
            ..Default::default()
        }],
    };
    let settings = settings(None);
    let sources = ApiSources {
        landscape_data: &landscape_data,
        settings: &settings,
    };

    // Run the API generation
    generate_api(&sources, tmp_dir.path()).unwrap();

    // Check the root, nested category and project endpoints files are written
    let api_path = tmp_dir.path().join(API_PATH);
    let read_json = |path: &str| -> Value {
        serde_json::from_str(&fs::read_to_string(api_path.join(path)).unwrap()).unwrap()
    };
    let index = read_json("index.json");
    assert_eq!(index["categories"][0]["normalized_name"], "app-definition");
    let category_items = read_json("categories/app-definition/all.json");
    assert_eq!(category_items[0]["id"], "app-definition--database--project");
    let subcategory_count = read_json("categories/app-definition/database/count.json");
    assert_eq!(subcategory_count, serde_json::json!({"count": 1}));
    let project = read_json("projects/app-definition--database--project.json");
    assert_eq!(project["name"], "Project");
    assert_eq!(read_json("members/all.json"), serde_json::json!([]));
}

#[test]
fn test_local_inputs_includes_cache_dir_and_local_settings_images() {
    // Setup build arguments with a cache directory, and settings with local
    // and remote images
    let args = BuildArgs {
        cache_dir: Some(PathBuf::from("cache")),
        ..build_args(
            DataSource {
                data_file: Some(PathBuf::from("data.yml")),
                data_url: None,
            },
            SettingsSource {
                settings_file: Some(PathBuf::from("settings.yml")),
                settings_url: None,
            },
            PathBuf::from("build"),
        )
    };
    let settings = settings_with_images(
        Some("images/favicon.png"),
        Some("https://images.example/footer.svg"),
        Some("images/header.svg"),
    );

    // Run the local inputs collection
    let inputs = local_inputs(&args, &settings);

    // Check the local inputs are returned, and the remote image is not
    assert_eq!(
        inputs,
        [
            Path::new("cache"),
            Path::new("data.yml"),
            Path::new("settings.yml"),
            Path::new("images/header.svg"),
            Path::new("images/favicon.png"),
        ]
    );
}

#[tokio::test]
async fn test_prepare_items_logos_failed_logo_reported_and_left_empty() {
    // Setup a logos path that only contains one of the two logos used
    let tmp_dir = TempDir::new().unwrap();
    let logos_path = tmp_dir.path().join("logos");
    fs::create_dir(&logos_path).unwrap();
    fs::write(logos_path.join("ok.svg"), SAMPLE_SVG).unwrap();
    let output_dir = tmp_dir.path().join("out");
    setup_output_dir(&output_dir, &[]).unwrap();
    let mut landscape_data = landscape_data(&[("item-ok", "ok.svg"), ("item-missing", "missing.svg")]);

    // Run the logos preparation
    let logo_failures = prepare_items_logos(
        &reqwest::Client::new(),
        &LogosSource {
            logos_path: Some(logos_path.clone()),
            logos_url: None,
        },
        &LogosViewbox::default(),
        &mut landscape_data,
        &output_dir,
    )
    .await;

    // Check the failed logo is reported and left empty
    assert_eq!(
        logo_failures,
        vec![LogoFailure {
            error: format!(
                "error reading logo {}: No such file or directory (os error 2)",
                logos_path.join("missing.svg").display()
            ),
            item_id: "item-missing".to_string(),
            logo: "missing.svg".to_string(),
        }]
    );
    assert_eq!(landscape_data.items[1].logo, "");

    // Check the other logo is prepared and written to the output directory
    let logo = &landscape_data.items[0].logo;
    assert!(
        logo.starts_with("logos/") && Path::new(logo).extension() == Some(OsStr::new("svg")),
        "logo: {logo}"
    );
    assert!(output_dir.join(logo).is_file());
}

#[tokio::test]
async fn test_prepare_items_logos_shared_logo_maps_to_same_path() {
    // Setup server expectations, serving the shared logo only once
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", "/logos/shared.svg")
        .with_status(200)
        .with_body(SAMPLE_SVG)
        .expect(1)
        .create_async()
        .await;

    // Setup two items sharing the same logo and the output directory
    let tmp_dir = TempDir::new().unwrap();
    setup_output_dir(tmp_dir.path(), &[]).unwrap();
    let mut landscape_data = landscape_data(&[("item-a", "shared.svg"), ("item-b", "shared.svg")]);

    // Run the logos preparation
    let logo_failures = prepare_items_logos(
        &reqwest::Client::new(),
        &LogosSource {
            logos_path: None,
            logos_url: Some(format!("{}/logos", server.url())),
        },
        &LogosViewbox::default(),
        &mut landscape_data,
        tmp_dir.path(),
    )
    .await;

    // Check both items point to the same prepared logo, fetched once
    assert_eq!(logo_failures, vec![]);
    let logo = &landscape_data.items[0].logo;
    assert_eq!(&landscape_data.items[1].logo, logo);
    assert!(tmp_dir.path().join(logo).is_file());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_prepare_settings_images_named_by_location_digest() {
    // Setup server expectations for the remote footer logo
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", "/images/footer.PNG")
        .with_status(200)
        .with_body("footer")
        .expect(1)
        .create_async()
        .await;

    // Setup local header logo and favicon, and the output directory
    let tmp_dir = TempDir::new().unwrap();
    fs::write(tmp_dir.path().join("header.svg"), "header").unwrap();
    fs::write(tmp_dir.path().join("favicon.ico"), "favicon").unwrap();
    let output_dir = tmp_dir.path().join("out");
    setup_output_dir(&output_dir, &[]).unwrap();
    let favicon = tmp_dir.path().join("favicon.ico").to_string_lossy().into_owned();
    let footer_logo = format!("{}/images/footer.PNG", server.url());
    let header_logo = tmp_dir.path().join("header.svg").to_string_lossy().into_owned();
    let mut settings = settings_with_images(Some(&favicon), Some(&footer_logo), Some(&header_logo));

    // Run the settings images preparation
    prepare_settings_images(&mut settings, &reqwest::Client::new(), &output_dir)
        .await
        .unwrap();

    // Check each setting points to the image written at its location digest path
    for (setting, location, content) in [
        (settings.images.unwrap().favicon, &favicon, "favicon"),
        (settings.footer.unwrap().logo, &footer_logo, "footer"),
        (settings.header.unwrap().logo, &header_logo, "header"),
    ] {
        let path = image_output_path(location);
        assert_eq!(setting.as_ref(), Some(&path));
        assert_eq!(fs::read_to_string(output_dir.join(&path)).unwrap(), content);
    }
    mock.assert_async().await;
}

#[tokio::test]
async fn test_prepare_settings_images_same_basename_different_files() {
    // Setup two local logos sharing the same file name and the output directory
    let tmp_dir = TempDir::new().unwrap();
    for dir in ["a", "b"] {
        fs::create_dir(tmp_dir.path().join(dir)).unwrap();
        fs::write(
            tmp_dir.path().join(dir).join("logo.svg"),
            format!("<svg>{dir}</svg>"),
        )
        .unwrap();
    }
    let output_dir = tmp_dir.path().join("out");
    setup_output_dir(&output_dir, &[]).unwrap();
    let footer_logo = tmp_dir.path().join("b/logo.svg").to_string_lossy().into_owned();
    let header_logo = tmp_dir.path().join("a/logo.svg").to_string_lossy().into_owned();
    let mut settings = settings_with_images(None, Some(&footer_logo), Some(&header_logo));

    // Run the settings images preparation
    prepare_settings_images(&mut settings, &reqwest::Client::new(), &output_dir)
        .await
        .unwrap();

    // Check both logos keep their own content
    let footer_path = settings.footer.unwrap().logo.unwrap();
    let header_path = settings.header.unwrap().logo.unwrap();
    assert_eq!(
        fs::read_to_string(output_dir.join(footer_path)).unwrap(),
        "<svg>b</svg>"
    );
    assert_eq!(
        fs::read_to_string(output_dir.join(header_path)).unwrap(),
        "<svg>a</svg>"
    );
}

#[tokio::test]
async fn test_prepare_settings_images_trailing_slash_url_returns_clear_error() {
    // Setup server expectations: no request must be made
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("GET", mockito::Matcher::Any).expect(0).create_async().await;

    // Setup a favicon url ending in a slash and the output directory
    let tmp_dir = TempDir::new().unwrap();
    setup_output_dir(tmp_dir.path(), &[]).unwrap();
    let favicon = format!("{}/images/", server.url());
    let mut settings = settings_with_images(Some(&favicon), None, None);

    // Run the settings images preparation
    let err = prepare_settings_images(&mut settings, &reqwest::Client::new(), tmp_dir.path())
        .await
        .unwrap_err();

    // Check the error explains the location issue
    assert_eq!(
        format!("{err:#}"),
        format!("image location must end in a file name with an extension: {favicon}")
    );
    mock.assert_async().await;
}

#[test]
fn test_prepare_view_full_dataset_keeps_only_related_entries() {
    // Setup a full dataset with three items and some unrelated entries
    let full = Full {
        crunchbase_data: crunchbase_data(&["cb-a", "cb-b", "cb-c", "cb-unused"]),
        github_data: github_data(&["repo-a", "repo-b1", "repo-b2", "repo-c", "repo-unused"]),
        items: vec![
            full_item("a", Some("cb-a"), &["repo-a"]),
            full_item("b", Some("cb-b"), &["repo-b1", "repo-b2"]),
            full_item("c", Some("cb-c"), &["repo-c"]),
            full_item("d", None, &[]),
        ],
    };
    let view = embed_view(&["a", "b", "d"]);

    // Run the view full dataset preparation
    let view_full = prepare_view_full_dataset(&full, &view);

    // Check only the view items and their Crunchbase and GitHub data are kept
    let items_ids: Vec<&str> = view_full.items.iter().map(|i| i.id.as_str()).collect();
    assert_eq!(items_ids, ["a", "b", "d"]);
    let crunchbase_urls: Vec<&str> = view_full.crunchbase_data.keys().map(String::as_str).collect();
    assert_eq!(crunchbase_urls, ["cb-a", "cb-b"]);
    let repositories_urls: Vec<&str> = view_full.github_data.keys().map(String::as_str).collect();
    assert_eq!(repositories_urls, ["repo-a", "repo-b1", "repo-b2"]);
}

#[test]
fn test_prepare_view_full_dataset_shared_crunchbase_url_kept_once() {
    // Setup a full dataset with two items sharing their Crunchbase url
    let full = Full {
        crunchbase_data: crunchbase_data(&["cb-shared", "cb-other"]),
        github_data: GithubData::new(),
        items: vec![
            full_item("a", Some("cb-shared"), &[]),
            full_item("b", Some("cb-shared"), &[]),
            full_item("c", Some("cb-other"), &[]),
        ],
    };
    let view = embed_view(&["a", "b"]);

    // Run the view full dataset preparation
    let view_full = prepare_view_full_dataset(&full, &view);

    // Check the shared Crunchbase entry is kept once, alongside both items
    let items_ids: Vec<&str> = view_full.items.iter().map(|i| i.id.as_str()).collect();
    assert_eq!(items_ids, ["a", "b"]);
    let crunchbase_urls: Vec<&str> = view_full.crunchbase_data.keys().map(String::as_str).collect();
    assert_eq!(crunchbase_urls, ["cb-shared"]);
    assert!(view_full.github_data.is_empty());
}

#[test]
fn test_render_embed_item_html_sets_window_colors() {
    // Setup the output directory
    let tmp_dir = TempDir::new().unwrap();
    fs::create_dir(tmp_dir.path().join(EMBED_PATH)).unwrap();

    // Run the embed item rendering
    let colors = custom_colors();
    render_embed_item_html(&colors, tmp_dir.path()).unwrap();

    // Check the colors are set in the window object
    let html = fs::read_to_string(tmp_dir.path().join(EMBED_PATH).join("embed-item.html")).unwrap();
    let window_colors = attribute_value(&html, "<script>window.colors = ");
    let window_colors = window_colors.split(";</script>").next().unwrap();
    let window_colors: Value = serde_json::from_str(window_colors).unwrap();
    assert_eq!(window_colors, serde_json::to_value(&colors).unwrap());
}

#[test]
fn test_render_index_html_escapes_description_in_meta_tags() {
    // Setup datasets with a description containing HTML special characters
    let tmp_dir = TempDir::new().unwrap();
    let datasets = datasets(&settings(Some(TRICKY_DESCRIPTION)));

    // Run the index rendering
    render_index_html(None, &datasets, None, tmp_dir.path()).unwrap();

    // Check the description is escaped in every meta tag
    let html = fs::read_to_string(tmp_dir.path().join("index.html")).unwrap();
    for attr in [
        r#"name="description""#,
        r#"property="og:description""#,
        r#"name="twitter:description""#,
    ] {
        let value = attribute_value(&html, &format!(r#"<meta {attr} content=""#));
        assert_eq!(
            value, "The &#34;cloud native&#34; &#60;landscape&#62; &#38; more\non two lines",
            "meta: {attr}"
        );
        assert!(!value.contains('"') && !value.contains('<'), "meta: {attr}");
    }
}

#[test]
fn test_render_index_html_json_ld_is_valid_json() {
    // Setup datasets with a description containing JSON and HTML special characters
    let tmp_dir = TempDir::new().unwrap();
    let datasets = datasets(&settings(Some(TRICKY_DESCRIPTION)));

    // Run the index rendering
    render_index_html(None, &datasets, None, tmp_dir.path()).unwrap();

    // Check the JSON-LD block parses and the description round-trips
    let html = fs::read_to_string(tmp_dir.path().join("index.html")).unwrap();
    let json_ld = attribute_value(&html, r#"<script type="application/ld+json">"#);
    let json_ld = json_ld.split("</script>").next().unwrap();
    let json_ld: Value = serde_json::from_str(json_ld).unwrap();
    assert_eq!(json_ld["@graph"][0]["@type"], "WebSite");
    assert_eq!(json_ld["@graph"][0]["description"], TRICKY_DESCRIPTION);
    assert_eq!(json_ld["@graph"][0]["name"], "Foundation Landscape");
    assert_eq!(json_ld["@graph"][0]["url"], "https://landscape.example");

    // Check the breadcrumb list does not include the guide, as there is none
    let breadcrumbs: Vec<&str> = json_ld["@graph"][1]["itemListElement"]
        .as_array()
        .unwrap()
        .iter()
        .map(|breadcrumb| breadcrumb["name"].as_str().unwrap())
        .collect();
    assert_eq!(breadcrumbs, ["Explore", "Stats"]);
}

#[test]
fn test_render_kiosk_html_escapes_foundation_in_title() {
    // Setup the output directory
    let tmp_dir = TempDir::new().unwrap();

    // Run the kiosk rendering with a foundation containing HTML special characters
    render_kiosk_html(
        r#"<b>"F"</b> & Co"#,
        "https://landscape.example",
        &Colors::default(),
        None,
        tmp_dir.path(),
    )
    .unwrap();

    // Check the foundation is escaped in the title
    let html = fs::read_to_string(tmp_dir.path().join("kiosk.html")).unwrap();
    assert!(html.contains("<title>&#60;b&#62;&#34;F&#34;&#60;/b&#62; &#38; Co Landscape</title>"));
}

#[test]
fn test_render_kiosk_html_inlines_script_and_config() {
    // Setup the output directory
    let tmp_dir = TempDir::new().unwrap();

    // Run the kiosk rendering with values that need JSON quoting
    render_kiosk_html(
        r#"Foundation "F""#,
        "https://landscape.example/?a=1&b=2",
        &Colors::default(),
        None,
        tmp_dir.path(),
    )
    .unwrap();

    // Check the kiosk script is inlined and started with the JSON-quoted config
    let html = fs::read_to_string(tmp_dir.path().join("kiosk.html")).unwrap();
    assert!(html.contains("export const startKiosk = (config) =>"));
    assert!(html.contains(
        r#"startKiosk({ url: "https://landscape.example/?a=1\u0026b=2", foundation: "Foundation \"F\"" });"#
    ));
}

#[test]
fn test_render_kiosk_html_links_favicon() {
    // Setup the output directory
    let tmp_dir = TempDir::new().unwrap();

    // Run the kiosk rendering with a favicon
    render_kiosk_html(
        "Foundation",
        "https://landscape.example",
        &Colors::default(),
        Some("images/favicon.png"),
        tmp_dir.path(),
    )
    .unwrap();

    // Check the favicon is linked
    let html = fs::read_to_string(tmp_dir.path().join("kiosk.html")).unwrap();
    assert!(html.contains(r#"<link rel="icon" href="images/favicon.png" />"#));
}

#[test]
fn test_render_kiosk_html_omits_favicon_link_without_favicon() {
    // Setup the output directory
    let tmp_dir = TempDir::new().unwrap();

    // Run the kiosk rendering without a favicon
    render_kiosk_html(
        "Foundation",
        "https://landscape.example",
        &Colors::default(),
        None,
        tmp_dir.path(),
    )
    .unwrap();

    // Check no favicon is linked
    let html = fs::read_to_string(tmp_dir.path().join("kiosk.html")).unwrap();
    assert!(!html.contains(r#"rel="icon""#));
}

#[test]
fn test_render_kiosk_html_sets_color_variables() {
    // Setup the output directory
    let tmp_dir = TempDir::new().unwrap();

    // Run the kiosk rendering
    let colors = custom_colors();
    render_kiosk_html(
        "Foundation",
        "https://landscape.example",
        &colors,
        None,
        tmp_dir.path(),
    )
    .unwrap();

    // Check every color variable is set once, from the colors provided
    let html = fs::read_to_string(tmp_dir.path().join("kiosk.html")).unwrap();
    for (name, value) in [
        ("color1", &colors.color1),
        ("color2", &colors.color2),
        ("color3", &colors.color3),
        ("color4", &colors.color4),
        ("color5", &colors.color5),
        ("color6", &colors.color6),
        ("color7", &colors.color7),
    ] {
        assert_eq!(
            html.matches(&format!("--{name}: ")).count(),
            1,
            "variable: {name}"
        );
        assert!(html.contains(&format!("--{name}: {value};")), "variable: {name}");
    }
}

#[test]
fn test_setup_output_dir_keeps_unmanaged_root_files() {
    // Setup an output directory with some files not generated by the build
    let tmp_dir = TempDir::new().unwrap();
    fs::write(tmp_dir.path().join("CNAME"), "landscape.example").unwrap();
    fs::create_dir(tmp_dir.path().join("custom")).unwrap();
    fs::write(tmp_dir.path().join("custom/file.txt"), "custom").unwrap();

    // Run the output directory setup
    setup_output_dir(tmp_dir.path(), &[]).unwrap();

    // Check the unmanaged files are kept
    assert_eq!(
        fs::read_to_string(tmp_dir.path().join("CNAME")).unwrap(),
        "landscape.example"
    );
    assert_eq!(
        fs::read_to_string(tmp_dir.path().join("custom/file.txt")).unwrap(),
        "custom"
    );
}

#[test]
fn test_setup_output_dir_rejects_input_inside_managed_dir() {
    // Setup an output directory with a logos path inside a managed subdirectory
    let tmp_dir = TempDir::new().unwrap();
    let logos_path = tmp_dir.path().join("logos");
    fs::create_dir(&logos_path).unwrap();
    fs::write(logos_path.join("logo.svg"), SAMPLE_SVG).unwrap();

    // Run the output directory setup
    let err = setup_output_dir(tmp_dir.path(), &[logos_path.as_path()]).unwrap_err();

    // Check the input is rejected and nothing is removed
    assert_eq!(
        format!("{err:#}"),
        format!(
            "input {} is inside the output subdirectory {}, which is removed on every build",
            logos_path.display(),
            fs::canonicalize(&logos_path).unwrap().display()
        )
    );
    assert!(logos_path.join("logo.svg").is_file());
}

#[test]
fn test_setup_output_dir_rejects_missing_input_inside_managed_dir() {
    // Setup an output directory, and a cache directory that does not exist
    // yet inside one of its managed subdirectories
    let tmp_dir = TempDir::new().unwrap();
    let cache_dir = tmp_dir.path().join(DATASETS_PATH).join("cache");

    // Run the output directory setup
    let err = setup_output_dir(tmp_dir.path(), &[cache_dir.as_path()]).unwrap_err();

    // Check the input is rejected
    assert_eq!(
        format!("{err:#}"),
        format!(
            "input {} is inside the output subdirectory {}, which is removed on every build",
            cache_dir.display(),
            fs::canonicalize(tmp_dir.path()).unwrap().join(DATASETS_PATH).display()
        )
    );
}

#[test]
fn test_setup_output_dir_removes_stale_managed_files() {
    // Setup an output directory with the files generated by a previous build
    let tmp_dir = TempDir::new().unwrap();
    for path in MANAGED_PATHS {
        fs::create_dir(tmp_dir.path().join(path)).unwrap();
        fs::write(tmp_dir.path().join(path).join("stale"), "stale").unwrap();
    }
    for file in MANAGED_FILES {
        fs::write(tmp_dir.path().join(file), "stale").unwrap();
    }

    // Run the output directory setup
    setup_output_dir(tmp_dir.path(), &[]).unwrap();

    // Check the managed subdirectories are recreated empty and the root files removed
    for path in MANAGED_PATHS {
        let entries = fs::read_dir(tmp_dir.path().join(path)).unwrap().count();
        assert_eq!(entries, 0, "path: {path}");
    }
    for file in MANAGED_FILES {
        assert!(!tmp_dir.path().join(file).exists(), "file: {file}");
    }
}

#[tokio::test]
async fn test_sources_load_rejects_quiz_option_missing_from_data() {
    // Setup the sources files, with a quiz option missing from the landscape
    // data
    let tmp_dir = TempDir::new().unwrap();
    let data_file = tmp_dir.path().join("data.yml");
    fs::write(&data_file, DATA_YAML).unwrap();
    let games_file = tmp_dir.path().join("games.yml");
    fs::write(&games_file, GAMES_UNKNOWN_OPTION_YAML).unwrap();
    let settings_file = tmp_dir.path().join("settings.yml");
    fs::write(
        &settings_file,
        "foundation: Foundation\nurl: https://landscape.example\n",
    )
    .unwrap();

    // Setup the build arguments
    let args = BuildArgs {
        games_source: GamesSource {
            games_file: Some(games_file),
            games_url: None,
        },
        ..build_args(
            DataSource {
                data_file: Some(data_file),
                data_url: None,
            },
            SettingsSource {
                settings_file: Some(settings_file),
                settings_url: None,
            },
            tmp_dir.path().join("build"),
        )
    };

    // Run the sources loading
    let err = Sources::load(&args).await.unwrap_err();

    // Check the option is reported
    assert_eq!(
        format!("{err:#}"),
        "question [0] is not valid: option [1] item [Item 3] not found in the landscape data"
    );
}

#[test]
fn test_get_gtm_container_id_returns_none_without_gtm() {
    // Check no container id is returned without analytics or GTM settings
    for analytics in [None, Some(&Analytics { gtm: None })] {
        let container_id =
            filters::get_gtm_container_id::default().execute(&analytics, askama::NO_VALUES).unwrap();
        assert_eq!(container_id, None);
    }

    // Check no container id is returned when GTM has no container id
    let analytics = Analytics {
        gtm: Some(GoogleTagManager { container_id: None }),
    };
    let container_id = filters::get_gtm_container_id::default()
        .execute(&Some(&analytics), askama::NO_VALUES)
        .unwrap();
    assert_eq!(container_id, None);
}

// Helpers.

/// Runs the future provided, returning its output along with the logs written
/// while it ran (used by the tests of other modules too).
pub(super) async fn capture_logs<F: Future>(future: F) -> (F::Output, String) {
    // Setup the subscriber, once for all the tests: one set only for the
    // thread of a test misses the events other tests have already found
    // disabled from their threads, as that is cached for all the threads
    static SUBSCRIBER: Once = Once::new();
    SUBSCRIBER.call_once(|| {
        let subscriber = tracing_subscriber::fmt().with_ansi(false).with_writer(|| CapturedLogs).finish();
        tracing::subscriber::set_global_default(subscriber).unwrap();
        tracing::callsite::rebuild_interest_cache();
    });

    // Run the future keeping the logs written from this thread, which is the
    // one the future of a test runs in
    CAPTURED_LOGS.set(Some(Vec::new()));
    let output = future.await;
    let logs = CAPTURED_LOGS.take().unwrap_or_default();

    (output, String::from_utf8(logs).unwrap())
}

/// Returns the value that follows the prefix provided in the html document,
/// up to the next double quote (or the end of the document).
fn attribute_value<'a>(html: &'a str, prefix: &str) -> &'a str {
    let start = html.find(prefix).unwrap_or_else(|| panic!("prefix not found: {prefix}")) + prefix.len();
    let value = &html[start..];
    if prefix.ends_with('"') {
        value.split('"').next().unwrap()
    } else {
        value
    }
}

/// Returns build arguments using the data and settings sources and the output
/// directory provided, and no other sources.
fn build_args(data_source: DataSource, settings_source: SettingsSource, output_dir: PathBuf) -> BuildArgs {
    BuildArgs {
        cache_dir: None,
        data_source,
        games_source: GamesSource::default(),
        guide_source: GuideSource::default(),
        logos_source: LogosSource::default(),
        output_dir,
        settings_source,
    }
}

/// Returns Crunchbase data with an organization for each url provided.
fn crunchbase_data(urls: &[&str]) -> CrunchbaseData {
    urls.iter().map(|url| ((*url).to_string(), Organization::default())).collect()
}

/// Returns a set of colors different from the default palette.
fn custom_colors() -> Colors {
    Colors {
        color1: "rgba(1, 1, 1, 1)".to_string(),
        color2: "rgba(2, 2, 2, 1)".to_string(),
        color3: "rgba(3, 3, 3, 1)".to_string(),
        color4: "rgba(4, 4, 4, 0.5)".to_string(),
        color5: "rgba(5, 5, 5, 0.5)".to_string(),
        color6: "rgba(6, 6, 6, 0.5)".to_string(),
        color7: "rgb(7, 7, 7)".to_string(),
    }
}

/// Returns the datasets generated from an empty landscape and the settings
/// provided.
fn datasets(settings: &LandscapeSettings) -> Datasets {
    Datasets::new(&NewDatasetsInput {
        crunchbase_data: &CrunchbaseData::new(),
        github_data: &GithubData::new(),
        landscape_data: &LandscapeData::default(),
        now: Utc::now(),
        settings,
        games: None,
        guide: None,
        qr_code: Some("images/qr_code.svg"),
    })
}

/// Returns an embed view listing the items with the ids provided.
fn embed_view(items_ids: &[&str]) -> EmbedView {
    EmbedView {
        classification: Classification::Tag(vec![]),
        foundation: "Foundation".to_string(),
        items: items_ids
            .iter()
            .map(|id| embed::Item {
                id: (*id).to_string(),
                ..Default::default()
            })
            .collect(),
    }
}

/// Returns a full dataset item with the id, Crunchbase url and repositories
/// urls provided.
fn full_item(id: &str, crunchbase_url: Option<&str>, repositories_urls: &[&str]) -> Item {
    Item {
        id: id.to_string(),
        name: id.to_string(),
        crunchbase_url: crunchbase_url.map(ToString::to_string),
        repositories: (!repositories_urls.is_empty()).then(|| {
            repositories_urls
                .iter()
                .map(|url| Repository {
                    url: (*url).to_string(),
                    ..Default::default()
                })
                .collect()
        }),
        ..Default::default()
    }
}

/// Returns GitHub data with an entry for each repository url provided.
fn github_data(urls: &[&str]) -> GithubData {
    urls.iter().map(|url| ((*url).to_string(), RepositoryGithubData::default())).collect()
}

/// Returns landscape data with one item per `(id, logo)` pair provided.
fn landscape_data(items: &[(&str, &str)]) -> LandscapeData {
    LandscapeData {
        categories: vec![],
        items: items
            .iter()
            .map(|(id, logo)| Item {
                id: (*id).to_string(),
                logo: (*logo).to_string(),
                name: (*id).to_string(),
                ..Default::default()
            })
            .collect(),
    }
}

/// Returns valid landscape settings with the description provided.
fn settings(description: Option<&str>) -> LandscapeSettings {
    LandscapeSettings {
        foundation: "Foundation".to_string(),
        url: "https://landscape.example".to_string(),
        description: description.map(ToString::to_string),
        ..Default::default()
    }
}

/// Returns valid landscape settings with the favicon, footer logo and header
/// logo locations provided.
fn settings_with_images(
    favicon: Option<&str>,
    footer_logo: Option<&str>,
    header_logo: Option<&str>,
) -> LandscapeSettings {
    LandscapeSettings {
        footer: Some(Footer {
            logo: footer_logo.map(ToString::to_string),
            ..Default::default()
        }),
        header: Some(Header {
            logo: header_logo.map(ToString::to_string),
            ..Default::default()
        }),
        images: Some(Images {
            favicon: favicon.map(ToString::to_string),
            ..Default::default()
        }),
        ..settings(None)
    }
}

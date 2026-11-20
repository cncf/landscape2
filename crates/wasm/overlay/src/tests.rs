#[cfg(feature = "ts")]
use std::{collections::BTreeSet, env, fs, path::Path};

use chrono::TimeZone;
use landscape2_core::{
    data::Item,
    settings::{Footer, Header, Images},
};
use mockito::{Mock, Server, ServerGuard};
use pretty_assertions::assert_eq;
#[cfg(feature = "ts")]
use ts_rs::{Config, TS};

use super::*;

/// Directory where the generated TypeScript types are committed.
#[cfg(feature = "ts")]
const GENERATED_TYPES_DIR: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../../ui/common/src/types/generated"
);

/// Command that refreshes the committed overlay TypeScript types.
#[cfg(feature = "ts")]
const UPDATE_COMMAND: &str = "UPDATE_TS_TYPES=1 cargo test -p landscape2-overlay --features ts";

/// Environment variable that, set to `1`, makes the check refresh the
/// committed overlay TypeScript types instead of failing when they are out of
/// date.
#[cfg(feature = "ts")]
const UPDATE_ENV_VAR: &str = "UPDATE_TS_TYPES";

#[tokio::test]
async fn test_overlay_data_serializes_expected_keys() {
    // Setup the deployed landscape without guide and games
    let mut server = Server::new_async().await;
    let mut mocks = vec![
        mock_file(&mut server, "/sources/data.yml", "data.yml").create_async().await,
        mock_file(&mut server, "/sources/settings.yml", "settings.yml").create_async().await,
        mock_status(&mut server, "/sources/guide.yml", 404).create_async().await,
        mock_status(&mut server, "/sources/games.yml", 404).create_async().await,
    ];
    mocks.push(mock_file(&mut server, "/data/full.json", "full.json").create_async().await);

    // Run the overlay data preparation and serialization
    let data = prepare_overlay_data(input(&server), now()).await.unwrap();
    let value = serde_json::to_value(&data).unwrap();

    // Check the datasets are serialized and the absent values are omitted
    assert_mocks(&mocks).await;
    assert!(value["datasets"].get("base").is_some());
    assert!(value["datasets"].get("full").is_some());
    assert!(value["datasets"].get("stats").is_some());
    assert_eq!(value.get("games"), None);
    assert_eq!(value.get("guide"), None);
    assert_eq!(value.get("warnings"), None);
    assert_eq!(value["datasets"]["base"].get("qr_code"), None);
}

#[cfg(feature = "ts")]
#[test]
fn test_overlay_ts_types_are_up_to_date() {
    // Setup the directories with the committed and rendered types
    let generated_dir = Path::new(GENERATED_TYPES_DIR);
    let committed_dir = generated_dir.join("overlay");
    let rendered_root = tempfile::tempdir().unwrap();
    let rendered_dir = rendered_root.path().join("overlay");

    // Export only the overlay types into the rendered directory (the core
    // types they depend on are checked by the core staleness test)
    let config = Config::new().with_large_int("number").with_out_dir(rendered_root.path());
    OverlayData::export(&config).unwrap();
    OverlayDatasets::export(&config).unwrap();

    // Check the imports of the core types point at the core directory
    let datasets_type = fs::read_to_string(rendered_dir.join("OverlayDatasets.ts")).unwrap();
    assert!(datasets_type.contains(r#"import type { BaseData } from "../core/BaseData";"#));

    // Refresh the committed types when requested
    let committed_files = list_files(&committed_dir);
    let rendered_files = list_files(&rendered_dir);
    if env::var(UPDATE_ENV_VAR).is_ok_and(|value| value == "1") {
        fs::create_dir_all(&committed_dir).unwrap();
        for file in committed_files.difference(&rendered_files) {
            fs::remove_file(committed_dir.join(file)).unwrap();
        }
        for file in &rendered_files {
            fs::copy(rendered_dir.join(file), committed_dir.join(file)).unwrap();
        }
        return;
    }

    // Check the committed types match the rendered ones
    let differing_files: Vec<&str> = committed_files
        .union(&rendered_files)
        .filter(|file| fs::read(committed_dir.join(file)).ok() != fs::read(rendered_dir.join(file)).ok())
        .map(String::as_str)
        .collect();
    assert!(
        differing_files.is_empty(),
        "generated files in {} are out of date: {}\nrun `{UPDATE_COMMAND}`",
        committed_dir.display(),
        differing_files.join(", "),
    );

    // Check the barrel exports every overlay type file
    let barrel = fs::read_to_string(generated_dir.join("index.ts")).unwrap();
    let missing_lines: Vec<String> = rendered_files
        .iter()
        .map(|file| format!("export type * from './overlay/{}';", file.trim_end_matches(".ts")))
        .filter(|line| !barrel.lines().any(|barrel_line| barrel_line == line))
        .collect();
    assert!(
        missing_lines.is_empty(),
        "{}/index.ts lacks these lines: {}",
        generated_dir.display(),
        missing_lines.join(" "),
    );
}

#[test]
fn test_source_urls_new_derives_defaults_and_trims_trailing_slash() {
    // Setup an input with only the landscape url, ending with a slash
    let input = OverlayInput {
        landscape_url: "https://landscape.example.org/".to_string(),
        ..Default::default()
    };

    // Run the source urls derivation
    let urls = SourceUrls::new(&input);

    // Check every url defaults to the deployed landscape files
    assert_eq!(
        urls,
        SourceUrls {
            data: "https://landscape.example.org/sources/data.yml".to_string(),
            default_games: "https://landscape.example.org/sources/games.yml".to_string(),
            default_guide: "https://landscape.example.org/sources/guide.yml".to_string(),
            deployed_full: "https://landscape.example.org/data/full.json".to_string(),
            settings: "https://landscape.example.org/sources/settings.yml".to_string(),
            games: None,
            guide: None,
        }
    );
}

#[test]
fn test_source_urls_new_prefers_explicit_urls() {
    // Setup an input with every url provided
    let input = OverlayInput {
        landscape_url: "https://landscape.example.org".to_string(),
        data_url: Some("https://overlay.example.org/data.yml".to_string()),
        games_url: Some("https://overlay.example.org/games.yml".to_string()),
        guide_url: Some("https://overlay.example.org/guide.yml".to_string()),
        logos_url: Some("https://overlay.example.org/logos".to_string()),
        settings_url: Some("https://overlay.example.org/settings.yml".to_string()),
    };

    // Run the source urls derivation
    let urls = SourceUrls::new(&input);

    // Check the explicit urls are used, the deployed ones kept as defaults
    assert_eq!(
        urls,
        SourceUrls {
            data: "https://overlay.example.org/data.yml".to_string(),
            default_games: "https://landscape.example.org/sources/games.yml".to_string(),
            default_guide: "https://landscape.example.org/sources/guide.yml".to_string(),
            deployed_full: "https://landscape.example.org/data/full.json".to_string(),
            settings: "https://overlay.example.org/settings.yml".to_string(),
            games: Some("https://overlay.example.org/games.yml".to_string()),
            guide: Some("https://overlay.example.org/guide.yml".to_string()),
        }
    );
}

#[test]
fn test_apply_deployed_items_copies_logo_and_clomonitor_summary_by_id() {
    // Setup an item and the deployed item with the same id
    let mut landscape_data = landscape_data(vec![item("category--subcategory--item-1", "Item 1")]);
    let deployed_items = vec![deployed_item(
        "category--subcategory--item-1",
        "Item 1",
        Some("<svg>item-1</svg>"),
    )];

    // Run the deployed items application
    let warnings = apply_deployed_items(&mut landscape_data, deployed_items, None);

    // Check the deployed logo and CLOMonitor summary were copied
    let item = &landscape_data.items[0];
    assert_eq!(item.logo, "logos/item-1-deployed.svg");
    assert_eq!(
        item.clomonitor_report_summary.as_deref(),
        Some("<svg>item-1</svg>")
    );
    assert_eq!(warnings, Vec::<String>::new());
}

#[test]
fn test_apply_deployed_items_joins_logos_url() {
    for logos_url in [
        "https://overlay.example.org/logos",
        "https://overlay.example.org/logos/",
    ] {
        // Setup an item and the deployed item with the same id
        let mut landscape_data = landscape_data(vec![item("category--subcategory--item-1", "Item 1")]);
        let deployed_items = vec![deployed_item(
            "category--subcategory--item-1",
            "Item 1",
            Some("<svg>item-1</svg>"),
        )];

        // Run the deployed items application with a logos url
        let warnings = apply_deployed_items(&mut landscape_data, deployed_items, Some(logos_url));

        // Check the logo was joined to the logos url and the CLOMonitor summary
        // still comes from the deployed item
        let item = &landscape_data.items[0];
        assert_eq!(
            item.logo, "https://overlay.example.org/logos/item-1.svg",
            "{logos_url}"
        );
        assert_eq!(
            item.clomonitor_report_summary.as_deref(),
            Some("<svg>item-1</svg>"),
            "{logos_url}"
        );
        assert_eq!(warnings, Vec::<String>::new(), "{logos_url}");
    }
}

#[test]
fn test_apply_deployed_items_matches_moved_item_by_unique_name() {
    // Setup an item moved to another category since the landscape was deployed
    let mut landscape_data = landscape_data(vec![item("other-category--subcategory--item-1", "Item 1")]);
    let deployed_items = vec![
        deployed_item(
            "category--subcategory--item-1",
            "Item 1",
            Some("<svg>item-1</svg>"),
        ),
        deployed_item("category--subcategory--item-2", "Item 2", None),
    ];

    // Run the deployed items application
    let warnings = apply_deployed_items(&mut landscape_data, deployed_items, None);

    // Check the item matched the deployed item with the same name
    let item = &landscape_data.items[0];
    assert_eq!(item.logo, "logos/item-1-deployed.svg");
    assert_eq!(
        item.clomonitor_report_summary.as_deref(),
        Some("<svg>item-1</svg>")
    );
    assert_eq!(warnings, Vec::<String>::new());
}

#[test]
fn test_apply_deployed_items_skips_ambiguous_name_match() {
    // Setup a moved item whose name is used by two deployed items
    let mut landscape_data = landscape_data(vec![item("other-category--subcategory--item-1", "Item 1")]);
    let deployed_items = vec![
        deployed_item(
            "category--subcategory--item-1",
            "Item 1",
            Some("<svg>item-1</svg>"),
        ),
        deployed_item("category--other-subcategory--item-1", "Item 1", None),
    ];

    // Run the deployed items application
    let warnings = apply_deployed_items(&mut landscape_data, deployed_items, None);

    // Check the item matched none of them
    let item = &landscape_data.items[0];
    assert_eq!(item.logo, "");
    assert_eq!(item.clomonitor_report_summary, None);
    assert_eq!(
        warnings,
        vec![
            "item other-category--subcategory--item-1 not found in the deployed landscape: logo and CLOMonitor \
             summary unavailable"
        ]
    );
}

#[test]
fn test_apply_deployed_items_warns_about_unmatched_item() {
    // Setup a new item, not in the deployed landscape, next to a deployed one
    let mut landscape_data = landscape_data(vec![
        item("category--subcategory--item-1", "Item 1"),
        item("category--subcategory--item-3", "Item 3"),
    ]);
    let deployed_items = vec![deployed_item(
        "category--subcategory--item-1",
        "Item 1",
        Some("<svg>item-1</svg>"),
    )];

    // Run the deployed items application
    let warnings = apply_deployed_items(&mut landscape_data, deployed_items, None);

    // Check the new item has no logo nor CLOMonitor summary, and is reported
    let item = &landscape_data.items[1];
    assert_eq!(item.logo, "");
    assert_eq!(item.clomonitor_report_summary, None);
    assert_eq!(
        warnings,
        vec![
            "item category--subcategory--item-3 not found in the deployed landscape: logo and CLOMonitor summary \
             unavailable"
        ]
    );
}

#[test]
fn test_is_html_page_detects_html_pages_only() {
    // Check HTML pages are detected, ignoring case and leading whitespace
    assert!(is_html_page("<!DOCTYPE html>\n<html lang=\"en\"></html>"));
    assert!(is_html_page("\u{feff}  \n<!doctype HTML><html></html>"));
    assert!(is_html_page("<HTML><body></body></HTML>"));

    // Check YAML sources and other content are not
    assert!(!is_html_page(include_str!("testdata/guide.yml")));
    assert!(!is_html_page(include_str!("testdata/games.yml")));
    assert!(!is_html_page("html: <html></html>\n"));
    assert!(!is_html_page("<ht"));
    assert!(!is_html_page(""));
}

#[test]
fn test_localize_settings_images_rewrites_local_paths() {
    // Setup settings with a local header logo, a url footer logo and no favicon
    let mut settings = LandscapeSettings {
        footer: Some(Footer {
            logo: Some("https://example.org/footer-logo.svg".to_string()),
            ..Default::default()
        }),
        header: Some(Header {
            logo: Some("../artwork/logo.svg".to_string()),
            ..Default::default()
        }),
        images: Some(Images::default()),
        ..Default::default()
    };

    // Run the settings images localization
    localize_settings_images(&mut settings);

    // Check only the local path was rewritten to the deployed image path
    let header_logo = settings.header.unwrap().logo.unwrap();
    assert_eq!(header_logo, image_output_path("../artwork/logo.svg"));
    assert!(header_logo.starts_with("images/") && header_logo.ends_with(".svg"));
    assert_eq!(
        settings.footer.unwrap().logo.as_deref(),
        Some("https://example.org/footer-logo.svg")
    );
    assert_eq!(settings.images.unwrap().favicon, None);
}

#[tokio::test]
async fn test_prepare_overlay_data_applies_shared_enrichment() {
    // Setup the deployed landscape
    let mut server = Server::new_async().await;
    let mut mocks = mock_sources(&mut server).await;
    mocks.push(mock_file(&mut server, "/data/full.json", "full.json").create_async().await);

    // Run the overlay data preparation
    let data = prepare_overlay_data(input(&server), now()).await.unwrap();

    // Check the item whose homepage is its repository uses the Crunchbase
    // homepage as website, as the shared enrichment does
    assert_mocks(&mocks).await;
    let item = &data.datasets.full.items[0];
    assert_eq!(item.homepage_url, "https://github.com/example/item-1");
    assert_eq!(item.website, "https://item-1.example");
}

#[tokio::test]
async fn test_prepare_overlay_data_builds_datasets_from_default_urls() {
    // Setup the deployed landscape, using a landscape url ending with a slash
    let mut server = Server::new_async().await;
    let mut mocks = mock_sources(&mut server).await;
    mocks.push(mock_file(&mut server, "/data/full.json", "full.json").create_async().await);
    let input = OverlayInput {
        landscape_url: format!("{}/", server.url()),
        ..Default::default()
    };

    // Run the overlay data preparation
    let data = prepare_overlay_data(input, now()).await.unwrap();

    // Check the base dataset, with the local header logo localized
    assert_mocks(&mocks).await;
    let base = &data.datasets.base;
    assert_eq!(base.foundation, "Foundation");
    assert_eq!(
        base.items.iter().map(|item| item.id.as_str()).collect::<Vec<_>>(),
        vec!["category--subcategory--item-1", "category--subcategory--item-2"]
    );
    assert_eq!(
        base.header.as_ref().and_then(|header| header.logo.as_deref()),
        Some(image_output_path("../artwork/logo.svg").as_str())
    );

    // Check the full dataset takes the logos and CLOMonitor summaries from the
    // deployed items
    let full_items = &data.datasets.full.items;
    assert_eq!(
        full_items.iter().map(|item| item.logo.as_str()).collect::<Vec<_>>(),
        vec!["logos/item-1-deployed.svg", "logos/item-2-deployed.svg"]
    );
    assert_eq!(
        full_items[0].clomonitor_report_summary.as_deref(),
        Some("<svg>item-1</svg>")
    );
    let deployed_full = fixture_deployed_full();
    assert_eq!(data.datasets.full.crunchbase_data, deployed_full.crunchbase_data);
    assert_eq!(data.datasets.full.github_data, deployed_full.github_data);

    // Check the guide, games and stats
    assert_eq!(data.guide, Some(fixture_guide()));
    assert_eq!(data.games, Some(fixture_games()));
    assert_eq!(data.datasets.stats.generated_at, now());
}

#[tokio::test]
async fn test_prepare_overlay_data_includes_explicit_games_questions() {
    // Setup the deployed landscape without games, and the overlay games
    let mut server = Server::new_async().await;
    let mocks = vec![
        mock_file(&mut server, "/sources/data.yml", "data.yml").create_async().await,
        mock_file(&mut server, "/sources/settings.yml", "settings.yml").create_async().await,
        mock_status(&mut server, "/sources/guide.yml", 404).create_async().await,
        mock_status(&mut server, "/sources/games.yml", 404).expect(0).create_async().await,
        mock_file(&mut server, "/overlay/games.yml", "games.yml").create_async().await,
        mock_file(&mut server, "/data/full.json", "full.json").create_async().await,
    ];
    let input = OverlayInput {
        games_url: Some(format!("{}/overlay/games.yml", server.url())),
        ..input(&server)
    };

    // Run the overlay data preparation
    let data = prepare_overlay_data(input, now()).await.unwrap();

    // Check the overlay games questions are returned and the quiz advertised
    assert_mocks(&mocks).await;
    assert_eq!(data.games, Some(fixture_games()));
    assert_eq!(data.datasets.base.games_available, Some(vec!["quiz".to_string()]));
}

#[tokio::test]
async fn test_prepare_overlay_data_rejects_default_guide_server_error() {
    // Setup the deployed landscape, failing to serve the guide
    let mut server = Server::new_async().await;
    let mocks = vec![
        mock_file(&mut server, "/sources/data.yml", "data.yml")
            .expect_at_most(1)
            .create_async()
            .await,
        mock_file(&mut server, "/sources/settings.yml", "settings.yml")
            .expect_at_most(1)
            .create_async()
            .await,
        mock_status(&mut server, "/sources/guide.yml", 500).create_async().await,
        mock_file(&mut server, "/sources/games.yml", "games.yml")
            .expect_at_most(1)
            .create_async()
            .await,
        mock_file(&mut server, "/data/full.json", "full.json")
            .expect_at_most(1)
            .create_async()
            .await,
    ];

    // Run the overlay data preparation
    let err = prepare_overlay_data(input(&server), now()).await.unwrap_err();

    // Check the server error is not treated as a missing guide
    assert_mocks(&mocks).await;
    let guide_url = format!("{}/sources/guide.yml", server.url());
    assert_eq!(
        format!("{err:#}"),
        format!(
            "error fetching guide: error fetching guide file {guide_url}: HTTP status server error (500 Internal \
             Server Error) for url ({guide_url})"
        )
    );
}

#[tokio::test]
async fn test_prepare_overlay_data_rejects_deployed_full_dataset_error() {
    // Setup the deployed landscape, failing to serve the full dataset
    let mut server = Server::new_async().await;
    let mut mocks = mock_sources_at_most_once(&mut server).await;
    mocks.push(mock_status(&mut server, "/data/full.json", 500).create_async().await);

    // Run the overlay data preparation
    let err = prepare_overlay_data(input(&server), now()).await.unwrap_err();

    // Check the error includes the failed request details
    assert_mocks(&mocks).await;
    assert_eq!(
        format!("{err:#}"),
        format!(
            "error getting deployed full dataset: HTTP status server error (500 Internal Server Error) for url \
             ({}/data/full.json)",
            server.url()
        )
    );
}

#[tokio::test]
async fn test_prepare_overlay_data_rejects_invalid_default_games() {
    // Setup the deployed landscape, serving games that fail the validation
    let mut server = Server::new_async().await;
    let mocks = vec![
        mock_file(&mut server, "/sources/data.yml", "data.yml")
            .expect_at_most(1)
            .create_async()
            .await,
        mock_file(&mut server, "/sources/settings.yml", "settings.yml")
            .expect_at_most(1)
            .create_async()
            .await,
        mock_file(&mut server, "/sources/guide.yml", "guide.yml")
            .expect_at_most(1)
            .create_async()
            .await,
        server
            .mock("GET", "/sources/games.yml")
            .with_body("quiz:\n  questions: []\n")
            .create_async()
            .await,
        mock_file(&mut server, "/data/full.json", "full.json")
            .expect_at_most(1)
            .create_async()
            .await,
    ];

    // Run the overlay data preparation
    let err = prepare_overlay_data(input(&server), now()).await.unwrap_err();

    // Check the invalid games are not treated as missing games
    assert_mocks(&mocks).await;
    assert_eq!(
        format!("{err:#}"),
        "error fetching games data: the landscape games file provided is not valid: quiz must have at least one \
         question"
    );
}

#[tokio::test]
async fn test_prepare_overlay_data_rejects_malformed_deployed_full_dataset() {
    // Setup the deployed landscape, serving a malformed full dataset
    let mut server = Server::new_async().await;
    let mut mocks = mock_sources_at_most_once(&mut server).await;
    mocks.push(
        server
            .mock("GET", "/data/full.json")
            .with_body(r#"{"items": "not a list"}"#)
            .create_async()
            .await,
    );

    // Run the overlay data preparation
    let err = prepare_overlay_data(input(&server), now()).await.unwrap_err();

    // Check the error reports the full dataset could not be parsed
    assert_mocks(&mocks).await;
    assert_eq!(
        format!("{err:#}"),
        "error parsing deployed full dataset: error decoding response body: invalid type: string \"not a list\", \
         expected a sequence at line 1 column 22"
    );
}

#[tokio::test]
async fn test_prepare_overlay_data_rejects_missing_explicit_games() {
    // Setup the deployed landscape, and an overlay games url not found
    let mut server = Server::new_async().await;
    let mocks = vec![
        mock_file(&mut server, "/sources/data.yml", "data.yml")
            .expect_at_most(1)
            .create_async()
            .await,
        mock_file(&mut server, "/sources/settings.yml", "settings.yml")
            .expect_at_most(1)
            .create_async()
            .await,
        mock_file(&mut server, "/sources/guide.yml", "guide.yml")
            .expect_at_most(1)
            .create_async()
            .await,
        mock_file(&mut server, "/sources/games.yml", "games.yml").expect(0).create_async().await,
        mock_status(&mut server, "/overlay/games.yml", 404).create_async().await,
        mock_file(&mut server, "/data/full.json", "full.json")
            .expect_at_most(1)
            .create_async()
            .await,
    ];
    let games_url = format!("{}/overlay/games.yml", server.url());
    let input = OverlayInput {
        games_url: Some(games_url.clone()),
        ..input(&server)
    };

    // Run the overlay data preparation
    let err = prepare_overlay_data(input, now()).await.unwrap_err();

    // Check the missing explicit games are reported
    assert_mocks(&mocks).await;
    assert_eq!(
        format!("{err:#}"),
        format!(
            "error fetching games data: error fetching games file {games_url}: HTTP status client error (404 Not \
             Found) for url ({games_url})"
        )
    );
}

#[tokio::test]
async fn test_prepare_overlay_data_rejects_missing_explicit_guide() {
    // Setup the deployed landscape, and an overlay guide url not found
    let mut server = Server::new_async().await;
    let mocks = vec![
        mock_file(&mut server, "/sources/data.yml", "data.yml")
            .expect_at_most(1)
            .create_async()
            .await,
        mock_file(&mut server, "/sources/settings.yml", "settings.yml")
            .expect_at_most(1)
            .create_async()
            .await,
        mock_file(&mut server, "/sources/guide.yml", "guide.yml").expect(0).create_async().await,
        mock_file(&mut server, "/sources/games.yml", "games.yml")
            .expect_at_most(1)
            .create_async()
            .await,
        mock_status(&mut server, "/overlay/guide.yml", 404).create_async().await,
        mock_file(&mut server, "/data/full.json", "full.json")
            .expect_at_most(1)
            .create_async()
            .await,
    ];
    let guide_url = format!("{}/overlay/guide.yml", server.url());
    let input = OverlayInput {
        guide_url: Some(guide_url.clone()),
        ..input(&server)
    };

    // Run the overlay data preparation
    let err = prepare_overlay_data(input, now()).await.unwrap_err();

    // Check the missing explicit guide is reported
    assert_mocks(&mocks).await;
    assert_eq!(
        format!("{err:#}"),
        format!(
            "error fetching guide: error fetching guide file {guide_url}: HTTP status client error (404 Not Found) \
             for url ({guide_url})"
        )
    );
}

#[tokio::test]
async fn test_prepare_overlay_data_reports_unknown_key_warnings() {
    // Setup the deployed landscape, with an unknown key in the settings
    let mut server = Server::new_async().await;
    let mocks = vec![
        mock_file(&mut server, "/sources/data.yml", "data.yml").create_async().await,
        mock_file(&mut server, "/sources/settings.yml", "settings-unknown-key.yml")
            .create_async()
            .await,
        mock_file(&mut server, "/sources/guide.yml", "guide.yml").create_async().await,
        mock_file(&mut server, "/sources/games.yml", "games.yml").create_async().await,
        mock_file(&mut server, "/data/full.json", "full.json").create_async().await,
    ];

    // Run the overlay data preparation
    let data = prepare_overlay_data(input(&server), now()).await.unwrap();

    // Check the unknown key is reported as a settings warning
    assert_mocks(&mocks).await;
    assert_eq!(
        data.warnings,
        vec!["settings: unknown key `featured_item` (found once, at featured_item)"]
    );
}

#[tokio::test]
async fn test_prepare_overlay_data_treats_missing_default_guide_and_games_as_absent() {
    // Setup the deployed landscape without guide and games
    let mut server = Server::new_async().await;
    let mocks = vec![
        mock_file(&mut server, "/sources/data.yml", "data.yml").create_async().await,
        mock_file(&mut server, "/sources/settings.yml", "settings.yml").create_async().await,
        mock_status(&mut server, "/sources/guide.yml", 404).create_async().await,
        mock_status(&mut server, "/sources/games.yml", 404).create_async().await,
        mock_file(&mut server, "/data/full.json", "full.json").create_async().await,
    ];

    // Run the overlay data preparation
    let data = prepare_overlay_data(input(&server), now()).await.unwrap();

    // Check the guide and games are absent, and so are their base summaries
    assert_mocks(&mocks).await;
    assert_eq!(data.guide, None);
    assert_eq!(data.games, None);
    assert!(data.datasets.base.guide_summary.is_empty());
    assert_eq!(data.datasets.base.games_available, None);
}

#[tokio::test]
async fn test_prepare_overlay_data_treats_default_guide_and_games_served_as_index_as_absent() {
    // Setup the deployed landscape without guide and games, hosted with a
    // single-page application fallback (missing paths serve the index)
    let mut server = Server::new_async().await;
    let index = "\u{feff}\n<!doctype html>\n<html lang=\"en\">\n<body></body>\n</html>\n";
    let mocks = vec![
        mock_file(&mut server, "/sources/data.yml", "data.yml").create_async().await,
        mock_file(&mut server, "/sources/settings.yml", "settings.yml").create_async().await,
        server.mock("GET", "/sources/guide.yml").with_body(index).create_async().await,
        server.mock("GET", "/sources/games.yml").with_body(index).create_async().await,
        mock_file(&mut server, "/data/full.json", "full.json").create_async().await,
    ];

    // Run the overlay data preparation
    let data = prepare_overlay_data(input(&server), now()).await.unwrap();

    // Check the guide and games are absent
    assert_mocks(&mocks).await;
    assert_eq!(data.guide, None);
    assert_eq!(data.games, None);
}

#[tokio::test]
async fn test_prepare_overlay_data_rejects_explicit_guide_served_as_index() {
    // Setup the deployed landscape, and an overlay guide url answered with an
    // HTML page
    let mut server = Server::new_async().await;
    let mut mocks = mock_sources_at_most_once(&mut server).await;
    mocks.push(
        mock_file(&mut server, "/data/full.json", "full.json")
            .expect_at_most(1)
            .create_async()
            .await,
    );
    mocks.push(server.mock("GET", "/overlay/guide.yml").with_body("<html></html>").create_async().await);
    let input = OverlayInput {
        guide_url: Some(format!("{}/overlay/guide.yml", server.url())),
        ..input(&server)
    };

    // Run the overlay data preparation
    let err = prepare_overlay_data(input, now()).await.unwrap_err();

    // Check the page is not treated as a missing guide
    assert_mocks(&mocks).await;
    assert!(
        format!("{err:#}")
            .starts_with("error fetching guide: the landscape guide file provided is not valid")
    );
}

// Helpers.

/// Checks every mock provided received the expected requests.
async fn assert_mocks(mocks: &[Mock]) {
    for mock in mocks {
        mock.assert_async().await;
    }
}

/// Returns a deployed item with the id, name and CLOMonitor summary provided,
/// and a logo derived from its name.
fn deployed_item(id: &str, name: &str, clomonitor_report_summary: Option<&str>) -> DeployedItem {
    DeployedItem {
        id: id.to_string(),
        logo: format!("logos/{}-deployed.svg", name.to_lowercase().replace(' ', "-")),
        name: name.to_string(),
        clomonitor_report_summary: clomonitor_report_summary.map(ToString::to_string),
    }
}

/// Returns the deployed full dataset fixture, parsed.
fn fixture_deployed_full() -> DeployedFull {
    serde_json::from_str(include_str!("testdata/full.json")).unwrap()
}

/// Returns the games fixture, parsed.
fn fixture_games() -> LandscapeGames {
    LandscapeGames::new_from_yaml(include_str!("testdata/games.yml")).unwrap().value
}

/// Returns the guide fixture, parsed.
fn fixture_guide() -> LandscapeGuide {
    LandscapeGuide::new_from_yaml(include_str!("testdata/guide.yml")).unwrap().value
}

/// Returns an overlay input using the server provided as the deployed
/// landscape, with no explicit urls.
fn input(server: &ServerGuard) -> OverlayInput {
    OverlayInput {
        landscape_url: server.url(),
        ..Default::default()
    }
}

/// Returns a landscape item with the id and name provided, and a logo file
/// name derived from its name.
fn item(id: &str, name: &str) -> Item {
    Item {
        id: id.to_string(),
        logo: format!("{}.svg", name.to_lowercase().replace(' ', "-")),
        name: name.to_string(),
        ..Default::default()
    }
}

/// Returns landscape data with the items provided.
fn landscape_data(items: Vec<Item>) -> LandscapeData {
    LandscapeData {
        items,
        ..Default::default()
    }
}

/// Lists the names of the files in the directory provided. A missing
/// directory has no files.
#[cfg(feature = "ts")]
fn list_files(dir: &Path) -> BTreeSet<String> {
    let Ok(entries) = fs::read_dir(dir) else {
        return BTreeSet::new();
    };
    entries.map(|entry| entry.unwrap().file_name().to_string_lossy().to_string()).collect()
}

/// Returns a mock (not yet created) answering GET requests to the path
/// provided with the content of the fixture file provided.
fn mock_file(server: &mut ServerGuard, path: &str, fixture: &str) -> Mock {
    server.mock("GET", path).with_body_from_file(format!("src/testdata/{fixture}"))
}

/// Creates the mocks of the deployed landscape source files (data, settings,
/// guide and games), served with the fixtures and expected to be fetched
/// once each.
async fn mock_sources(server: &mut ServerGuard) -> Vec<Mock> {
    let mut mocks = vec![];
    for file in ["data.yml", "settings.yml", "guide.yml", "games.yml"] {
        mocks.push(mock_file(server, &format!("/sources/{file}"), file).create_async().await);
    }
    mocks
}

/// Creates the mocks of the deployed landscape source files (data, settings,
/// guide and games), served with the fixtures and fetched at most once each,
/// as a failing load may stop the preparation before they are fetched.
async fn mock_sources_at_most_once(server: &mut ServerGuard) -> Vec<Mock> {
    let mut mocks = vec![];
    for file in ["data.yml", "settings.yml", "guide.yml", "games.yml"] {
        mocks.push(
            mock_file(server, &format!("/sources/{file}"), file)
                .expect_at_most(1)
                .create_async()
                .await,
        );
    }
    mocks
}

/// Returns a mock (not yet created) answering GET requests to the path
/// provided with the status provided and an empty body.
fn mock_status(server: &mut ServerGuard, path: &str, status: usize) -> Mock {
    server.mock("GET", path).with_status(status)
}

/// Returns the fixed reference time used to prepare the overlay data.
fn now() -> DateTime<Utc> {
    Utc.with_ymd_and_hms(2024, 6, 1, 0, 0, 0).unwrap()
}

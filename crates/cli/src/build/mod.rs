//! This module defines the functionality of the build CLI subcommand.

use self::{
    cache::Cache,
    crunchbase::collect_crunchbase_data,
    export::generate_items_csv,
    github::collect_github_data,
    logos::{prepare_logo, LogosSource},
    projects::{generate_projects_csv, ProjectsMd},
};
use crate::{
    build::{
        api::{Api, ApiSources},
        projects::collect_projects,
    },
    serve::{self, serve},
};
use anyhow::{bail, Context, Result};
use askama::Template;
use base64::{engine::general_purpose::STANDARD as b64, Engine as _};
use futures::stream::{self, StreamExt};
use headless_chrome::{
    browser,
    protocol::cdp::Page::{self, CaptureScreenshotFormatOption},
    types::PrintToPdfOptions,
    Browser, LaunchOptions,
};
use landscape2_core::{
    data::{self, CrunchbaseData, DataSource, GithubData, Item, LandscapeData},
    datasets::{embed::EmbedView, full::Full, Datasets, NewDatasetsInput},
    games::{GamesSource, LandscapeGames},
    guide::{GuideSource, LandscapeGuide},
    settings::{self, Analytics, Colors, LandscapeSettings, LogosViewbox, Osano, SettingsSource},
};
use qrcode::render::svg;
use reqwest::StatusCode;
use rust_embed::{EmbeddedFile, RustEmbed};
use std::{
    collections::{BTreeMap, HashMap},
    ffi::OsStr,
    fs::{self, File},
    io::Write,
    net::TcpListener,
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::Mutex;
use tracing::{debug, error, info, instrument, trace, warn};
use url::Url;

mod api;
mod cache;
mod clomonitor;
mod crunchbase;
mod export;
mod github;
mod logos;
mod projects;

/// Maximum number of CLOMonitor reports summaries to fetch concurrently.
const CLOMONITOR_MAX_CONCURRENCY: usize = 10;

/// Path where the API data files will be written to in the output directory.
const API_PATH: &str = "api";

/// Path where the datasets will be written to in the output directory.
const DATASETS_PATH: &str = "data";

/// Path where some documents will be written to in the output directory.
const DOCS_PATH: &str = "docs";

/// Path where the embeddable views assets will be copied to in the output dir.
const EMBED_PATH: &str = "embed";

/// Path where some images will be written to in the output directory.
const IMAGES_PATH: &str = "images";

/// Path where the item logos will be written to in the output directory.
const LOGOS_PATH: &str = "logos";

/// Path where the data sources files will be written to in the output dir.
const SOURCES_PATH: &str = "sources";

/// Maximum number of logos to prepare concurrently.
const PREPARE_LOGOS_MAX_CONCURRENCY: usize = 20;

/// Embed landscape embeddable views assets into binary.
/// (these assets will be built automatically from the build script)
#[derive(RustEmbed)]
#[folder = "../../ui/embed/dist"]
struct EmbedAssets;

/// Embed landscape embeddable views (item details) assets into binary.
/// (these assets will be built automatically from the build script)
#[derive(RustEmbed)]
#[folder = "../../ui/embed-item/dist"]
struct EmbedItemAssets;

/// Embed web application assets into binary.
/// (these assets will be built automatically from the build script)
#[derive(RustEmbed)]
#[folder = "../../ui/webapp/dist"]
struct WebappAssets;

/// Build arguments.
#[derive(clap::Args)]
pub struct BuildArgs {
    /// Cache directory.
    #[arg(long)]
    pub cache_dir: Option<PathBuf>,

    /// Data source.
    #[command(flatten)]
    pub data_source: DataSource,

    /// Games source.
    #[command(flatten)]
    pub games_source: GamesSource,

    /// Guide source.
    #[command(flatten)]
    pub guide_source: GuideSource,

    /// Logos source.
    #[command(flatten)]
    pub logos_source: LogosSource,

    /// Output directory to write files to.
    #[arg(long)]
    pub output_dir: PathBuf,

    /// Settings source.
    #[command(flatten)]
    pub settings_source: SettingsSource,
}

/// Build landscape website.
#[instrument(skip_all)]
pub async fn build(args: &BuildArgs) -> Result<()> {
    info!("building landscape website..");
    let start = Instant::now();

    // Check required web assets are present
    check_web_assets()?;

    // Setup output directory, creating it when needed
    setup_output_dir(&args.output_dir)?;

    // Setup cache
    let cache = Cache::new(&args.cache_dir)?;

    // Get landscape data from the source provided
    let mut landscape_data = LandscapeData::new(&args.data_source).await?;

    // Get landscape settings from the source provided
    let mut settings = LandscapeSettings::new(&args.settings_source).await?;

    // Prepare games data and copy it to the output directory
    let games = prepare_games_data(&args.games_source, &args.output_dir).await?;

    // Prepare guide and copy it to the output directory
    let guide = prepare_guide(&args.guide_source, &args.output_dir).await?;

    // Prepare items logos and copy them to the output directory
    prepare_items_logos(
        &args.logos_source,
        &settings.logos_viewbox,
        &mut landscape_data,
        &args.output_dir,
    )
    .await?;

    // Fetch some settings images and update their urls to the local copy
    prepare_settings_images(&mut settings, &args.output_dir).await?;

    // Collect data from external services
    let (crunchbase_data, github_data) = tokio::try_join!(
        collect_crunchbase_data(&cache, &landscape_data),
        collect_github_data(&cache, &landscape_data)
    )?;

    // Enrich landscape data with some extra information from the settings and
    // external services
    landscape_data.add_crunchbase_data(&crunchbase_data);
    landscape_data.add_featured_items_data(&settings);
    landscape_data.add_github_data(&github_data);
    landscape_data.add_member_subcategory(&settings.members_category);
    landscape_data.add_tags(&settings);
    landscape_data.set_enduser_flag(&settings);

    // Collect CLOMonitor reports summaries and copy them to the output directory
    collect_clomonitor_reports(&cache, &mut landscape_data, &settings, &args.output_dir).await?;

    // Generate API data files
    generate_api(
        &ApiSources {
            landscape_data: &landscape_data,
            settings: &settings,
        },
        &args.output_dir,
    )?;

    // Generate QR code
    let qr_code = generate_qr_code(&settings.url, &args.output_dir)?;

    // Generate datasets for web application
    let datasets = generate_datasets(
        &NewDatasetsInput {
            crunchbase_data: &crunchbase_data,
            games: &games,
            github_data: &github_data,
            guide: &guide,
            landscape_data: &landscape_data,
            qr_code: &qr_code,
            settings: &settings,
        },
        &args.output_dir,
    )?;

    // Render index and embed-item html files and write them to the output dir
    render_index_html(&settings.analytics, &datasets, &settings.osano, &args.output_dir)?;
    render_embed_item_html(&settings.colors, &args.output_dir)?;

    // Copy embed and web application assets files to the output directory
    copy_embed_assets(&args.output_dir)?;
    copy_webapp_assets(&args.output_dir)?;

    // Generate items.csv file
    generate_items_csv_file(&landscape_data, &args.output_dir)?;

    // Generate projects.* files
    generate_projects_files(&landscape_data, &args.output_dir)?;

    // Prepare landscape screenshot (in PNG and PDF formats)
    if let Some(width) = &settings.screenshot_width {
        prepare_screenshot(*width, &args.output_dir).await?;
    }

    // Copy data sources files to the output directory
    copy_data_sources_files(args, &args.output_dir).await?;

    let duration = start.elapsed().as_secs_f64();
    info!("landscape website built! (took: {:.3}s)", duration);
    display_success_msg(&args.output_dir.to_string_lossy());

    Ok(())
}

/// Check web assets are present, to make sure the web app has been built.
#[instrument(err)]
fn check_web_assets() -> Result<()> {
    debug!("checking web assets are present");

    if !WebappAssets::iter().any(|path| path.starts_with("assets/")) {
        bail!("web assets not found, please make sure they have been built");
    }

    Ok(())
}

/// Collect projects CLOMonitor reports summaries and copy them to the output
/// directory.
#[instrument(skip_all, err)]
async fn collect_clomonitor_reports(
    cache: &Cache,
    landscape_data: &mut LandscapeData,
    settings: &LandscapeSettings,
    output_dir: &Path,
) -> Result<()> {
    debug!("collecting clomonitor reports");

    // Fetch CLOMonitor reports summaries and copy them to the output directory
    let http_client = reqwest::Client::new();
    let foundation = &settings.foundation.to_lowercase();
    let reports_summaries: Mutex<HashMap<String, String>> = Mutex::new(HashMap::new());
    stream::iter(landscape_data.items.iter())
        .for_each_concurrent(CLOMONITOR_MAX_CONCURRENCY, |item| async {
            // Item must contain the project name as used in CLOMonitor
            let Some(project_name) = &item.clomonitor_name else {
                return;
            };

            // Fetch report summary
            let http_client = http_client.clone();
            let report_summary =
                match clomonitor::fetch_report_summary(cache, http_client, foundation, project_name).await {
                    Ok(Some(report_summary)) => report_summary,
                    Ok(None) => return,
                    Err(err) => {
                        error!(?err, ?foundation, ?project_name, "error fetching report summary");
                        return;
                    }
                };

            // Copy report summary to the output dir
            let file_name = format!("clomonitor_{foundation}_{project_name}.svg");
            let mut file = match File::create(output_dir.join(IMAGES_PATH).join(&file_name)) {
                Ok(file) => file,
                Err(err) => {
                    error!(?err, ?file_name, "error creating report summary file");
                    return;
                }
            };
            if let Err(err) = file.write_all(&report_summary) {
                error!(?err, ?file_name, "error writing report summary to file");
                return;
            };

            // Track report summary to include it later in the item
            let mut reports_summaries = reports_summaries.lock().await;
            reports_summaries.insert(
                item.id.clone(),
                Path::new(IMAGES_PATH).join(file_name).to_string_lossy().to_string(),
            );
        })
        .await;

    // Update clomonitor_report_summary field in landscape items with the path
    // of the SVG image
    let reports_summaries = reports_summaries.lock().await;
    for item in &mut landscape_data.items {
        if let Some(report_summary) = reports_summaries.get(&item.id) {
            item.clomonitor_report_summary = Some(report_summary.clone());
        }
    }

    debug!("done!");
    Ok(())
}

/// Copy data sources files to the output directory.
#[instrument(skip_all, err)]
async fn copy_data_sources_files(args: &BuildArgs, output_dir: &Path) -> Result<()> {
    // Helper function to copy the data source file provided
    async fn copy(src_file: &Option<PathBuf>, src_url: &Option<String>, dst_file: PathBuf) -> Result<()> {
        if let Some(src_file) = src_file {
            fs::copy(src_file, dst_file)?;
        } else if let Some(src_url) = src_url {
            let data = reqwest::get(src_url).await?.bytes().await?;
            fs::write(dst_file, data)?;
        }
        Ok(())
    }

    debug!("copying data sources files to output directory");

    // Landscape data
    let landscape_data_file = output_dir.join(SOURCES_PATH).join("data.yml");
    copy(
        &args.data_source.data_file,
        &args.data_source.data_url,
        landscape_data_file,
    )
    .await?;

    // Settings
    let settings_file = output_dir.join(SOURCES_PATH).join("settings.yml");
    copy(
        &args.settings_source.settings_file,
        &args.settings_source.settings_url,
        settings_file,
    )
    .await?;

    // Guide
    let guide_file = output_dir.join(SOURCES_PATH).join("guide.yml");
    copy(
        &args.guide_source.guide_file,
        &args.guide_source.guide_url,
        guide_file,
    )
    .await?;

    // Games data
    let games_file = output_dir.join(SOURCES_PATH).join("games.yml");
    copy(
        &args.games_source.games_file,
        &args.games_source.games_url,
        games_file,
    )
    .await?;

    Ok(())
}

/// Copy embed assets files to the output directory.
#[instrument(skip_all, err)]
fn copy_embed_assets(output_dir: &Path) -> Result<()> {
    debug!("copying embed assets to output directory");

    let copy_embed_asset = |path: &str, embedded_file: EmbeddedFile| -> Result<()> {
        let path = Path::new(EMBED_PATH).join(path);
        if let Some(parent_path) = path.parent() {
            fs::create_dir_all(output_dir.join(parent_path))?;
        }
        let mut file = File::create(output_dir.join(path))?;
        file.write_all(&embedded_file.data)?;
        Ok(())
    };

    for path in EmbedAssets::iter() {
        if let Some(embedded_file) = EmbedAssets::get(&path) {
            copy_embed_asset(&path, embedded_file)?;
        }
    }
    for path in EmbedItemAssets::iter() {
        if path == "embed-item.html" {
            // This file is a template that will be rendered later on
            continue;
        }
        if let Some(embedded_file) = EmbedItemAssets::get(&path) {
            copy_embed_asset(&path, embedded_file)?;
        }
    }

    Ok(())
}

/// Copy web application assets files to the output directory.
#[instrument(skip_all, err)]
fn copy_webapp_assets(output_dir: &Path) -> Result<()> {
    debug!("copying web application assets to output directory");

    for path in WebappAssets::iter() {
        if path == "index.html" || path == ".keep" {
            // This file is a template that will be rendered later on
            continue;
        }

        if let Some(embedded_file) = WebappAssets::get(&path) {
            if let Some(parent_path) = Path::new(path.as_ref()).parent() {
                fs::create_dir_all(output_dir.join(parent_path))?;
            }
            let mut file = File::create(output_dir.join(path.as_ref()))?;
            file.write_all(&embedded_file.data)?;
        }
    }

    Ok(())
}

/// Display build success message.
fn display_success_msg(output_dir: &str) {
    println!(
        "\n✅ Landscape built successfully!

You can see it in action by running the following command:

👉 landscape2 serve --landscape-dir {output_dir}
"
    );
}

/// Generate API data files and write them to API_PATH in the output directory.
#[instrument(skip_all, err)]
fn generate_api(input: &ApiSources, output_dir: &Path) -> Result<()> {
    debug!("generating api");

    let api = Api::new(input);
    let api_path = output_dir.join(API_PATH);

    // Write data files to output dir
    for (endpoint, data) in &api.endpoints {
        let endpoint_full_path = api_path.join(endpoint.strip_prefix('/').unwrap_or(endpoint));

        // Create endpoint parent directory if needed
        let Some(parent_path) = endpoint_full_path.parent() else {
            continue;
        };
        if parent_path != Path::new("") && !parent_path.exists() {
            fs::create_dir_all(parent_path)?;
        }

        // Write data file
        let mut file = File::create(endpoint_full_path)?;
        file.write_all(data.as_bytes())?;
    }

    Ok(())
}

/// Generate datasets from the landscape data and settings, as well as from the
/// data collected from external services (GitHub, Crunchbase, etc). Some of
/// the datasets will be embedded in the index document, and the rest will be
/// written to the DATASETS_PATH in the output directory.
#[instrument(skip_all, err)]
fn generate_datasets(input: &NewDatasetsInput, output_dir: &Path) -> Result<Datasets> {
    debug!("generating datasets");

    let datasets = Datasets::new(input);
    let datasets_path = output_dir.join(DATASETS_PATH);

    // Base
    let mut base_file = File::create(datasets_path.join("base.json"))?;
    base_file.write_all(&serde_json::to_vec(&datasets.base)?)?;

    // Embed
    for (key, view) in &datasets.embed.views {
        let mut embed_file = File::create(datasets_path.join(format!("embed_{key}.json")))?;
        embed_file.write_all(&serde_json::to_vec(&view)?)?;

        let view_full_dataset = prepare_view_full_dataset(&datasets.full, view);
        let mut embed_full_file = File::create(datasets_path.join(format!("embed_full_{key}.json")))?;
        embed_full_file.write_all(&serde_json::to_vec(&view_full_dataset)?)?;
    }

    // Full
    let mut full_file = File::create(datasets_path.join("full.json"))?;
    full_file.write_all(&serde_json::to_vec(&datasets.full)?)?;

    // Stats
    let mut stats_file = File::create(datasets_path.join("stats.json"))?;
    stats_file.write_all(&serde_json::to_vec(&datasets.stats)?)?;

    Ok(datasets)
}

/// Generate the items.csv file from the landscape data.
#[instrument(skip_all, err)]
fn generate_items_csv_file(landscape_data: &LandscapeData, output_dir: &Path) -> Result<()> {
    debug!("generating items csv file");

    let docs_path = output_dir.join(DOCS_PATH);
    let w = csv::Writer::from_path(docs_path.join("items.csv"))?;
    generate_items_csv(w, landscape_data)?;

    Ok(())
}

/// Generate the projects.md and projects.csv files from the landscape data.
#[instrument(skip_all, err)]
fn generate_projects_files(landscape_data: &LandscapeData, output_dir: &Path) -> Result<()> {
    debug!("generating projects files");

    let projects = collect_projects(landscape_data);

    // projects.md
    let projects_md = ProjectsMd { projects: &projects }.render()?;
    let docs_path = output_dir.join(DOCS_PATH);
    let mut file = File::create(docs_path.join("projects.md"))?;
    file.write_all(projects_md.as_bytes())?;

    // projects.csv
    let w = csv::Writer::from_path(docs_path.join("projects.csv"))?;
    generate_projects_csv(w, &projects)?;

    Ok(())
}

/// Generate QR code and copy it to output directory.
#[instrument(skip(output_dir), err)]
fn generate_qr_code(url: &String, output_dir: &Path) -> Result<String> {
    debug!("generating qr code");

    // Generate QR code
    let code = qrcode::QrCode::new(url.as_bytes())?;
    let svg = code
        .render()
        .min_dimensions(200, 200)
        .dark_color(svg::Color("#000000"))
        .light_color(svg::Color("#ffffff"))
        .build();

    // Write QR code (SVG) to output dir
    let svg_path = Path::new(IMAGES_PATH).join("qr_code.svg");
    File::create(output_dir.join(&svg_path))?.write_all(svg.as_bytes())?;

    Ok(svg_path.to_string_lossy().into_owned())
}

/// Prepare games data and copy it to the output directory.
#[instrument(skip_all, err)]
async fn prepare_games_data(games_source: &GamesSource, output_dir: &Path) -> Result<Option<LandscapeGames>> {
    debug!("preparing games data");

    let Some(games) = LandscapeGames::new(games_source).await? else {
        return Ok(None);
    };

    // Quiz game data
    if let Some(quiz) = &games.quiz {
        let path = output_dir.join(DATASETS_PATH).join("quiz.json");
        File::create(path)?.write_all(&serde_json::to_vec(&quiz.questions)?)?;
    }

    Ok(Some(games))
}

/// Prepare guide and copy it to the output directory.
#[instrument(skip_all, err)]
async fn prepare_guide(guide_source: &GuideSource, output_dir: &Path) -> Result<Option<LandscapeGuide>> {
    debug!("preparing guide");

    let Some(guide) = LandscapeGuide::new(guide_source).await? else {
        return Ok(None);
    };
    let path = output_dir.join(DATASETS_PATH).join("guide.json");
    File::create(path)?.write_all(&serde_json::to_vec(&guide)?)?;

    Ok(Some(guide))
}

/// Prepare items logos and copy them to the output directory, updating the
/// logo reference on each landscape item.
#[instrument(skip_all, err)]
async fn prepare_items_logos(
    logos_source: &LogosSource,
    logos_viewbox: &LogosViewbox,
    landscape_data: &mut LandscapeData,
    output_dir: &Path,
) -> Result<()> {
    debug!("preparing logos");

    // Get logos from the source and copy them to the output directory
    let mut concurrency = num_cpus::get();
    if concurrency > PREPARE_LOGOS_MAX_CONCURRENCY {
        concurrency = PREPARE_LOGOS_MAX_CONCURRENCY;
    }
    let http_client = reqwest::Client::new();
    let logos_source = Arc::new(logos_source.clone());
    let logos_viewbox = Arc::new(logos_viewbox.clone());
    let logos: HashMap<String, Option<String>> = stream::iter(landscape_data.items.iter())
        .map(|item| async {
            // Prepare logo
            let http_client = http_client.clone();
            let logos_source = logos_source.clone();
            let logos_viewbox = logos_viewbox.clone();
            let file_name = item.logo.clone();
            let logo = match tokio::spawn(async move {
                prepare_logo(http_client, &logos_source, &logos_viewbox, &file_name).await
            })
            .await
            {
                Ok(Ok(logo)) => logo,
                Ok(Err(err)) => {
                    error!(?err, ?item.logo, "error preparing logo");
                    return (item.id.clone(), None);
                }
                Err(err) => {
                    error!(?err, ?item.logo, "error executing prepare_logo task");
                    return (item.id.clone(), None);
                }
            };

            // Copy logo to output dir using the digest(+.extenstion) as filename
            let file_name = format!("{}.{}", logo.digest, logo.extension);
            let mut file = match File::create(output_dir.join(LOGOS_PATH).join(&file_name)) {
                Ok(file) => file,
                Err(err) => {
                    error!(?err, ?file_name, "error creating logo file in output dir");
                    return (item.id.clone(), None);
                }
            };
            if let Err(err) = file.write_all(&logo.data) {
                error!(?err, ?file_name, "error writing logo to file in output dir");
            };

            (item.id.clone(), Some(format!("{LOGOS_PATH}/{file_name}")))
        })
        .buffer_unordered(concurrency)
        .collect()
        .await;

    // Update logo field in landscape items to logo digest path
    for item in &mut landscape_data.items {
        item.logo = if let Some(Some(logo)) = logos.get(&item.id) {
            logo.clone()
        } else {
            String::new()
        }
    }

    debug!("done!");
    Ok(())
}

/// Prepare landscape screenshot (in PNG and PDF formats).
#[allow(clippy::cast_precision_loss, clippy::items_after_statements)]
#[instrument(skip(output_dir), err)]
async fn prepare_screenshot(width: u32, output_dir: &Path) -> Result<()> {
    debug!("preparing screenshot");

    // Check if Chrome/Chromium is available
    if browser::default_executable().is_err() {
        warn!("chrome/chromium not found, no screenshot will be taken");
        return Ok(());
    }

    // Launch server to serve landscape just built
    let Some(port) = find_available_port() else {
        bail!("could not find an available port to listen on");
    };
    let svr_addr = format!("127.0.0.1:{port}");
    let svr_addr_copy = svr_addr.clone();
    let landscape_dir = Some(PathBuf::from(&output_dir));
    let server = tokio::spawn(async {
        let args = serve::ServeArgs {
            addr: svr_addr_copy,
            graceful_shutdown: false,
            landscape_dir,
            silent: true,
        };
        serve(&args).await
    });

    // Setup headless browser and navigate to screenshot url
    const TIMEOUT: Duration = Duration::from_secs(300);
    let options = LaunchOptions {
        args: vec![
            OsStr::new("--force-device-scale-factor=2"),
            OsStr::new("--headless=new"),
            OsStr::new("--hide-scrollbars"),
        ],
        idle_browser_timeout: TIMEOUT,
        sandbox: false,
        window_size: Some((width, 500)),
        ..Default::default()
    };
    let browser = Browser::new(options)?;
    let tab = browser.new_tab()?;
    tab.set_default_timeout(TIMEOUT);
    let screenshot_url = format!("http://{svr_addr}/screenshot");
    tab.navigate_to(&screenshot_url)?.wait_until_navigated()?;
    trace!("navigated to screenshot url");

    // Take screenshot in PNG format and save it to a file
    let png_b64_data = tab
        .call_method(Page::CaptureScreenshot {
            format: Some(CaptureScreenshotFormatOption::Png),
            quality: None,
            clip: None,
            from_surface: None,
            capture_beyond_viewport: Some(true),
        })
        .context("error generating screenshot in png format")?
        .data;
    let png_data = b64.decode(png_b64_data)?;
    let png_path = output_dir.join(DOCS_PATH).join("landscape.png");
    File::create(&png_path)?.write_all(&png_data)?;
    trace!("screenshot in png format ready");

    // Take screenshot in PDF format and save it to a file
    // We use the dimensions of the screenshot in PNG format to calculate the
    // dimensions of the PDF paper, converting from pixels to inches.
    let png_size = imagesize::size(&png_path).context("error getting screenshot in png format dimensions")?;
    let pdf_data = tab
        .print_to_pdf(Some(PrintToPdfOptions {
            margin_bottom: Some(0.0),
            margin_left: Some(0.0),
            margin_right: Some(0.0),
            margin_top: Some(0.0),
            page_ranges: Some("1".to_string()),
            paper_height: Some((png_size.height + 10) as f64 / 2.0 * 0.010_416_666_7),
            paper_width: Some(png_size.width as f64 / 2.0 * 0.010_416_666_7),
            print_background: Some(true),
            ..Default::default()
        }))
        .context("error generating screenshot in pdf format")?;
    let pdf_path = output_dir.join(DOCS_PATH).join("landscape.pdf");
    File::create(pdf_path)?.write_all(&pdf_data)?;
    trace!("screenshot in pdf format ready");

    // Stop server
    server.abort();

    debug!("done!");
    Ok(())
}

/// Fetch some settings images, copy them to the output directory and update
/// their urls to the local copy.
#[instrument(skip_all, err)]
async fn prepare_settings_images(settings: &mut LandscapeSettings, output_dir: &Path) -> Result<()> {
    // Helper function to process the image provided
    async fn process_image(url: &Option<String>, output_dir: &Path) -> Result<Option<String>> {
        let Some(url) = url else {
            return Ok(None);
        };

        // Fetch image from url
        let resp = reqwest::get(url).await?;
        if resp.status() != StatusCode::OK {
            bail!("unexpected status ({}) code getting logo {url}", resp.status());
        }
        let img = resp.bytes().await?.to_vec();

        // Write image to output dir
        let url = Url::parse(url).context("invalid image url")?;
        let Some(file_name) = url.path_segments().and_then(Iterator::last) else {
            bail!("invalid image url: {url}");
        };
        let img_path = Path::new(IMAGES_PATH).join(file_name);
        File::create(output_dir.join(&img_path))?.write_all(&img)?;

        Ok(Some(img_path.to_string_lossy().into_owned()))
    }

    debug!("preparing settings images");

    // Header
    if let Some(header) = &mut settings.header {
        header.logo = process_image(&header.logo, output_dir).await?;
    };

    // Footer
    if let Some(footer) = &mut settings.footer {
        footer.logo = process_image(&footer.logo, output_dir).await?;
    };

    // Other images
    if let Some(images) = &mut settings.images {
        images.favicon = process_image(&images.favicon, output_dir).await?;
    };

    Ok(())
}

/// Prepare view full dataset creating a stripped down version of the full
/// dataset with only the data needed for the provided embed view.
fn prepare_view_full_dataset(full: &Full, view: &EmbedView) -> Full {
    // Items
    let mut items: Vec<Item> = vec![];
    for fi in &full.items {
        if view.items.iter().any(|vi| vi.id == fi.id) {
            items.push(fi.clone());
        }
    }

    // Crunchbase data
    let mut crunchbase_data: CrunchbaseData = BTreeMap::new();
    for (url, org) in &full.crunchbase_data {
        if items.iter().any(|i| {
            let Some(crunchbase_url) = &i.crunchbase_url else {
                return false;
            };
            crunchbase_url == url
        }) {
            crunchbase_data.insert(url.clone(), org.clone());
        }
    }

    // GitHub data
    let mut github_data: GithubData = BTreeMap::new();
    for (url, repo_github_data) in &full.github_data {
        if items.iter().any(|i| {
            if let Some(repositories) = &i.repositories {
                return repositories.iter().any(|r| r.url == *url);
            }
            false
        }) {
            github_data.insert(url.clone(), repo_github_data.clone());
        }
    }

    Full {
        crunchbase_data,
        github_data,
        items,
    }
}

/// Template for the index html document.
#[derive(Debug, Clone, Template)]
#[template(path = "index.html", escape = "none")]
struct IndexHtml<'a> {
    analytics: &'a Option<Analytics>,
    datasets: &'a Datasets,
    osano: &'a Option<Osano>,
}

/// Render index html file and write it to the output directory.
#[instrument(skip_all, err)]
fn render_index_html(
    analytics: &Option<Analytics>,
    datasets: &Datasets,
    osano: &Option<Osano>,
    output_dir: &Path,
) -> Result<()> {
    debug!("rendering index.html file");

    let html = IndexHtml {
        analytics,
        datasets,
        osano,
    }
    .render()?;
    File::create(output_dir.join("index.html"))?.write_all(html.as_bytes())?;

    Ok(())
}

/// Template for the embed item html document.
#[derive(Debug, Clone, Template)]
#[template(path = "embed-item.html", escape = "none")]
struct EmbedItemHtml<'a> {
    colors: &'a Option<Colors>,
}

/// Render embed item html file and write it to the output directory.
#[instrument(skip_all, err)]
fn render_embed_item_html(colors: &Option<Colors>, output_dir: &Path) -> Result<()> {
    debug!("rendering embed-item.html file");

    let path = output_dir.join(EMBED_PATH).join("embed-item.html");
    let html = EmbedItemHtml { colors }.render()?;
    File::create(path)?.write_all(html.as_bytes())?;

    Ok(())
}

/// Setup output directory, creating it as well as any of the other required
/// paths inside it when needed.
#[instrument(err)]
fn setup_output_dir(output_dir: &Path) -> Result<()> {
    debug!("setting up output directory");

    if !output_dir.exists() {
        debug!("creating output directory");
        fs::create_dir_all(output_dir)?;
    }

    for path in &[
        API_PATH,
        DATASETS_PATH,
        DOCS_PATH,
        EMBED_PATH,
        IMAGES_PATH,
        LOGOS_PATH,
        SOURCES_PATH,
    ] {
        let path = output_dir.join(path);
        if !path.exists() {
            fs::create_dir(path)?;
        }
    }

    Ok(())
}

/// Find an available port to listen on.
fn find_available_port() -> Option<u16> {
    (9000..10000).find(|port| TcpListener::bind(("127.0.0.1", *port)).is_ok())
}

mod filters {
    use super::settings::Analytics;
    use askama_escape::JsonEscapeBuffer;
    use serde::Serialize;

    /// Filter to get the Google Tag Manager container ID from the analytics
    /// instance provided.
    #[allow(clippy::unnecessary_wraps)]
    pub(crate) fn get_gtm_container_id(analytics: &Option<Analytics>) -> askama::Result<Option<String>> {
        Ok(analytics.as_ref().and_then(|a| a.gtm.as_ref()).and_then(|gtm| gtm.container_id.clone()))
    }

    /// Serialize to JSON.
    ///
    /// Based on the `json` built-in filter except the output is not pretty
    /// printed.
    pub(crate) fn json_compact<S: Serialize>(s: S) -> askama::Result<String> {
        let mut writer = JsonEscapeBuffer::new();
        serde_json::to_writer(&mut writer, &s)?;
        Ok(writer.finish())
    }
}

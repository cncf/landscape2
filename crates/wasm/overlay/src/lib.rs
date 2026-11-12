//! This module is in charge of preparing the overlay data.

use std::collections::HashMap;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use landscape2_core::{
    data::{CrunchbaseData, DataSource, GithubData, LandscapeData},
    datasets::{base::Base, full::Full},
    games::{GamesSource, LandscapeGames},
    guide::{GuideSource, LandscapeGuide},
    paths::{
        DATA_FILE, DATASETS_PATH, FULL_DATASET_FILE, GAMES_FILE, GUIDE_FILE, SETTINGS_FILE, SOURCES_PATH,
    },
    settings::{LandscapeSettings, SettingsSource},
    source::{Parsed, SourceKind},
    stats::Stats,
    util::image_output_path,
};
use reqwest::{Response, StatusCode, Url};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::{JsValue, wasm_bindgen};

/// Input of the overlay data preparation, provided by the web application.
/// The optional urls override the deployed landscape files.
#[derive(Debug, Clone, Default, Deserialize)]
struct OverlayInput {
    /// Url of the deployed landscape the overlay is applied to.
    landscape_url: String,

    /// Url of the landscape data file.
    data_url: Option<String>,
    /// Url of the landscape games file.
    games_url: Option<String>,
    /// Url of the landscape guide file.
    guide_url: Option<String>,
    /// Base url of the items logos.
    logos_url: Option<String>,
    /// Url of the landscape settings file.
    settings_url: Option<String>,
}

/// Overlay data returned to the web application.
#[derive(Debug, Serialize)]
#[cfg_attr(
    feature = "ts",
    derive(ts_rs::TS),
    ts(export_to = "overlay/", optional_fields)
)]
struct OverlayData {
    /// Datasets prepared from the overlay sources.
    datasets: OverlayDatasets,

    /// Landscape games, when available.
    #[serde(skip_serializing_if = "Option::is_none")]
    games: Option<LandscapeGames>,
    /// Landscape guide, when available.
    #[serde(skip_serializing_if = "Option::is_none")]
    guide: Option<LandscapeGuide>,
    /// Warnings found while preparing the overlay data.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    warnings: Vec<String>,
}

/// Datasets included in the overlay data, built as the CLI build does (the
/// embed dataset is not needed by the overlay).
#[derive(Debug, Serialize)]
#[cfg_attr(
    feature = "ts",
    derive(ts_rs::TS),
    ts(export_to = "overlay/", optional_fields)
)]
struct OverlayDatasets {
    /// Base dataset.
    base: Base,
    /// Full dataset.
    full: Full,
    /// Stats dataset.
    stats: Stats,
}

/// Urls of the sources the overlay data is prepared from.
#[derive(Debug, Clone, PartialEq)]
struct SourceUrls {
    /// Url of the landscape data file.
    data: String,
    /// Url of the deployed landscape games file, used when no explicit games
    /// url is provided.
    default_games: String,
    /// Url of the deployed landscape guide file, used when no explicit guide
    /// url is provided.
    default_guide: String,
    /// Url of the deployed full dataset.
    deployed_full: String,
    /// Url of the landscape settings file.
    settings: String,

    /// Explicit url of the landscape games file.
    games: Option<String>,
    /// Explicit url of the landscape guide file.
    guide: Option<String>,
}

impl SourceUrls {
    /// Create a new `SourceUrls` instance from the overlay input provided. The
    /// urls not provided default to the deployed landscape files.
    fn new(input: &OverlayInput) -> Self {
        let landscape_url = input.landscape_url.trim_end_matches('/');
        let source_url = |file: &str| format!("{landscape_url}/{SOURCES_PATH}/{file}");

        Self {
            data: input.data_url.clone().unwrap_or_else(|| source_url(DATA_FILE)),
            default_games: source_url(GAMES_FILE),
            default_guide: source_url(GUIDE_FILE),
            deployed_full: format!("{landscape_url}/{DATASETS_PATH}/{FULL_DATASET_FILE}"),
            settings: input.settings_url.clone().unwrap_or_else(|| source_url(SETTINGS_FILE)),
            games: input.games_url.clone(),
            guide: input.guide_url.clone(),
        }
    }
}

/// Subset of the deployed full dataset used by the overlay. The fields not
/// listed are ignored.
#[derive(Debug, Deserialize)]
struct DeployedFull {
    /// Organizations data collected from Crunchbase.
    #[serde(default)]
    crunchbase_data: CrunchbaseData,
    /// Repositories data collected from GitHub.
    #[serde(default)]
    github_data: GithubData,
    /// Items of the deployed landscape.
    #[serde(default)]
    items: Vec<DeployedItem>,
}

/// Item of the deployed full dataset, limited to the information the overlay
/// takes from the deployed landscape. The fields not listed are ignored.
#[derive(Debug, Deserialize)]
struct DeployedItem {
    /// Item identifier (`category--subcategory--name`).
    id: String,
    /// Path of the item logo in the deployed landscape.
    logo: String,
    /// Item name.
    name: String,

    /// CLOMonitor report summary of the item.
    clomonitor_report_summary: Option<String>,
}

/// Prepare and return the overlay data, as JSON.
///
/// # Errors
///
/// Returns an error if the input is not valid or the overlay data cannot be
/// prepared.
#[wasm_bindgen]
pub async fn get_overlay_data(input: JsValue) -> Result<String, String> {
    // Parse the input provided by the web application
    let input: OverlayInput =
        serde_wasm_bindgen::from_value(input).map_err(|err| format!("invalid overlay input: {err}"))?;

    // Prepare the overlay data and return it as JSON
    let data = prepare_overlay_data(input, Utc::now()).await.map_err(|err| format_error(&err))?;
    serde_json::to_string(&data).map_err(|err| format_error(&err.into()))
}

/// Return the raw content read from a guide or games source, treating a not
/// found error (404) as an absent source when the source url is the default
/// one. The CLI build deploys these files whenever they exist, so a 404 is the
/// only expected miss; any other error is returned.
fn absent_if_not_found(read_result: Result<Option<String>>, is_default_url: bool) -> Result<Option<String>> {
    match read_result {
        Err(err) if is_default_url && is_not_found(&err) => Ok(None),
        read_result => read_result,
    }
}

/// Apply the information only available in the deployed landscape to the
/// landscape items: the CLOMonitor report summary and, when no logos url is
/// provided, the logo.
///
/// Each item is matched to a deployed item by id first, then by its exact name
/// when no other deployed item has the same name (so moved items still match).
/// When a logos url is provided, the item logos are joined to it instead.
///
/// Returns a warning for each item that needed a deployed logo but matched no
/// deployed item.
fn apply_deployed_items(
    landscape_data: &mut LandscapeData,
    deployed_items: Vec<DeployedItem>,
    logos_url: Option<&str>,
) -> Vec<String> {
    // Index the deployed items by id and by name (ambiguous names map to None)
    let by_id: HashMap<&str, &DeployedItem> = deployed_items.iter().map(|x| (x.id.as_str(), x)).collect();
    let mut by_name: HashMap<&str, Option<&DeployedItem>> = HashMap::new();
    for deployed_item in &deployed_items {
        by_name
            .entry(deployed_item.name.as_str())
            .and_modify(|entry| *entry = None)
            .or_insert(Some(deployed_item));
    }

    // Apply the information of the matching deployed item to each item
    let mut warnings = vec![];
    for item in &mut landscape_data.items {
        let deployed_item = by_id
            .get(item.id.as_str())
            .copied()
            .or_else(|| by_name.get(item.name.as_str()).copied().flatten());
        item.clomonitor_report_summary = deployed_item.and_then(|x| x.clomonitor_report_summary.clone());
        if let Some(logos_url) = logos_url {
            item.logo = format!("{}/{}", logos_url.trim_end_matches('/'), item.logo);
        } else if let Some(deployed_item) = deployed_item {
            item.logo.clone_from(&deployed_item.logo);
        } else {
            item.logo = String::new();
            warnings.push(format!(
                "item {} not found in the deployed landscape: logo and CLOMonitor summary unavailable",
                item.id
            ));
        }
    }

    warnings
}

/// Return the value parsed from a source, appending its warnings to the ones
/// provided, prefixed with the kind of source (e.g. `settings: unknown key …`).
fn collect_warnings<T>(parsed: Parsed<T>, kind: SourceKind, warnings: &mut Vec<String>) -> T {
    warnings.extend(parsed.warnings.into_iter().map(|warning| format!("{kind}: {warning}")));
    parsed.value
}

/// Format the error provided, including its whole cause chain on one line.
fn format_error(err: &anyhow::Error) -> String {
    format!("{err:#}")
}

/// Check if the error provided, or any of its causes, is a request that
/// failed with a not found (404) status.
fn is_not_found(err: &anyhow::Error) -> bool {
    err.chain().any(|cause| {
        cause
            .downcast_ref::<reqwest::Error>()
            .is_some_and(|err| err.status() == Some(StatusCode::NOT_FOUND))
    })
}

/// Load the landscape data from the url provided.
async fn load_data(url: String) -> Result<Parsed<LandscapeData>> {
    let load = async {
        let src = DataSource::new_from_url(url);
        let raw = src.read_raw().await?.context("data url not provided")?;
        LandscapeData::new_from_yaml(&raw)
    };
    load.await.context("error fetching landscape data")
}

/// Fetch the full dataset of the deployed landscape.
async fn load_deployed_full(url: &str) -> Result<DeployedFull> {
    let resp = reqwest::get(url)
        .await
        .and_then(Response::error_for_status)
        .context("error getting deployed full dataset")?;
    resp.json().await.context("error parsing deployed full dataset")
}

/// Load the landscape games from the explicit url when provided, or from the
/// deployed landscape otherwise. A deployed landscape without games is not an
/// error.
async fn load_games(
    explicit_url: Option<String>,
    default_url: String,
) -> Result<Option<Parsed<LandscapeGames>>> {
    let is_default_url = explicit_url.is_none();
    let load = async {
        let src = GamesSource::new_from_url(explicit_url.unwrap_or(default_url));
        let Some(raw) = absent_if_not_found(src.read_raw().await, is_default_url)? else {
            return Ok(None);
        };
        LandscapeGames::new_from_yaml(&raw).map(Some)
    };
    load.await.context("error fetching games data")
}

/// Load the landscape guide from the explicit url when provided, or from the
/// deployed landscape otherwise. A deployed landscape without guide is not an
/// error.
async fn load_guide(
    explicit_url: Option<String>,
    default_url: String,
) -> Result<Option<Parsed<LandscapeGuide>>> {
    let is_default_url = explicit_url.is_none();
    let load = async {
        let src = GuideSource::new_from_url(explicit_url.unwrap_or(default_url));
        let Some(raw) = absent_if_not_found(src.read_raw().await, is_default_url)? else {
            return Ok(None);
        };
        LandscapeGuide::new_from_yaml(&raw).map(Some)
    };
    load.await.context("error fetching guide")
}

/// Load the landscape settings from the url provided.
async fn load_settings(url: String) -> Result<Parsed<LandscapeSettings>> {
    let load = async {
        let src = SettingsSource::new_from_url(url);
        let raw = src.read_raw().await?.context("settings url not provided")?;
        LandscapeSettings::new_from_yaml(&raw)
    };
    load.await.context("error fetching settings")
}

/// Rewrite the local paths of the settings images (header and footer logos
/// and favicon) to the path the CLI build wrote each image to, so that they
/// resolve to the images of the deployed landscape. Absolute urls are kept,
/// as they can be loaded directly.
fn localize_settings_images(settings: &mut LandscapeSettings) {
    let locations = [
        settings.header.as_mut().and_then(|header| header.logo.as_mut()),
        settings.footer.as_mut().and_then(|footer| footer.logo.as_mut()),
        settings.images.as_mut().and_then(|images| images.favicon.as_mut()),
    ];
    for location in locations.into_iter().flatten() {
        if Url::parse(location).is_err() {
            *location = image_output_path(location);
        }
    }
}

/// Prepare the overlay data from the overlay input provided, using `now` as
/// the reference time of the stats.
async fn prepare_overlay_data(input: OverlayInput, now: DateTime<Utc>) -> Result<OverlayData> {
    // Load the sources and the deployed full dataset concurrently
    let SourceUrls {
        data,
        default_games,
        default_guide,
        deployed_full,
        settings,
        games,
        guide,
    } = SourceUrls::new(&input);
    let (data, settings, guide, games, deployed_full) = futures::try_join!(
        load_data(data),
        load_settings(settings),
        load_guide(guide, default_guide),
        load_games(games, default_games),
        load_deployed_full(&deployed_full),
    )?;

    // Collect the warnings found in the sources
    let mut warnings = vec![];
    let mut landscape_data = collect_warnings(data, SourceKind::Data, &mut warnings);
    let mut settings = collect_warnings(settings, SourceKind::Settings, &mut warnings);
    let guide = guide.map(|guide| collect_warnings(guide, SourceKind::Guide, &mut warnings));
    let games = games.map(|games| collect_warnings(games, SourceKind::Games, &mut warnings));

    // Point the local settings images to the deployed ones
    localize_settings_images(&mut settings);

    // Enrich landscape data as the CLI build does, then add the information
    // only available in the deployed items
    let DeployedFull {
        crunchbase_data,
        github_data,
        items: deployed_items,
    } = deployed_full;
    landscape_data.enrich(&settings, &crunchbase_data, &github_data);
    warnings.extend(apply_deployed_items(
        &mut landscape_data,
        deployed_items,
        input.logos_url.as_deref(),
    ));

    // Prepare datasets (no QR code, as the overlay settings may change the
    // url), moving the large maps and items into the full dataset
    let base = Base::new(&landscape_data, &settings, guide.as_ref(), games.as_ref(), None);
    let stats = Stats::new(&landscape_data, &settings, now);
    let full = Full {
        crunchbase_data,
        github_data,
        items: landscape_data.items,
    };

    Ok(OverlayData {
        datasets: OverlayDatasets { base, full, stats },
        games,
        guide,
        warnings,
    })
}

#[cfg(test)]
mod tests;

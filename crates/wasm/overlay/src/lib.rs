//! This module is in charge of preparing the overlay data.

use anyhow::{bail, Context, Result};
use landscape2_core::{
    data::{DataSource, Item, LandscapeData},
    datasets::{base::Base, full::Full},
    guide::{GuideSource, LandscapeGuide},
    settings::{LandscapeSettings, SettingsSource},
    stats::Stats,
};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Path of the deployed full dataset file.
const FULL_DATASET_PATH: &str = "data/full.json";

/// Path of the default data file.
const DEFAULT_DATA_PATH: &str = "sources/data.yml";

/// Path of the default settings file.
const DEFAULT_SETTINGS_PATH: &str = "sources/settings.yml";

/// Path of the default guide file.
const DEFAULT_GUIDE_PATH: &str = "sources/guide.yml";

/// Input data for the get_overlay_data function.
#[derive(Deserialize)]
struct GetOverlayDataInput {
    landscape_url: String,

    data_url: Option<String>,
    guide_url: Option<String>,
    logos_url: Option<String>,
    settings_url: Option<String>,
}

/// Overlay data.
#[derive(Serialize)]
struct OverlayData {
    datasets: Datasets,
    guide: Option<LandscapeGuide>,
}

/// Datasets included in the overlay data.
#[derive(Serialize)]
struct Datasets {
    base: Base,
    full: Full,
    stats: Stats,
}

/// Prepare and return the overlay data.
#[wasm_bindgen]
pub async fn get_overlay_data(input: JsValue) -> Result<String, String> {
    // Parse input data
    let mut input: GetOverlayDataInput = serde_wasm_bindgen::from_value(input).map_err(to_str)?;
    input.landscape_url = input.landscape_url.trim_end_matches('/').to_string();

    // Get landscape data
    let default_data_url = format!("{}/{}", input.landscape_url, DEFAULT_DATA_PATH);
    let data_url = input.data_url.unwrap_or(default_data_url);
    let landscape_data_src = DataSource::new_from_url(data_url);
    let mut landscape_data = LandscapeData::new(&landscape_data_src)
        .await
        .context("error fetching landscape data")
        .map_err(to_str)?;

    // Get landscape settings
    let default_settings_url = format!("{}/{}", input.landscape_url, DEFAULT_SETTINGS_PATH);
    let settings_url = input.settings_url.unwrap_or(default_settings_url);
    let settings_src = SettingsSource::new_from_url(settings_url);
    let settings = LandscapeSettings::new(&settings_src)
        .await
        .context("error fetching settings")
        .map_err(to_str)?;

    // Get landscape guide
    let default_guide_url = format!("{}/{}", input.landscape_url, DEFAULT_GUIDE_PATH);
    let guide_url = input.guide_url.unwrap_or(default_guide_url);
    let guide_src = GuideSource::new_from_url(guide_url);
    let guide = LandscapeGuide::new(&guide_src).await.context("error fetching guide").map_err(to_str)?;

    // Get Crunchbase and GitHub data from deployed full dataset
    let deployed_full_dataset = get_full_dataset(&input.landscape_url).await.map_err(to_str)?;
    let deployed_items = deployed_full_dataset.items;
    let crunchbase_data = deployed_full_dataset.crunchbase_data;
    let github_data = deployed_full_dataset.github_data;

    // Enrich landscape data with some extra information
    landscape_data.add_crunchbase_data(&crunchbase_data);
    landscape_data.add_featured_items_data(&settings);
    landscape_data.add_github_data(&github_data);
    landscape_data.add_member_subcategory(&settings.members_category);
    landscape_data.add_tags(&settings);
    set_clomonitor_report_summary(&mut landscape_data, &deployed_items);
    set_logos_url(&mut landscape_data, input.logos_url, &deployed_items);

    // Prepare datasets
    let qr_code = String::new();
    let datasets = Datasets {
        base: Base::new(&landscape_data, &settings, &guide, &qr_code),
        full: Full::new(&landscape_data, &crunchbase_data, &github_data),
        stats: Stats::new(&landscape_data, &settings),
    };

    // Prepare overlay data and return it
    let overlay_data = OverlayData { datasets, guide };
    let overlay_data_json = serde_json::to_string(&overlay_data).map_err(to_str)?;

    Ok(overlay_data_json)
}

/// Get landscape currently deployed full dataset.
async fn get_full_dataset(landscape_url: &str) -> Result<Full> {
    let url = format!("{}/{}", landscape_url, FULL_DATASET_PATH);
    let resp = reqwest::get(&url).await.context("error getting full dataset")?;
    if resp.status() != StatusCode::OK {
        bail!("unexpected status code getting full dataset: {}", resp.status());
    }
    let full: Full = resp.json().await?;
    Ok(full)
}

/// Set logos url for all items in the landscape based on the base logos url
/// provided.
fn set_clomonitor_report_summary(landscape_data: &mut LandscapeData, deployed_items: &[Item]) {
    for item in &mut landscape_data.items {
        item.clomonitor_report_summary = deployed_items
            .iter()
            .find(|x| x.id == item.id)
            .and_then(|x| x.clomonitor_report_summary.clone());
    }
}

/// Set logos url for all items in the landscape.
///
/// If a logos url is provided, it will be used to set the logo url for all
/// items. Otherwise, we'll use the current logo url from the deployed items.
fn set_logos_url(landscape_data: &mut LandscapeData, logos_url: Option<String>, deployed_items: &[Item]) {
    if let Some(logos_url) = logos_url {
        for item in &mut landscape_data.items {
            item.logo = format!("{}/{}", logos_url.trim_end_matches('/'), item.logo);
        }
    } else {
        for item in &mut landscape_data.items {
            item.logo = deployed_items
                .iter()
                .find(|x| x.id == item.id)
                .map(|x| x.logo.clone())
                .unwrap_or_default();
        }
    }
}

/// Helper function to convert an error to a string.
fn to_str<E: std::fmt::Debug>(err: E) -> String {
    format!("{:?}", err)
}

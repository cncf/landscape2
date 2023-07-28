//! This module defines the functionality of the build CLI subcommand.

#![allow(non_upper_case_globals)]

use crate::{
    cache::{self, CachedData},
    crunchbase::collect_crunchbase_data,
    data::{get_landscape_data, LandscapeData},
    datasets::Datasets,
    github::collect_github_data,
    settings::{get_landscape_settings, LandscapeSettings},
    tmpl, BuildArgs, Credentials, LogosSource,
};
use anyhow::{format_err, Result};
use askama::Template;
use futures::stream::{self, StreamExt};
use lazy_static::lazy_static;
use regex::Regex;
use reqwest::StatusCode;
use rust_embed::RustEmbed;
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    fs::{self, File},
    io::Write,
    path::Path,
    time::Instant,
};
use tracing::{debug, error, info, instrument};
use uuid::Uuid;

/// Path where the datasets will be written to in the output directory.
const DATASETS_PATH: &str = "data";

/// Path where the logos will be written to in the output directory.
const LOGOS_PATH: &str = "logos";

/// Embed web application assets into binary.
/// (these assets will be built automatically from the build script)
#[derive(RustEmbed)]
#[folder = "web/dist"]
struct WebAssets;

/// Build landscape static site.
#[instrument(skip_all)]
pub(crate) async fn build(args: &BuildArgs, credentials: &Credentials) -> Result<()> {
    info!("building landscape site..");
    let start = Instant::now();

    // Check required web assets are present
    check_web_assets()?;

    // Setup output directory, creating it when needed
    setup_output_dir(&args.output_dir)?;

    // Get landscape data from the source provided
    let mut landscape_data = get_landscape_data(&args.data_source).await?;

    // Get landscape settings from the source provided
    let settings = get_landscape_settings(&args.settings_source).await?;

    // Add some extra information to the landscape based on the settings
    landscape_data.add_featured_items_data(&settings)?;
    landscape_data.add_member_subcategory(&settings.members_category);

    // Prepare logos and copy them to the output directory
    prepare_logos(&args.logos_source, &mut landscape_data, &args.output_dir).await?;

    // Collect data from external services
    let cached_data = cache::read()?;
    let cb_cached_data = cached_data.as_ref().map(|c| &c.crunchbase_data);
    let gh_cached_data = cached_data.as_ref().map(|c| &c.github_data);
    let (crunchbase_data, github_data) = tokio::try_join!(
        collect_crunchbase_data(&credentials.crunchbase_api_key, &landscape_data, cb_cached_data),
        collect_github_data(&credentials.github_tokens, &landscape_data, gh_cached_data)
    )?;
    cache::write(CachedData {
        crunchbase_data: crunchbase_data.clone(),
        github_data: github_data.clone(),
    })?;

    // Add data collected from external services to the landscape data
    landscape_data.add_crunchbase_data(crunchbase_data)?;
    landscape_data.add_github_data(github_data)?;

    // Generate datasets for web application
    let datasets = generate_datasets(&landscape_data, &settings, &args.output_dir)?;

    // Render index file and write it to the output directory
    render_index(&datasets, &args.output_dir)?;

    // Copy web assets files to the output directory
    copy_web_assets(&args.output_dir)?;

    let duration = start.elapsed().as_secs_f64();
    info!("landscape site built! (took: {:.3}s)", duration);

    Ok(())
}

/// Check web assets are present, to make sure the web app has been built.
#[instrument(skip_all, err)]
fn check_web_assets() -> Result<()> {
    if !WebAssets::iter().any(|path| path.starts_with("assets/")) {
        return Err(format_err!(
            "web assets not found, please make sure they have been built"
        ));
    }

    Ok(())
}

/// Copy web assets files to the output directory.
#[instrument(skip_all, err)]
fn copy_web_assets(output_dir: &Path) -> Result<()> {
    for asset_path in WebAssets::iter() {
        // The index document is a template that we'll render, so we don't want
        // to copy it as is.
        if asset_path == "index.html" || asset_path == ".keep" {
            continue;
        }

        if let Some(embedded_file) = WebAssets::get(&asset_path) {
            debug!(?asset_path, "copying file");
            if let Some(parent_path) = Path::new(asset_path.as_ref()).parent() {
                fs::create_dir_all(output_dir.join(parent_path))?;
            }
            let mut file = File::create(output_dir.join(asset_path.as_ref()))?;
            file.write_all(&embedded_file.data)?;
        }
    }

    Ok(())
}

/// Generate datasets from the landscape data and settings, as well as from the
/// data collected from external services (GitHub, Crunchbase, etc). Some of
/// the datasets will be embedded in the index document, and the rest will be
/// written to the DATASETS_PATH in the output directory.
#[instrument(skip_all, err)]
fn generate_datasets(
    landscape_data: &LandscapeData,
    settings: &LandscapeSettings,
    output_dir: &Path,
) -> Result<Datasets> {
    debug!("generating datasets");
    let datasets = Datasets::new(landscape_data, settings)?;

    debug!("copying datasets to output directory");
    let datasets_path = output_dir.join(DATASETS_PATH);

    // Base
    let mut base_file = File::create(datasets_path.join("base.json"))?;
    base_file.write_all(&serde_json::to_vec(&datasets.base)?)?;

    // Full
    let mut full_file = File::create(datasets_path.join("full.json"))?;
    full_file.write_all(&serde_json::to_vec(&datasets.full)?)?;

    Ok(datasets)
}

/// Helper function to get the logo content from the corresponding source.
#[instrument(fields(?file_name), skip_all, err)]
async fn get_logo_svg(
    http_client: reqwest::Client,
    logos_source: &LogosSource,
    file_name: &str,
) -> Result<String> {
    let svg = if let Some(path) = &logos_source.logos_path {
        fs::read_to_string(path.join(file_name))?
    } else {
        let logos_url = logos_source.logos_url.as_ref().unwrap().trim_end_matches('/');
        let logo_url = format!("{logos_url}/{file_name}");
        let resp = http_client.get(logo_url).send().await?;
        if resp.status() != StatusCode::OK {
            return Err(format_err!(
                "unexpected status code getting logo: {}",
                resp.status()
            ));
        }
        resp.text().await?
    };

    Ok(svg)
}

lazy_static! {
    /// Regular expression used to clean SVG logos' title.
    static ref SVG_TITLE: Regex = Regex::new("<title>.*</title>",).expect("exprs in SVG_TITLE to be valid");
}

/// Prepare logos and copy them to the output directory, updating the logo
/// reference on each landscape item.
#[instrument(skip_all, err)]
async fn prepare_logos(
    logos_source: &LogosSource,
    landscape_data: &mut LandscapeData,
    output_dir: &Path,
) -> Result<()> {
    debug!("preparing logos");

    // Get logos from the source and copy them to the output directory
    let http_client = reqwest::Client::new();
    let logos: HashMap<Uuid, Option<String>> = stream::iter(landscape_data.items.iter())
        .map(|item| async {
            // Get logo SVG
            let Ok(svg) = get_logo_svg(http_client.clone(), logos_source, &item.logo).await else {
                return (item.id, None);
            };

            // Remove SVG title if present
            let svg = SVG_TITLE.replace(&svg, "");

            // Calculate SVG file digest
            let digest = hex::encode(Sha256::digest(svg.as_bytes()));

            // Copy logo to output dir using the digest(+.svg) as filename
            let logo = format!("{digest}.svg");
            let Ok(mut file) = fs::File::create(output_dir.join(LOGOS_PATH).join(&logo)) else {
                error!(?logo, "error creating logo file in output dir");
                return (item.id, None);
            };
            if let Err(err) = file.write_all(svg.as_bytes()) {
                error!(?err, ?logo, "error writing logo to file in output dir");
            };

            (item.id, Some(format!("{LOGOS_PATH}/{logo}")))
        })
        .buffer_unordered(10)
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

    Ok(())
}

/// Render index file and write it to the output directory.
#[instrument(skip_all, err)]
fn render_index(datasets: &Datasets, output_dir: &Path) -> Result<()> {
    debug!("rendering index.html file");
    let index = tmpl::Index { datasets }.render()?;
    let mut file = File::create(output_dir.join("index.html"))?;
    file.write_all(index.as_bytes())?;

    Ok(())
}

/// Setup output directory, creating it as well as any of the other required
/// paths inside it when needed.
#[instrument(fields(?output_dir), skip_all, err)]
fn setup_output_dir(output_dir: &Path) -> Result<()> {
    if !output_dir.exists() {
        debug!("creating output directory");
        fs::create_dir_all(output_dir)?;
    }

    let datasets_path = output_dir.join(DATASETS_PATH);
    if !datasets_path.exists() {
        fs::create_dir(datasets_path)?;
    }

    let logos_path = output_dir.join(LOGOS_PATH);
    if !logos_path.exists() {
        fs::create_dir(logos_path)?;
    }

    Ok(())
}

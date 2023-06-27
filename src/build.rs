//! This module defines the functionality of the build CLI subcommand.

use crate::{
    crunchbase::{self, CBApi, DynCB},
    data::Data,
    datasets::Datasets,
    github::{self, DynGH},
    settings::Settings,
    tmpl, BuildArgs, Credentials, DataSource, LogosSource, SettingsSource,
};
use anyhow::{format_err, Result};
use askama::Template;
use deadpool::unmanaged::Pool;
use futures::stream::{self, StreamExt};
use lazy_static::lazy_static;
use regex::Regex;
use rust_embed::RustEmbed;
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    fs::{self, create_dir, create_dir_all, File},
    io::Write,
    path::Path,
    sync::Arc,
    time::{Duration, Instant},
};
use tracing::{debug, info, instrument, warn};

/// Path where the datasets will be written to in the output directory.
const DATASETS_PATH: &str = "data";

/// Path where the logos will be written to in the output directory.
const LOGOS_PATH: &str = "logos";

/// Embed web assets into binary.
#[derive(RustEmbed)]
#[folder = "web/dist"]
struct WebAssets;

/// Build landscape static site.
#[instrument(skip_all, err)]
pub(crate) async fn build(args: &BuildArgs, credentials: &Credentials) -> Result<()> {
    info!("building landscape site..");
    let start = Instant::now();

    check_web_assets()?;
    setup_output_dir(&args.output_dir)?;
    let mut data = get_landscape_data(&args.data_source).await?;
    let settings = get_landscape_settings(&args.settings_source).await?;
    prepare_logos(&args.logos_source, &mut data, &args.output_dir).await?;
    collect_github_data(&credentials.github_tokens, &mut data).await?;
    collect_crunchbase_data(&credentials.crunchbase_api_key, &mut data).await?;
    let datasets = generate_datasets(&settings, &data, &args.output_dir)?;
    render_index(&datasets, &args.output_dir)?;
    copy_web_assets(&args.output_dir)?;

    let duration = start.elapsed().as_secs_f64();
    info!("landscape site built! (took: {:.3}s)", duration);

    Ok(())
}

/// Check web assets are present, to make sure the web application has already
/// been built.
#[instrument(skip_all, err)]
fn check_web_assets() -> Result<()> {
    if !WebAssets::iter().any(|path| path.starts_with("assets/")) {
        return Err(format_err!(
            "web assets not found, please make sure they have been built"
        ));
    }

    Ok(())
}

/// Setup output directory, creating it as well as any of the other required
/// paths inside it when needed.
#[instrument(fields(?output_dir), skip_all, err)]
fn setup_output_dir(output_dir: &Path) -> Result<()> {
    if !output_dir.exists() {
        debug!("creating output directory");
        create_dir_all(output_dir)?;
    }

    let datasets_path = output_dir.join(DATASETS_PATH);
    if !datasets_path.exists() {
        create_dir(datasets_path)?;
    }

    let logos_path = output_dir.join(LOGOS_PATH);
    if !logos_path.exists() {
        create_dir(logos_path)?;
    }

    Ok(())
}

/// Get landscape data from the source provided.
#[instrument(skip_all, err)]
async fn get_landscape_data(src: &DataSource) -> Result<Data> {
    let data = if let Some(file) = &src.data_file {
        debug!(?file, "getting landscape data from file");
        Data::new_from_file(file)
    } else {
        debug!(url = ?src.data_url.as_ref().unwrap(), "getting landscape data from url");
        Data::new_from_url(src.data_url.as_ref().unwrap()).await
    }?;

    Ok(data)
}

/// Get landscape settings from the source provided.
#[instrument(skip_all, err)]
async fn get_landscape_settings(src: &SettingsSource) -> Result<Settings> {
    let settings = if let Some(file) = &src.settings_file {
        debug!(?file, "getting landscape settings from file");
        Settings::new_from_file(file)
    } else {
        debug!(url = ?src.settings_url.as_ref().unwrap(), "getting landscape settings from url");
        Settings::new_from_url(src.settings_url.as_ref().unwrap()).await
    }?;

    Ok(settings)
}

lazy_static! {
    /// Regular expression used to clean SVG logos' title.
    static ref SVG_TITLE: Regex = Regex::new("<title>.*</title>",).expect("exprs in SVG_TITLE to be valid");
}

/// Prepare logos and copy them to the output directory.
#[instrument(skip_all, err)]
async fn prepare_logos(logos_source: &LogosSource, data: &mut Data, output_dir: &Path) -> Result<()> {
    // Helper function to get the logo content from the corresponding source.
    #[instrument(fields(?file_name), skip_all, err)]
    async fn get_logo_svg(logos_source: &LogosSource, file_name: &str) -> Result<String> {
        let svg = if let Some(path) = &logos_source.logos_path {
            fs::read_to_string(path.join(file_name))?
        } else {
            reqwest::get(logos_source.logos_url.as_ref().unwrap()).await?.text().await?
        };
        Ok(svg)
    }

    debug!("preparing logos");
    for item in &mut data.items {
        // Get logo SVG
        let Ok(svg) = get_logo_svg(logos_source, &item.logo).await else {
            item.logo = String::new();
            continue;
        };

        // Remove SVG title if present
        let svg = SVG_TITLE.replace(&svg, "");

        // Calculate SVG file digest
        let digest = hex::encode(Sha256::digest(svg.as_bytes()));

        // Copy logo to output dir using the digest(+.svg) as filename
        let logo = format!("{digest}.svg");
        let mut file = File::create(output_dir.join(LOGOS_PATH).join(&logo))?;
        file.write_all(svg.as_bytes())?;

        // Update logo field in landscape entry (to digest)
        item.logo = format!("{LOGOS_PATH}/{logo}");
    }

    Ok(())
}

/// Collect some extra information for each of the items repositories from
/// GitHub.
#[instrument(skip_all, err)]
async fn collect_github_data(tokens: &Option<Vec<String>>, data: &mut Data) -> Result<()> {
    // Check tokens have been provided
    let Some(tokens) = tokens else {
        warn!("github tokens not provided: no information will be collected from github");
        return Ok(());
    };

    debug!("collecting repositories information from github (this may take a while)");

    // Setup GitHub API clients pool
    let mut gh_clients: Vec<DynGH> = vec![];
    for token in tokens {
        let gh = Box::new(github::GHApi::new(token)?);
        gh_clients.push(gh);
    }
    let gh_pool = Pool::from(gh_clients);

    // Collect urls of the repositories to process
    let mut urls = vec![];
    for item in &data.items {
        if let Some(repositories) = &item.repositories {
            for repo in repositories {
                urls.push(&repo.url);
            }
        }
    }
    urls.sort();
    urls.dedup();

    // Collect repositories information from GitHub
    let repositories_github_data: HashMap<String, github::Repository> = stream::iter(urls)
        .map(|url| async {
            let url = url.clone();
            let gh = gh_pool.get().await.expect("token -when available-");
            (url.clone(), github::Repository::new(gh, &url).await)
        })
        .buffer_unordered(tokens.len())
        .collect::<HashMap<String, Result<github::Repository>>>()
        .await
        .into_iter()
        .filter_map(|(url, result)| {
            if let Ok(github_data) = result {
                Some((url, github_data))
            } else {
                None
            }
        })
        .collect();

    // Enrich landscape items repositories with information collected from GH
    for item in &mut data.items {
        if item.repositories.is_some() {
            let mut repositories = vec![];
            for mut repo in item.repositories.clone().unwrap_or_default() {
                if let Some(github_data) = repositories_github_data.get(&repo.url) {
                    repo.github_data = Some(github_data.clone());
                }
                repositories.push(repo);
            }
            item.repositories = Some(repositories);
        }
    }

    Ok(())
}

/// Collect some extra information for each of the items organizations from
/// Crunchbase.
#[instrument(skip_all, err)]
async fn collect_crunchbase_data(api_key: &Option<String>, data: &mut Data) -> Result<()> {
    // Check API key has been provided
    let Some(api_key) = api_key else {
        warn!("crunchbase api key not provided: no information will be collected from crunchbase");
        return Ok(());
    };

    debug!("collecting organizations information from crunchbase (this may take a while)");

    // Setup Crunchbase API client
    let cb: DynCB = Arc::new(CBApi::new(api_key)?);

    // Collect items Crunchbase urls
    let mut urls = vec![];
    for item in &data.items {
        if let Some(url) = &item.crunchbase_url {
            urls.push(url);
        }
    }
    urls.sort();
    urls.dedup();

    // Collect information from Crunchbase
    let urls_stream = stream::iter(urls);
    let urls_stream_throttled = tokio_stream::StreamExt::throttle(urls_stream, Duration::from_millis(300));
    let orgs_crunchbase_data: HashMap<String, crunchbase::Organization> = urls_stream_throttled
        .map(|url| async {
            let cb = cb.clone();
            let url = url.clone();
            (url.clone(), crunchbase::Organization::new(cb, &url).await)
        })
        .buffer_unordered(1)
        .collect::<HashMap<String, Result<crunchbase::Organization>>>()
        .await
        .into_iter()
        .filter_map(|(url, result)| {
            if let Ok(crunchbase_data) = result {
                Some((url, crunchbase_data))
            } else {
                None
            }
        })
        .collect();

    // Enrich landscape items with information collected from Crunchbase
    for item in &mut data.items {
        if let Some(crunchbase_url) = item.crunchbase_url.as_ref() {
            if let Some(crunchbase_data) = orgs_crunchbase_data.get(crunchbase_url) {
                item.crunchbase_data = Some(crunchbase_data.clone());
            }
        }
    }

    Ok(())
}

/// Generate datasets from the landscape settings and data, as well as from the
/// data collected from external services (GitHub, Crunchbase, etc). Some of
/// the datasets will be embedded in the index document, and the rest will be
/// written to the DATASETS_PATH in the output directory.
#[instrument(skip_all, err)]
fn generate_datasets(settings: &Settings, data: &Data, output_dir: &Path) -> Result<Datasets> {
    debug!("generating datasets");
    let datasets = Datasets::new(settings, data)?;

    debug!("copying datasets to output directory");
    let mut base_file = File::create(output_dir.join(DATASETS_PATH).join("base.json"))?;
    base_file.write_all(&serde_json::to_vec(&datasets.base)?)?;
    let mut full_file = File::create(output_dir.join(DATASETS_PATH).join("full.json"))?;
    full_file.write_all(&serde_json::to_vec(&datasets.full)?)?;

    Ok(datasets)
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

/// Copy web assets files to the output directory.
#[instrument(skip_all, err)]
fn copy_web_assets(output_dir: &Path) -> Result<()> {
    for asset_path in WebAssets::iter() {
        if asset_path == "index.html" || asset_path == ".keep" {
            continue;
        }

        if let Some(embedded_file) = WebAssets::get(&asset_path) {
            debug!(?asset_path, "copying file");
            if let Some(parent_path) = Path::new(asset_path.as_ref()).parent() {
                create_dir_all(output_dir.join(parent_path))?;
            }
            let mut file = File::create(output_dir.join(asset_path.as_ref()))?;
            file.write_all(&embedded_file.data)?;
        }
    }

    Ok(())
}

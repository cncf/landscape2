//! This module defines the functionality of the build CLI subcommand.

use crate::{
    crunchbase::{self, CBApi, DynCB},
    data::{ItemFeatured, LandscapeData},
    datasets::Datasets,
    github::{self, DynGH},
    settings::Settings,
    tmpl, BuildArgs, Credentials, DataSource, LogosSource, SettingsSource,
};
use anyhow::{format_err, Result};
use askama::Template;
use chrono::Utc;
use deadpool::unmanaged::Pool;
use futures::stream::{self, StreamExt};
use lazy_static::lazy_static;
use leaky_bucket::RateLimiter;
use regex::Regex;
use reqwest::StatusCode;
use rust_embed::RustEmbed;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    fs::{self, File},
    io::Write,
    path::Path,
    sync::Arc,
    time::{Duration, Instant},
};
use tracing::{debug, error, info, instrument, warn};
use uuid::Uuid;

/// How long the data in the cache is valid (in days).
const CACHE_TTL: i64 = 7;

/// Path where the cache file will be written to inside the cache directory.
const CACHE_PATH: &str = "landscape";

/// Cache file used to store some data.
const CACHE_FILE: &str = "cached_data.json";

/// Path where the datasets will be written to in the output directory.
const DATASETS_PATH: &str = "data";

/// Path where the logos will be written to in the output directory.
const LOGOS_PATH: &str = "logos";

/// Type alias to represent some organizations Crunchbase data.
pub(crate) type CrunchbaseData = HashMap<String, crunchbase::Organization>;

/// Type alias to represent some repositories GitHub data.
pub(crate) type GithubData = HashMap<String, github::Repository>;

/// Embed web assets into binary.
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

    // Attach featured items information
    attach_featured_items_data(&mut landscape_data, &settings)?;

    // Prepare logos and copy them to the output directory
    prepare_logos(&args.logos_source, &mut landscape_data, &args.output_dir).await?;

    // Collect data from external services
    let cached_data = get_cached_data()?;
    let cb_cached_data = cached_data.as_ref().and_then(|c| c.crunchbase_data.as_ref());
    let gh_cached_data = cached_data.as_ref().and_then(|c| c.github_data.as_ref());
    let (crunchbase_data, github_data) = tokio::try_join!(
        collect_crunchbase_data(&credentials.crunchbase_api_key, &landscape_data, cb_cached_data),
        collect_github_data(&credentials.github_tokens, &landscape_data, gh_cached_data)
    )?;
    cache_data(CachedData {
        crunchbase_data: crunchbase_data.clone(),
        github_data: github_data.clone(),
    })?;

    // Attach data collected from external services to the landscape data
    if let Some(crunchbase_data) = crunchbase_data {
        attach_crunchbase_data(&mut landscape_data, crunchbase_data)?;
    }
    if let Some(github_data) = github_data {
        attach_github_data(&mut landscape_data, github_data)?;
    }

    // Attach items member subcategory.
    attach_member_subcategory(&mut landscape_data, &settings.members_category);

    // Generate datasets for web application
    let datasets = generate_datasets(&settings, &landscape_data, &args.output_dir)?;

    // Render index file and write it to the output directory
    render_index(&datasets, &args.output_dir)?;

    // Copy web assets files to the output directory
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

/// Get landscape data from the source provided.
#[instrument(skip_all, err)]
async fn get_landscape_data(src: &DataSource) -> Result<LandscapeData> {
    let data = if let Some(file) = &src.data_file {
        debug!(?file, "getting landscape data from file");
        LandscapeData::new_from_file(file)
    } else {
        debug!(url = ?src.data_url.as_ref().unwrap(), "getting landscape data from url");
        LandscapeData::new_from_url(src.data_url.as_ref().unwrap()).await
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

/// Attach featured items information.
#[instrument(skip_all, err)]
fn attach_featured_items_data(landscape_data: &mut LandscapeData, settings: &Settings) -> Result<()> {
    let Some(rules) = &settings.featured_items else {
        return Ok(());
    };

    for rule in rules {
        match rule.field.as_str() {
            "project" => {
                for item in &mut landscape_data.items {
                    if let Some(project) = item.project.as_ref() {
                        if let Some(option) = rule.options.iter().find(|o| o.value == *project) {
                            item.featured = Some(ItemFeatured {
                                order: option.order,
                                label: option.label.clone(),
                            });
                        }
                    }
                }
            }
            "subcategory" => {
                for item in &mut landscape_data.items {
                    if let Some(option) = rule.options.iter().find(|o| o.value == item.subcategory) {
                        item.featured = Some(ItemFeatured {
                            order: option.order,
                            label: option.label.clone(),
                        });
                    }
                }
            }
            _ => {}
        }
    }

    Ok(())
}

lazy_static! {
    /// Regular expression used to clean SVG logos' title.
    static ref SVG_TITLE: Regex = Regex::new("<title>.*</title>",).expect("exprs in SVG_TITLE to be valid");
}

/// Prepare logos and copy them to the output directory.
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
            let Ok(mut file) = File::create(output_dir.join(LOGOS_PATH).join(&logo)) else {
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

/// Represents some cached data, usually collected from external services.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct CachedData {
    #[serde(skip_serializing_if = "Option::is_none")]
    crunchbase_data: Option<CrunchbaseData>,

    #[serde(skip_serializing_if = "Option::is_none")]
    github_data: Option<GithubData>,
}

/// Read data from the local cache file if available.
#[instrument(skip_all, err)]
fn get_cached_data() -> Result<Option<CachedData>> {
    // Setup cache directory
    let Some(cache_dir) = dirs::cache_dir().map(|d| d.join(CACHE_PATH)) else {
        return Ok(None)
    };
    if !cache_dir.exists() {
        fs::create_dir_all(&cache_dir)?;
    }

    // Read data from cache file if available
    let cache_file = cache_dir.join(CACHE_FILE);
    if cache_file.exists() {
        let cached_data_json = fs::read(cache_file)?;
        let cached_data: CachedData = serde_json::from_slice(&cached_data_json)?;
        return Ok(Some(cached_data));
    }
    Ok(None)
}

/// Write data to local cache file.
#[instrument(skip_all, err)]
fn cache_data(cached_data: CachedData) -> Result<()> {
    // Setup cache directory
    let Some(cache_dir) = dirs::cache_dir().map(|d| d.join(CACHE_PATH)) else {
        return Ok(())
    };

    // Write data to cache file
    let mut cache_file = File::create(cache_dir.join(CACHE_FILE))?;
    cache_file.write_all(serde_json::to_vec_pretty(&cached_data)?.as_ref())?;

    Ok(())
}

/// Collect some extra information for each of the items organizations from
/// Crunchbase.
#[instrument(skip_all, err)]
async fn collect_crunchbase_data(
    api_key: &Option<String>,
    landscape_data: &LandscapeData,
    cached_data: Option<&CrunchbaseData>,
) -> Result<Option<CrunchbaseData>> {
    // Check API key has been provided
    let Some(api_key) = api_key else {
        warn!("crunchbase api key not provided: no information will be collected from crunchbase");
        return Ok(None);
    };

    debug!("collecting organizations information from crunchbase (this may take a while)");

    // Setup Crunchbase API client
    let cb: DynCB = Arc::new(CBApi::new(api_key)?);

    // Collect items Crunchbase urls
    let mut urls = vec![];
    for item in &landscape_data.items {
        if let Some(url) = &item.crunchbase_url {
            urls.push(url);
        }
    }
    urls.sort();
    urls.dedup();

    // Collect information from Crunchbase
    let limiter = RateLimiter::builder().initial(1).interval(Duration::from_millis(300)).build();
    let crunchbase_data: CrunchbaseData = stream::iter(urls)
        .map(|url| async {
            let url = url.clone();
            if let Some(cached_org) = cached_data.and_then(|cache| {
                cache.get(&url).and_then(|org| {
                    if org.generated_at + chrono::Duration::days(CACHE_TTL) > Utc::now() {
                        Some(org)
                    } else {
                        None
                    }
                })
            }) {
                // Use the cached data when available if it hasn't expired yet
                (url, Ok(cached_org.clone()))
            } else {
                // Otherwise we pull it from Crunchbase
                limiter.acquire_one().await;
                (url.clone(), crunchbase::Organization::new(cb.clone(), &url).await)
            }
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

    Ok(Some(crunchbase_data))
}

/// Collect some extra information for each of the items repositories from
/// GitHub.
#[instrument(skip_all, err)]
async fn collect_github_data(
    tokens: &Option<Vec<String>>,
    landscape_data: &LandscapeData,
    cached_data: Option<&GithubData>,
) -> Result<Option<GithubData>> {
    // Check tokens have been provided
    let Some(tokens) = tokens else {
        warn!("github tokens not provided: no information will be collected from github");
        return Ok(None);
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
    for item in &landscape_data.items {
        if let Some(repositories) = &item.repositories {
            for repo in repositories {
                urls.push(&repo.url);
            }
        }
    }
    urls.sort();
    urls.dedup();

    // Collect repositories information from GitHub
    let github_data: GithubData = stream::iter(urls)
        .map(|url| async {
            let url = url.clone();
            if let Some(cached_repo) = cached_data.and_then(|cache| {
                cache.get(&url).and_then(|repo| {
                    if repo.generated_at + chrono::Duration::days(CACHE_TTL) > Utc::now() {
                        Some(repo)
                    } else {
                        None
                    }
                })
            }) {
                // Use the cached data when available if it hasn't expired yet
                (url, Ok(cached_repo.clone()))
            } else {
                // Otherwise we pull it from GitHub
                let gh = gh_pool.get().await.expect("token -when available-");
                (url.clone(), github::Repository::new(gh, &url).await)
            }
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

    Ok(Some(github_data))
}

/// Attach Crunchbase data to the landscape data.
#[instrument(skip_all, err)]
fn attach_crunchbase_data(landscape_data: &mut LandscapeData, crunchbase_data: CrunchbaseData) -> Result<()> {
    for item in &mut landscape_data.items {
        if let Some(crunchbase_url) = item.crunchbase_url.as_ref() {
            if let Some(org_crunchbase_data) = crunchbase_data.get(crunchbase_url) {
                item.crunchbase_data = Some(org_crunchbase_data.clone());
            }
        }
    }
    Ok(())
}

/// Attach GitHub data to the landscape data.
#[instrument(skip_all, err)]
fn attach_github_data(landscape_data: &mut LandscapeData, github_data: GithubData) -> Result<()> {
    for item in &mut landscape_data.items {
        if item.repositories.is_some() {
            let mut repositories = vec![];
            for mut repo in item.repositories.clone().unwrap_or_default() {
                if let Some(repo_github_data) = github_data.get(&repo.url) {
                    repo.github_data = Some(repo_github_data.clone());
                }
                repositories.push(repo);
            }
            item.repositories = Some(repositories);
        }
    }
    Ok(())
}

/// Attach items member subcategory.
fn attach_member_subcategory(landscape_data: &mut LandscapeData, members_category: &Option<String>) {
    let Some(members_category) = members_category else {
        return;
    };

    // Create a map with the member subcategory for each Crunchbase url
    let mut members_subcategories: HashMap<String, String> = HashMap::new();
    for item in landscape_data.items.iter().filter(|i| &i.category == members_category) {
        if let Some(crunchbase_url) = &item.crunchbase_url {
            members_subcategories.insert(crunchbase_url.clone(), item.subcategory.clone());
        }
    }

    // Set item's member subcategory using the item's Crunchbase url to match
    for item in &mut landscape_data.items {
        if let Some(crunchbase_url) = &item.crunchbase_url {
            if let Some(member_subcategory) = members_subcategories.get(crunchbase_url) {
                item.member_subcategory = Some(member_subcategory.clone());
            }
        }
    }
}

/// Generate datasets from the landscape settings and data, as well as from the
/// data collected from external services (GitHub, Crunchbase, etc). Some of
/// the datasets will be embedded in the index document, and the rest will be
/// written to the DATASETS_PATH in the output directory.
#[instrument(skip_all, err)]
fn generate_datasets(
    settings: &Settings,
    landscape_data: &LandscapeData,
    output_dir: &Path,
) -> Result<Datasets> {
    debug!("generating datasets");
    let datasets = Datasets::new(settings, landscape_data)?;

    debug!("copying datasets to output directory");
    let datasets_path = output_dir.join(DATASETS_PATH);

    // Base
    let mut base_file = File::create(datasets_path.join("base.json"))?;
    base_file.write_all(&serde_json::to_vec(&datasets.base)?)?;

    // Landscape
    let mut landscape_file = File::create(datasets_path.join("landscape.json"))?;
    landscape_file.write_all(&serde_json::to_vec(&datasets.landscape)?)?;

    // Landscape items (each on one file)
    for item in &datasets.landscape.items {
        let mut item_file = File::create(datasets_path.join(format!("landscape-item-{}.json", item.id)))?;
        item_file.write_all(&serde_json::to_vec(&item)?)?;
    }

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
                fs::create_dir_all(output_dir.join(parent_path))?;
            }
            let mut file = File::create(output_dir.join(asset_path.as_ref()))?;
            file.write_all(&embedded_file.data)?;
        }
    }

    Ok(())
}

// Helper function to get the logo content from the corresponding source.
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

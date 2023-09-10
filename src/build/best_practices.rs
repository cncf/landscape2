//! This module defines some types used to represent the information collected
//! from the OpenSSF Best Practices program for each of the landscape items
//! (when available), as well as the functionality used to collect that info.

use super::cache::Cache;
use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{debug, instrument};

/// File used to cache best practices data.
const BEST_PRACTICES_CACHE_FILE: &str = "best_practices.json";

/// How long the best practices data in the cache is valid (in days).
const BEST_PRACTICES_CACHE_TTL: i64 = 7;

/// Get information for all the projects registered in the OpenSSF Best
/// Practices database.
#[instrument(skip_all, err)]
pub(crate) async fn collect_best_practices_data(cache: &Cache) -> Result<BestPracticesData> {
    debug!("collecting information from OpenSSF best practices (this may take a while)");

    // Try to get projects information from the cache (if available)
    if let Ok(Some(json_data)) = cache.read(BEST_PRACTICES_CACHE_FILE) {
        if let Ok(cached_data) = serde_json::from_slice::<CachedData>(&json_data) {
            if cached_data.generated_at + chrono::Duration::days(BEST_PRACTICES_CACHE_TTL) > Utc::now() {
                return Ok(cached_data.projects);
            }
        }
    };

    // Download all projects information
    let http_client = reqwest::Client::new();
    let mut projects = HashMap::new();
    let mut page = 1;
    loop {
        let url = format!("https://www.bestpractices.dev/en/projects.json?page={page}");
        let data = http_client.get(url).send().await?.text().await?;
        let page_projects: Vec<Project> = serde_json::from_str(&data)?;
        if page_projects.is_empty() {
            break;
        }
        projects.extend(
            page_projects.into_iter().map(|p| (p.repo_url.clone(), p)).collect::<BestPracticesData>(),
        );
        page += 1;
    }

    // Write data (in json format) to cache
    let cached_data = CachedData {
        generated_at: Utc::now(),
        projects,
    };
    cache.write(
        BEST_PRACTICES_CACHE_FILE,
        &serde_json::to_vec_pretty(&cached_data)?,
    )?;

    Ok(cached_data.projects)
}

/// Type alias to represent some projects best practices data.
pub(crate) type BestPracticesData = HashMap<RepositoryUrl, Project>;

/// Type alias to represent a repository url.
type RepositoryUrl = String;

/// Best practices project information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Project {
    id: u64,
    repo_url: String,
}

impl Project {
    /// Return project's url.
    pub(crate) fn url(&self) -> String {
        format!("https://www.bestpractices.dev/en/projects/{}", self.id)
    }
}

/// Best practices cached data.
#[derive(Serialize, Deserialize)]
struct CachedData {
    generated_at: DateTime<Utc>,
    projects: BestPracticesData,
}

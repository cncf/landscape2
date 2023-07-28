use crate::{crunchbase::CrunchbaseData, github::GithubData};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::{fs, io::Write};
use tracing::instrument;

/// Path where the cache file will be written to inside the cache directory.
const CACHE_PATH: &str = "landscape";

/// Cache file used to store data.
const CACHE_FILE: &str = "cached_data.json";

/// How long the Crunchbase data in the cache is valid (in days).
pub(crate) const CRUNCHBASE_CACHE_TTL: i64 = 7;

/// How long the GitHub data in the cache is valid (in days).
pub(crate) const GITHUB_CACHE_TTL: i64 = 7;

/// Represents some cached data, usually collected from external services.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct CachedData {
    pub crunchbase_data: CrunchbaseData,
    pub github_data: GithubData,
}

/// Read data from the local cache file if available.
#[instrument(skip_all, err)]
pub(crate) fn read() -> Result<Option<CachedData>> {
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
pub(crate) fn write(data: CachedData) -> Result<()> {
    // Setup cache directory
    let Some(cache_dir) = dirs::cache_dir().map(|d| d.join(CACHE_PATH)) else {
        return Ok(())
    };

    // Write data to cache file
    let mut cache_file = fs::File::create(cache_dir.join(CACHE_FILE))?;
    cache_file.write_all(serde_json::to_vec_pretty(&data)?.as_ref())?;

    Ok(())
}

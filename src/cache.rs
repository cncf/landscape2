use crate::{crunchbase::CrunchbaseData, github::GithubData};
use anyhow::{format_err, Result};
use serde::{Deserialize, Serialize};
use std::{fs, io::Write, path::PathBuf};
use tracing::instrument;

/// Path where the cache file will be written to inside the cache directory.
const CACHE_PATH: &str = "landscape";

/// Cache file used to store data.
const CACHE_FILE: &str = "cached_data.json";

/// Cache used to store data collected from external services.
#[derive(Debug, Clone, Default)]
pub(crate) struct Cache {
    pub cache_file_path: PathBuf,
}

impl Cache {
    /// Create a new Cache instance.
    pub(crate) fn new(cache_dir: &Option<PathBuf>) -> Result<Self> {
        // Try to use user's cache directory if no cache_dir has been provided
        let cache_dir = match cache_dir {
            Some(cache_dir) => Some(cache_dir.clone()),
            None => dirs::cache_dir(),
        };

        if let Some(mut cache_dir) = cache_dir {
            cache_dir = cache_dir.join(CACHE_PATH);
            if !cache_dir.exists() {
                fs::create_dir_all(&cache_dir)?;
            }
            Ok(Self {
                cache_file_path: cache_dir.join(CACHE_FILE),
            })
        } else {
            Err(format_err!(
                "error setting up cache: no cache directory provided and user's cache directory could not be found"
            ))
        }
    }

    /// Read data from the cache file if available.
    #[instrument(skip_all, err)]
    pub(crate) fn read(&self) -> Result<Option<CachedData>> {
        if self.cache_file_path.exists() {
            let cached_data_json = fs::read(&self.cache_file_path)?;
            let cached_data: CachedData = serde_json::from_slice(&cached_data_json)?;
            return Ok(Some(cached_data));
        }
        Ok(None)
    }

    /// Write provided data to cache file.
    #[instrument(skip_all, err)]
    pub(crate) fn write(&self, data: CachedData) -> Result<()> {
        let mut cache_file = fs::File::create(&self.cache_file_path)?;
        cache_file.write_all(serde_json::to_vec_pretty(&data)?.as_ref())?;
        Ok(())
    }
}

/// Represents some cached data, usually collected from external services.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct CachedData {
    pub crunchbase_data: CrunchbaseData,
    pub github_data: GithubData,
}

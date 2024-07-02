//! This module defines the cache used to cache files across builds.

use anyhow::{bail, Result};
use std::{fs, io::Write, path::PathBuf, time::SystemTime};
use tracing::instrument;

/// Path where the cache files will be written to inside the cache directory.
const CACHE_PATH: &str = "landscape";

/// Cache used to store data collected from external services.
#[derive(Debug, Clone, Default)]
pub(crate) struct Cache {
    cache_dir: PathBuf,
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
            return Ok(Self { cache_dir });
        }

        bail!(
            "error setting up cache: no cache directory provided and user's cache directory could not be found"
        );
    }

    /// Read data from the cache file provided if available.
    #[instrument(skip(self), err)]
    pub(crate) fn read(&self, file_name: &str) -> Result<Option<(Option<SystemTime>, Vec<u8>)>> {
        // Check if the path exists
        let path = self.cache_dir.join(file_name);
        if !path.exists() {
            return Ok(None);
        }

        // Get last modification time (if available)
        let md = fs::metadata(&path)?;
        let modified_at = md.modified().ok();

        Ok(Some((modified_at, fs::read(&path)?)))
    }

    /// Write provided data to cache file.
    #[instrument(skip(self, data), err)]
    pub(crate) fn write(&self, file_name: &str, data: &[u8]) -> Result<()> {
        let path = self.cache_dir.join(file_name);
        let mut file = fs::File::create(path)?;
        file.write_all(data)?;
        Ok(())
    }
}

use anyhow::{format_err, Result};
use std::{fs, io::Write, path::PathBuf};
use tracing::instrument;

/// Path where the cache files will be written to inside the cache directory.
const CACHE_PATH: &str = "landscape";

/// Cache used to store data collected from external services.
#[derive(Debug, Clone, Default)]
pub(crate) struct Cache {
    pub cache_dir: PathBuf,
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

        Err(format_err!(
            "error setting up cache: no cache directory provided and user's cache directory could not be found"
        ))
    }

    /// Read data from the cache file provided if available.
    #[instrument(skip_all, err)]
    pub(crate) fn read(&self, file_name: &str) -> Result<Option<Vec<u8>>> {
        let path = self.cache_dir.join(file_name);
        if !path.exists() {
            return Ok(None);
        }
        Ok(Some(fs::read(&path)?))
    }

    /// Write provided data to cache file.
    #[instrument(skip_all, err)]
    pub(crate) fn write(&self, file_name: &str, data: &[u8]) -> Result<()> {
        let path = self.cache_dir.join(file_name);
        let mut file = fs::File::create(path)?;
        file.write_all(data)?;
        Ok(())
    }
}

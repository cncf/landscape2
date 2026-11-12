//! This module defines the cache used to keep the data collected from external
//! services across builds.

use std::{
    collections::{BTreeMap, HashSet},
    fs,
    io::{ErrorKind, Read, Write},
    path::{Path, PathBuf},
    process,
    time::SystemTime,
};

use anyhow::{Context, Result, bail};
use chrono::{DateTime, TimeDelta, Utc};
use landscape2_core::data::{Organization, RepositoryGithubData};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::Value;
use tracing::{debug, instrument, warn};

/// Version of the format of the cache files that hold entries keyed by url.
pub(crate) const CACHE_FORMAT_VERSION: u32 = 1;

/// Maximum age of the cache entries the current build doesn't use. Older
/// entries are pruned when the cache file is written.
pub(crate) const CACHE_MAX_AGE: TimeDelta = TimeDelta::days(90);

/// Path where the cache files will be written to inside the cache directory.
const CACHE_PATH: &str = "landscape";

/// Cache used to store data collected from external services.
pub(crate) struct Cache {
    /// Directory where the cache files are stored.
    cache_dir: PathBuf,
}

impl Cache {
    /// Create a new Cache instance, using the `landscape` subdirectory of the
    /// cache directory provided or of the user's cache directory.
    pub(crate) fn new(cache_dir: Option<&Path>) -> Result<Self> {
        // Try to use user's cache directory if no cache_dir has been provided
        let Some(cache_dir) = cache_dir.map(Path::to_path_buf).or_else(dirs::cache_dir) else {
            bail!(
                "error setting up cache: no cache directory provided and user's cache directory could not be found"
            );
        };

        // Make sure the landscape subdirectory exists
        let cache_dir = cache_dir.join(CACHE_PATH);
        fs::create_dir_all(&cache_dir)
            .with_context(|| format!("error creating cache directory {}", cache_dir.display()))?;

        Ok(Self { cache_dir })
    }

    /// Remove the cache files whose name starts with the prefix and ends with
    /// the suffix provided, that are not in the used set and whose last
    /// modification is older than the maximum age provided.
    #[instrument(skip(self, used))]
    pub(crate) fn prune_files(
        &self,
        prefix: &str,
        suffix: &str,
        used: &HashSet<String>,
        max_age: TimeDelta,
    ) -> Result<()> {
        let now = Utc::now();
        for entry in fs::read_dir(&self.cache_dir)? {
            // Skip the files that don't match or that are in use
            let entry = entry?;
            let file_name = entry.file_name().to_string_lossy().to_string();
            if !file_name.starts_with(prefix) || !file_name.ends_with(suffix) || used.contains(&file_name) {
                continue;
            }

            // Remove the file if it hasn't been modified for too long
            let modified_at: DateTime<Utc> = entry.metadata()?.modified()?.into();
            if now - modified_at > max_age {
                fs::remove_file(entry.path())?;
                debug!(file_name, "removed expired cache file");
            }
        }
        Ok(())
    }

    /// Read data from the cache file provided if available, returning its last
    /// modification time (when available) along with its content.
    #[instrument(skip(self))]
    pub(crate) fn read(&self, file_name: &str) -> Result<Option<(Option<SystemTime>, Vec<u8>)>> {
        // Open the file, which may not exist yet
        let path = self.cache_dir.join(file_name);
        let mut file = match fs::File::open(&path) {
            Ok(file) => file,
            Err(err) if err.kind() == ErrorKind::NotFound => return Ok(None),
            Err(err) => return Err(err.into()),
        };

        // Read its content and last modification time (if available)
        let mut data = vec![];
        file.read_to_end(&mut data)?;
        let modified_at = file.metadata().and_then(|md| md.modified()).ok();

        Ok(Some((modified_at, data)))
    }

    /// Read the entries of the cache file provided.
    ///
    /// Both the versioned envelope and the legacy unversioned map are accepted.
    /// Each entry is parsed separately, so an invalid entry only drops itself.
    /// A missing, unreadable or corrupt file, or one in an unknown version,
    /// yields no entries.
    pub(crate) fn read_entries<T: DeserializeOwned>(&self, file_name: &str) -> BTreeMap<String, T> {
        // Read the cache file
        let data = match self.read(file_name) {
            Ok(Some((_, data))) => data,
            Ok(None) => return BTreeMap::new(),
            Err(err) => {
                warn!(%err, file_name, "error reading cache file, ignoring it");
                return BTreeMap::new();
            }
        };

        // Locate the raw entries, accepting the envelope at the current
        // version and the legacy unversioned map
        let raw_entries = match serde_json::from_slice::<serde_json::Map<String, Value>>(&data) {
            Ok(root) if root.contains_key("version") => {
                match serde_json::from_value::<CacheFile<Value>>(Value::Object(root)) {
                    Ok(cache_file) if cache_file.version == CACHE_FORMAT_VERSION => cache_file.entries,
                    Ok(cache_file) => {
                        warn!(
                            file_name,
                            version = cache_file.version,
                            "unsupported cache file version, ignoring it"
                        );
                        return BTreeMap::new();
                    }
                    Err(err) => {
                        warn!(%err, file_name, "error parsing cache file, ignoring it");
                        return BTreeMap::new();
                    }
                }
            }
            Ok(root) => {
                debug!(file_name, "migrating legacy unversioned cache file");
                root.into_iter().collect()
            }
            Err(err) => {
                warn!(%err, file_name, "error parsing cache file, ignoring it");
                return BTreeMap::new();
            }
        };

        // Parse each entry separately, dropping the invalid ones
        raw_entries
            .into_iter()
            .filter_map(|(url, raw_entry)| match serde_json::from_value(raw_entry) {
                Ok(entry) => Some((url, entry)),
                Err(err) => {
                    warn!(%err, file_name, %url, "error parsing cache entry, dropping it");
                    None
                }
            })
            .collect()
    }

    /// Write provided data to cache file.
    ///
    /// The data is written to a temporary file in the cache directory first,
    /// which is then renamed over the target, so readers never see a partially
    /// written file. The temporary file is removed if any step fails.
    #[instrument(skip(self, data))]
    pub(crate) fn write(&self, file_name: &str, data: &[u8]) -> Result<()> {
        // Write the data to a temporary file and move it over the target
        let path = self.cache_dir.join(file_name);
        let tmp_path = self.cache_dir.join(format!(".{file_name}.{}.tmp", process::id()));
        let result = write_and_rename(&tmp_path, &path, data);

        // Clean up the temporary file if something went wrong
        if result.is_err()
            && tmp_path.exists()
            && let Err(err) = fs::remove_file(&tmp_path)
        {
            warn!(%err, tmp_path = %tmp_path.display(), "error removing temporary cache file");
        }

        result
    }

    /// Write the entries provided to the cache file, using the versioned
    /// envelope format.
    pub(crate) fn write_entries<T: Serialize>(
        &self,
        file_name: &str,
        entries: BTreeMap<String, T>,
    ) -> Result<()> {
        let cache_file = CacheFile {
            entries,
            version: CACHE_FORMAT_VERSION,
        };
        self.write(file_name, &serde_json::to_vec_pretty(&cache_file)?)
    }
}

/// Entry stored in a versioned cache file.
pub(crate) trait CacheEntry {
    /// Returns the time the entry data was collected at.
    fn generated_at(&self) -> DateTime<Utc>;
}

/// Versioned envelope of the cache files that hold entries keyed by url.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub(crate) struct CacheFile<T> {
    /// Cached entries, keyed by url.
    pub entries: BTreeMap<String, T>,
    /// Version of the cache file format.
    pub version: u32,
}

impl CacheEntry for Organization {
    /// [`CacheEntry::generated_at`].
    fn generated_at(&self) -> DateTime<Utc> {
        self.generated_at
    }
}

impl CacheEntry for RepositoryGithubData {
    /// [`CacheEntry::generated_at`].
    fn generated_at(&self) -> DateTime<Utc> {
        self.generated_at
    }
}

/// Merge the entries used by the current build into the existing ones.
///
/// Used entries replace the existing ones. Existing entries not used by the
/// current build are kept unless they were generated more than `max_age` ago.
/// Used entries are never pruned, so stale data keeps being served during a
/// long outage of the external service.
pub(crate) fn merge_for_write<T: CacheEntry + Clone>(
    mut existing: BTreeMap<String, T>,
    used: &BTreeMap<String, T>,
    now: DateTime<Utc>,
    max_age: TimeDelta,
) -> BTreeMap<String, T> {
    existing.retain(|url, entry| used.contains_key(url) || now - entry.generated_at() <= max_age);
    existing.extend(used.iter().map(|(url, entry)| (url.clone(), entry.clone())));
    existing
}

/// Select the fresh cached entries for the urls provided.
///
/// Returns the entries generated less than `ttl` ago and the urls that have
/// no fresh entry (missing or expired).
pub(crate) fn select_cached<'a, T: CacheEntry + Clone>(
    cached: &BTreeMap<String, T>,
    urls: &[&'a str],
    now: DateTime<Utc>,
    ttl: TimeDelta,
) -> (BTreeMap<String, T>, Vec<&'a str>) {
    let mut fresh = BTreeMap::new();
    let mut misses = vec![];
    for &url in urls {
        match cached.get(url) {
            Some(entry) if entry.generated_at() + ttl > now => {
                fresh.insert(url.to_string(), entry.clone());
            }
            _ => misses.push(url),
        }
    }
    (fresh, misses)
}

/// Write the data provided to the temporary file, syncing it to disk, and
/// rename it over the target path.
fn write_and_rename(tmp_path: &Path, path: &Path, data: &[u8]) -> Result<()> {
    let mut file = fs::File::create(tmp_path)?;
    file.write_all(data)?;
    file.sync_all()?;
    fs::rename(tmp_path, path)?;
    Ok(())
}

#[cfg(test)]
mod tests;

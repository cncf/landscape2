//! This module provides the shared loader used to read the landscape sources
//! (data, games, guide and settings) from a local file or a url, and to parse
//! their YAML content reporting the unknown keys found as warnings.

use std::{collections::HashMap, fmt, fs, path::Path, time::Duration};

use anyhow::{Context, Result};
use serde::de::DeserializeOwned;
use tracing::{debug, warn};

/// Maximum time allowed to fetch a landscape source from a url.
pub const SOURCE_FETCH_TIMEOUT: Duration = Duration::from_secs(60);

/// Kind of landscape source.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceKind {
    /// Landscape data file (landscape.yml).
    Data,
    /// Landscape games file (games.yml).
    Games,
    /// Landscape guide file (guide.yml).
    Guide,
    /// Landscape settings file (settings.yml).
    Settings,
}

impl SourceKind {
    /// Returns the error context used when a source of this kind is not valid.
    pub(crate) fn invalid_file_context(self) -> String {
        format!("the landscape {self} file provided is not valid")
    }
}

impl fmt::Display for SourceKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let name = match self {
            SourceKind::Data => "data",
            SourceKind::Games => "games",
            SourceKind::Guide => "guide",
            SourceKind::Settings => "settings",
        };
        f.write_str(name)
    }
}

/// Value parsed from a landscape source, along with the warnings found while
/// parsing it.
#[derive(Debug, Clone, PartialEq)]
pub struct Parsed<T> {
    /// Value parsed from the source.
    pub value: T,
    /// Non-fatal issues found in the source, like unknown keys.
    pub warnings: Vec<String>,
}

impl<T> Parsed<T> {
    /// Logs each warning as coming from the source kind provided and returns
    /// the parsed value.
    pub(crate) fn into_value_logging_warnings(self, kind: SourceKind) -> T {
        for w in &self.warnings {
            warn!(kind = %kind, warning = %w, "landscape source warning");
        }
        self.value
    }
}

/// Parses the YAML content provided, reporting the unknown keys found as
/// warnings (one per distinct key pattern) instead of rejecting them.
pub(crate) fn parse_yaml<T: DeserializeOwned>(raw: &str) -> Result<Parsed<T>> {
    // Deserialize the content, tracking the keys ignored by the target type
    let mut unknown_keys: Vec<UnknownKey> = vec![];
    let mut unknown_keys_index: HashMap<String, usize> = HashMap::new();
    let value = serde_ignored::deserialize(serde_yaml::Deserializer::from_str(raw), |path| {
        let (pattern, location) = render_path(&path);
        if let Some(index) = unknown_keys_index.get(&pattern) {
            unknown_keys[*index].count += 1;
        } else {
            unknown_keys_index.insert(pattern.clone(), unknown_keys.len());
            unknown_keys.push(UnknownKey {
                count: 1,
                first_location: location,
                pattern,
            });
        }
    })
    .context("invalid yaml file")?;

    // Prepare one warning per unknown key pattern, in order of appearance
    let warnings = unknown_keys.iter().map(UnknownKey::warning).collect();

    Ok(Parsed { value, warnings })
}

/// Reads the raw content of a landscape source from the local file or the url
/// provided, in that order of preference. Returns `None` when neither is set.
///
/// # Errors
/// Returns an error if the file cannot be read, or if the url cannot be
/// fetched or responds with an error status.
pub async fn read_raw(kind: SourceKind, file: Option<&Path>, url: Option<&str>) -> Result<Option<String>> {
    // Read the source from the local file when provided
    if let Some(path) = file {
        debug!(%kind, ?path, "reading landscape source from file");
        let raw = fs::read_to_string(path)
            .with_context(|| format!("error reading {kind} file {}", path.display()))?;
        return Ok(Some(raw));
    }

    // Fetch the source from the url when provided
    if let Some(url) = url {
        debug!(%kind, url, "fetching landscape source from url");
        let raw = fetch(url).await.with_context(|| format!("error fetching {kind} file {url}"))?;
        return Ok(Some(raw));
    }

    Ok(None)
}

/// Unknown key found while parsing a YAML source.
struct UnknownKey {
    /// Number of times the key pattern was found.
    count: usize,
    /// Location of the first occurrence (e.g. `landscape.0.name`).
    first_location: String,
    /// Key pattern, with sequence indexes collapsed (e.g. `landscape[].name`).
    pattern: String,
}

impl UnknownKey {
    /// Returns the warning describing this unknown key.
    fn warning(&self) -> String {
        let Self {
            count,
            first_location,
            pattern,
        } = self;
        if *count == 1 {
            format!("unknown key `{pattern}` (found once, at {first_location})")
        } else {
            format!("unknown key `{pattern}` (found {count} times, first at {first_location})")
        }
    }
}

/// Fetches the content of the url provided, failing on error statuses.
async fn fetch(url: &str) -> Result<String> {
    let resp = reqwest::Client::new()
        .get(url)
        .timeout(SOURCE_FETCH_TIMEOUT)
        .send()
        .await?
        .error_for_status()?;
    let raw = resp.text().await?;

    Ok(raw)
}

/// Appends a segment to a dot separated path.
fn join_segment(base: &str, segment: &str) -> String {
    if base.is_empty() {
        segment.to_string()
    } else {
        format!("{base}.{segment}")
    }
}

/// Renders the key pattern and the location of the ignored path provided.
///
/// The path is walked instead of formatted, as its `Display` implementation
/// adds a `?` segment for every `Option`. In the pattern, sequence indexes are
/// collapsed into `[]` so that the same key in different entries is reported
/// once.
fn render_path(path: &serde_ignored::Path<'_>) -> (String, String) {
    match path {
        serde_ignored::Path::Root => (String::new(), String::new()),
        serde_ignored::Path::Seq { parent, index } => {
            let (pattern, location) = render_path(parent);
            (
                format!("{pattern}[]"),
                join_segment(&location, &index.to_string()),
            )
        }
        serde_ignored::Path::Map { parent, key } => {
            let (pattern, location) = render_path(parent);
            (join_segment(&pattern, key), join_segment(&location, key))
        }
        serde_ignored::Path::Some { parent }
        | serde_ignored::Path::NewtypeStruct { parent }
        | serde_ignored::Path::NewtypeVariant { parent } => render_path(parent),
    }
}

#[cfg(test)]
mod tests;

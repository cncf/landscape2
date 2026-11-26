//! This module provides the functionality to collect projects' reports
//! summaries from CLOMonitor (https://clomonitor.io).

use std::collections::HashSet;

use anyhow::{Context, Result, bail, format_err};
use chrono::{DateTime, TimeDelta, Utc};
use reqwest::StatusCode;
use tracing::warn;
use url::Url;

use super::cache::{CACHE_MAX_AGE, Cache};

/// CLOMonitor API base url.
pub(crate) const CLOMONITOR_API_URL: &str = "https://clomonitor.io/api";

/// Prefix of the names of the report summaries cache files.
const CLOMONITOR_CACHE_FILE_PREFIX: &str = "clomonitor_";

/// How long the CLOMonitor data in the cache is valid.
const CLOMONITOR_CACHE_TTL: TimeDelta = TimeDelta::days(7);

/// Foundations supported by CLOMonitor.
const SUPPORTED_FOUNDATIONS: [&str; 2] = ["cncf", "lfaidata"];

/// Fetch project's report summary in SVG format from CLOMonitor.
///
/// `foundation` must be lowercased. Project names containing `/`, `\` or
/// `..` are skipped, as they are used in file names. A fresh cached report
/// summary is used when available. If the fetch fails, an expired cached
/// report summary is used instead (when available).
pub(crate) async fn fetch_report_summary(
    cache: &Cache,
    http_client: &reqwest::Client,
    base_url: &str,
    foundation: &str,
    project_name: &str,
) -> Result<Option<Vec<u8>>> {
    // Check if the foundation provided is supported by CLOMonitor
    if !SUPPORTED_FOUNDATIONS.contains(&foundation) {
        return Ok(None);
    }

    // Skip project names that could escape the cache or output directories
    if project_name.contains(['/', '\\']) || project_name.contains("..") {
        warn!(
            project_name,
            "skipping clomonitor project name with path characters"
        );
        return Ok(None);
    }

    // Use cached report summary if available and not expired, keeping it as
    // a fallback otherwise
    let cache_file = report_summary_file_name(foundation, project_name);
    let cached_report_summary = cache.read(&cache_file).unwrap_or_else(|err| {
        warn!(%err, cache_file, "error reading cached report summary");
        None
    });
    let stale_report_summary = match cached_report_summary {
        Some((Some(modified_at), report_summary))
            if Utc::now() - CLOMONITOR_CACHE_TTL < DateTime::<Utc>::from(modified_at) =>
        {
            return Ok(Some(report_summary));
        }
        Some((_, report_summary)) => Some(report_summary),
        None => None,
    };

    // Fetch report summary from CLOMonitor, percent-encoding the project name
    let invalid_url = || format!("invalid clomonitor api url: {base_url}");
    let mut url = Url::parse(base_url).with_context(invalid_url)?;
    url.path_segments_mut().map_err(|()| format_err!(invalid_url()))?.pop_if_empty().extend([
        "projects",
        foundation,
        project_name,
        "report-summary",
    ]);
    match request_report_summary(http_client, url.as_str()).await {
        Ok(Some(report_summary)) => {
            if let Err(err) = cache.write(&cache_file, &report_summary) {
                warn!(%err, cache_file, "error caching report summary");
            }
            Ok(Some(report_summary))
        }
        Ok(None) => Ok(None),
        Err(err) => {
            // Fall back to the stale cached report summary when available
            if let Some(stale_report_summary) = stale_report_summary {
                warn!(%url, %err, "using stale cached report summary");
                return Ok(Some(stale_report_summary));
            }
            Err(err)
        }
    }
}

/// Remove the report summaries cache files not used by the projects provided
/// that have not been modified for longer than the cache maximum age.
///
/// `foundation` must be lowercased.
pub(crate) fn prune_cached_report_summaries<'a>(
    cache: &Cache,
    foundation: &str,
    project_names: impl Iterator<Item = &'a str>,
) -> Result<()> {
    let used: HashSet<String> = project_names
        .map(|project_name| report_summary_file_name(foundation, project_name))
        .collect();
    cache.prune_files(CLOMONITOR_CACHE_FILE_PREFIX, ".svg", &used, CACHE_MAX_AGE)
}

/// Return the file name of the project's report summary, used both in the
/// cache and in the output directory. `foundation` must be lowercased.
pub(crate) fn report_summary_file_name(foundation: &str, project_name: &str) -> String {
    format!("{CLOMONITOR_CACHE_FILE_PREFIX}{foundation}_{project_name}.svg")
}

/// Request the report summary from the url provided, returning `None` when
/// the project is not found.
async fn request_report_summary(http_client: &reqwest::Client, url: &str) -> Result<Option<Vec<u8>>> {
    let resp = http_client.get(url).send().await?;
    match resp.status() {
        StatusCode::OK => Ok(Some(resp.bytes().await?.to_vec())),
        StatusCode::NOT_FOUND => Ok(None),
        status => bail!("unexpected status code getting clomonitor report summary: {status}"),
    }
}

#[cfg(test)]
mod tests;

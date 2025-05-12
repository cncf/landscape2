//! This module provides the functionality to collect projects' reports
//! summaries from CLOMonitor (https://clomonitor.io).

use anyhow::{bail, Result};
use chrono::{DateTime, Utc};
use reqwest::StatusCode;

use super::cache::Cache;

/// How long the CLOMonitor data in the cache is valid (in days).
const CLOMONITOR_CACHE_TTL: i64 = 7;

/// Foundations supported by CLOMonitor.
const SUPPORTED_FOUNDATIONS: [&str; 2] = ["cncf", "lfaidata"];

/// Fetch project's report summary in SVG format from CLOMonitor.
pub(crate) async fn fetch_report_summary(
    cache: &Cache,
    http_client: reqwest::Client,
    foundation: &str,
    project_name: &str,
) -> Result<Option<Vec<u8>>> {
    // Check if the foundation provided is supported by CLOMonitor
    let foundation = foundation.to_lowercase();
    if !SUPPORTED_FOUNDATIONS.contains(&foundation.as_str()) {
        return Ok(None);
    }

    // Use cached report summary (if available and not expired)
    let cache_file = format!("clomonitor_{foundation}_{project_name}.svg");
    if let Ok(Some((Some(modified_at), cached_report_summary))) = cache.read(&cache_file) {
        let modified_at: DateTime<Utc> = modified_at.into();
        if Utc::now() - chrono::Duration::days(CLOMONITOR_CACHE_TTL) < modified_at {
            return Ok(Some(cached_report_summary));
        }
    }

    // Fetch report summary from CLOMonitor
    let url = format!("https://clomonitor.io/api/projects/{foundation}/{project_name}/report-summary");
    let resp = http_client.get(url).send().await?;
    match resp.status() {
        StatusCode::OK => {
            let report_summary = resp.bytes().await?.to_vec();
            cache.write(&cache_file, &report_summary)?;
            Ok(Some(report_summary))
        }
        StatusCode::NOT_FOUND => Ok(None),
        _ => bail!(
            "unexpected status code getting clomonitor report summary: {}",
            resp.status()
        ),
    }
}

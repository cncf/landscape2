use std::{
    fs::{self, File},
    time::SystemTime,
};

use pretty_assertions::assert_eq;
use tempfile::TempDir;

use super::*;

/// Name of the cache file of the report summary used in the tests.
const CACHE_FILE: &str = "clomonitor_cncf_artifact-hub.svg";

/// Path of the report summary of the project used in the tests.
const REPORT_SUMMARY_PATH: &str = "/projects/cncf/artifact-hub/report-summary";

#[tokio::test]
async fn test_fetch_report_summary_encodes_project_name_in_url() {
    // Setup server expectations
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", "/projects/cncf/my%20project%3F/report-summary")
        .with_status(200)
        .with_body("<svg>fetched</svg>")
        .expect(1)
        .create_async()
        .await;

    // Run the fetch
    let report_summary = fetch_report_summary(
        &cache,
        &reqwest::Client::new(),
        &server.url(),
        "cncf",
        "my project?",
    )
    .await
    .unwrap();

    // Check the report summary is fetched from the encoded url
    assert_eq!(report_summary, Some(b"<svg>fetched</svg>".to_vec()));
    mock.assert_async().await;
}

#[tokio::test]
async fn test_fetch_report_summary_fresh_cache_makes_no_request() {
    // Setup a fresh cached report summary
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    cache.write(CACHE_FILE, b"<svg>cached</svg>").unwrap();

    // Setup server expectations
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("GET", REPORT_SUMMARY_PATH).expect(0).create_async().await;

    // Run the fetch
    let report_summary = fetch_report_summary(
        &cache,
        &reqwest::Client::new(),
        &server.url(),
        "cncf",
        "artifact-hub",
    )
    .await
    .unwrap();

    // Check the cached report summary is returned without requests
    assert_eq!(report_summary, Some(b"<svg>cached</svg>".to_vec()));
    mock.assert_async().await;
}

#[tokio::test]
async fn test_fetch_report_summary_not_found_returns_none() {
    // Setup server expectations
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("GET", REPORT_SUMMARY_PATH).with_status(404).expect(1).create_async().await;

    // Run the fetch
    let report_summary = fetch_report_summary(
        &cache,
        &reqwest::Client::new(),
        &server.url(),
        "cncf",
        "artifact-hub",
    )
    .await
    .unwrap();

    // Check no report summary is returned or cached
    assert_eq!(report_summary, None);
    assert!(cache.read(CACHE_FILE).unwrap().is_none());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_fetch_report_summary_ok_writes_cache() {
    // Setup server expectations
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", REPORT_SUMMARY_PATH)
        .with_status(200)
        .with_body("<svg>fetched</svg>")
        .expect(1)
        .create_async()
        .await;

    // Run the fetch
    let report_summary = fetch_report_summary(
        &cache,
        &reqwest::Client::new(),
        &server.url(),
        "cncf",
        "artifact-hub",
    )
    .await
    .unwrap();

    // Check the fetched report summary is returned and cached
    assert_eq!(report_summary, Some(b"<svg>fetched</svg>".to_vec()));
    assert_eq!(cache.read(CACHE_FILE).unwrap().unwrap().1, b"<svg>fetched</svg>");
    mock.assert_async().await;
}

#[tokio::test]
async fn test_fetch_report_summary_path_characters_return_none() {
    // Setup server expectations
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("GET", mockito::Matcher::Any).expect(0).create_async().await;

    for project_name in ["a/b", "a\\b", "..", "a..b"] {
        // Run the fetch
        let report_summary = fetch_report_summary(
            &cache,
            &reqwest::Client::new(),
            &server.url(),
            "cncf",
            project_name,
        )
        .await
        .unwrap();

        // Check the project is skipped without requests
        assert_eq!(report_summary, None, "project name: {project_name}");
    }
    mock.assert_async().await;
}

#[tokio::test]
async fn test_fetch_report_summary_server_error_returns_stale_cache() {
    // Setup an expired cached report summary
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    cache.write(CACHE_FILE, b"<svg>stale</svg>").unwrap();
    let cache_file_path = tmp_dir.path().join("landscape").join(CACHE_FILE);
    File::options()
        .write(true)
        .open(&cache_file_path)
        .unwrap()
        .set_modified(SystemTime::from(Utc::now() - TimeDelta::days(8)))
        .unwrap();

    // Setup server expectations
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("GET", REPORT_SUMMARY_PATH).with_status(500).expect(1).create_async().await;

    // Run the fetch
    let report_summary = fetch_report_summary(
        &cache,
        &reqwest::Client::new(),
        &server.url(),
        "cncf",
        "artifact-hub",
    )
    .await
    .unwrap();

    // Check the stale report summary is returned and kept in the cache
    assert_eq!(report_summary, Some(b"<svg>stale</svg>".to_vec()));
    assert_eq!(fs::read(&cache_file_path).unwrap(), b"<svg>stale</svg>");
    mock.assert_async().await;
}

#[tokio::test]
async fn test_fetch_report_summary_unsupported_foundation_returns_none() {
    // Setup server expectations
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("GET", mockito::Matcher::Any).expect(0).create_async().await;

    // Run the fetch
    let report_summary = fetch_report_summary(
        &cache,
        &reqwest::Client::new(),
        &server.url(),
        "other",
        "artifact-hub",
    )
    .await
    .unwrap();

    // Check no report summary is returned and no requests are made
    assert_eq!(report_summary, None);
    mock.assert_async().await;
}

#[test]
fn test_prune_cached_report_summaries_removes_only_unused_expired_files() {
    // Setup expired report summaries, one of them for a project in use
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let expired = SystemTime::from(Utc::now() - TimeDelta::days(91));
    for file_name in ["clomonitor_cncf_artifact-hub.svg", "clomonitor_cncf_removed.svg"] {
        let path = tmp_dir.path().join("landscape").join(file_name);
        fs::write(&path, b"<svg/>").unwrap();
        File::options().write(true).open(&path).unwrap().set_modified(expired).unwrap();
    }

    // Run the pruning
    prune_cached_report_summaries(&cache, "cncf", ["artifact-hub"].into_iter()).unwrap();

    // Check only the report summary of the project in use is kept
    let mut file_names: Vec<String> = fs::read_dir(tmp_dir.path().join("landscape"))
        .unwrap()
        .map(|entry| entry.unwrap().file_name().to_string_lossy().to_string())
        .collect();
    file_names.sort();
    assert_eq!(file_names, vec![CACHE_FILE]);
}

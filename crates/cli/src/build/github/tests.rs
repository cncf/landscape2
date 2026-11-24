use std::{fs, path::Path};

use chrono::{TimeDelta, TimeZone};
use landscape2_core::data::{Item, Repository};
use mockito::{Matcher, ServerGuard};
use pretty_assertions::assert_eq;
use serde_json::{Value, json};
use tempfile::TempDir;

use super::*;
use crate::build::tests::capture_logs;

/// Url of a repository that belongs to another landscape.
const OTHER_REPO_URL: &str = "https://github.com/other/item";

/// Url of the repository used in most tests.
const REPO_URL: &str = "https://github.com/example/item-1";

#[tokio::test]
async fn test_collect_github_data_cache_write_failure_returns_data() {
    // Setup a cache whose directory is replaced by a regular file
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let cache_dir = tmp_dir.path().join("landscape");
    fs::remove_dir(&cache_dir).unwrap();
    fs::write(&cache_dir, "not a directory").unwrap();

    // Setup client expectations
    let mut gh = MockGH::new();
    expect_repository_fetch(&mut gh, "example", "item-1", "main");

    // Run the collection
    let github_data =
        collect_github_data_with(&cache, &landscape_data(&[REPO_URL]), Some(pool(gh)), now()).await;

    // Check the fetched data is returned
    assert_eq!(github_data.keys().collect::<Vec<_>>(), vec![REPO_URL]);
    assert_eq!(github_data[REPO_URL].description, "Fetched description");
}

#[tokio::test]
async fn test_collect_github_data_expired_entry_refetches() {
    // Setup cache with an expired entry
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    write_cache_entries(
        tmp_dir.path(),
        &json!({ REPO_URL: repository_data(now() - TimeDelta::days(8)) }),
    );

    // Setup client expectations
    let mut gh = MockGH::new();
    expect_repository_fetch(&mut gh, "example", "item-1", "main");

    // Run the collection
    let github_data =
        collect_github_data_with(&cache, &landscape_data(&[REPO_URL]), Some(pool(gh)), now()).await;

    // Check the refetched data is returned and cached
    assert_eq!(github_data[REPO_URL].description, "Fetched description");
    assert_eq!(
        read_cache_file(tmp_dir.path())["entries"][REPO_URL]["description"],
        "Fetched description"
    );
}

#[tokio::test]
async fn test_collect_github_data_fresh_entry_makes_no_calls() {
    // Setup cache with a fresh entry
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let cached_repo = repository_data(now() - TimeDelta::days(1));
    write_cache_entries(tmp_dir.path(), &json!({ REPO_URL: cached_repo }));

    // Setup client expectations
    let mut gh = MockGH::new();
    gh.expect_get_repository().never();

    // Run the collection
    let github_data =
        collect_github_data_with(&cache, &landscape_data(&[REPO_URL]), Some(pool(gh)), now()).await;

    // Check the cached entry is returned
    assert_eq!(github_data, BTreeMap::from([(REPO_URL.to_string(), cached_repo)]));
}

#[tokio::test]
async fn test_collect_github_data_git_url_resolves_repository() {
    // Setup cache and client expectations
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let mut gh = MockGH::new();
    expect_repository_fetch(&mut gh, "example", "item-1", "main");

    // Run the collection for a repository url ending in .git
    let git_url = "https://github.com/example/item-1.git";
    let github_data =
        collect_github_data_with(&cache, &landscape_data(&[git_url]), Some(pool(gh)), now()).await;

    // Check the data is collected without the suffix and keyed by the url
    assert_eq!(github_data.keys().collect::<Vec<_>>(), vec![git_url]);
    assert_eq!(
        github_data[git_url].contributors.url,
        "https://github.com/example/item-1/graphs/contributors"
    );
}

#[tokio::test]
async fn test_collect_github_data_no_client_keeps_stale_entry() {
    // Setup cache with an expired entry
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let stale_repo = repository_data(now() - TimeDelta::days(30));
    write_cache_entries(tmp_dir.path(), &json!({ REPO_URL: stale_repo }));

    // Run the collection without a client
    let github_data = collect_github_data_with(&cache, &landscape_data(&[REPO_URL]), None, now()).await;

    // Check the stale entry is returned
    assert_eq!(github_data, BTreeMap::from([(REPO_URL.to_string(), stale_repo)]));
}

#[tokio::test]
async fn test_collect_github_data_no_client_logs_only_summaries() {
    // Setup cache with an expired entry
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    write_cache_entries(
        tmp_dir.path(),
        &json!({ REPO_URL: repository_data(now() - TimeDelta::days(30)) }),
    );

    // Run the collection without a client, for that repository and another
    // one without cached data
    let landscape_data = landscape_data(&[REPO_URL, OTHER_REPO_URL]);
    let (_, logs) = capture_logs(collect_github_data_with(&cache, &landscape_data, None, now())).await;

    // Check the repositories are not reported one by one, but counted
    assert!(!logs.contains("using stale cached data"), "{logs}");
    assert!(
        !logs.contains("no github data available for repository"),
        "{logs}"
    );
    assert!(
        logs.contains("no github data available for some repositories missing_count=1"),
        "{logs}"
    );
    assert!(
        logs.contains("stale cached github data used for some repositories stale_count=1"),
        "{logs}"
    );
}

#[tokio::test]
async fn test_collect_github_data_no_fetch_does_not_overwrite_unreadable_cache() {
    // Setup an unreadable cache file
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let cache_file = tmp_dir.path().join("landscape").join(GITHUB_CACHE_FILE);
    fs::write(&cache_file, r#"{"version": 1, "entries": {"#).unwrap();

    // Run the collection without a client
    let github_data = collect_github_data_with(&cache, &landscape_data(&[REPO_URL]), None, now()).await;

    // Check no data is returned and the cache file is left untouched
    assert!(github_data.is_empty());
    assert_eq!(
        fs::read_to_string(&cache_file).unwrap(),
        r#"{"version": 1, "entries": {"#
    );
}

#[tokio::test]
async fn test_collect_github_data_preserves_other_landscapes_entries_on_write() {
    // Setup cache with an expired entry and a recent one from another landscape
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let other_repo = repository_data(now() - TimeDelta::days(10));
    write_cache_entries(
        tmp_dir.path(),
        &json!({
            OTHER_REPO_URL: other_repo,
            REPO_URL: repository_data(now() - TimeDelta::days(8)),
        }),
    );

    // Setup client expectations
    let mut gh = MockGH::new();
    expect_repository_fetch(&mut gh, "example", "item-1", "main");

    // Run the collection
    collect_github_data_with(&cache, &landscape_data(&[REPO_URL]), Some(pool(gh)), now()).await;

    // Check the cache file keeps the other landscape entry next to the new one
    let cache_file = read_cache_file(tmp_dir.path());
    assert_eq!(cache_file["version"], 1);
    assert_eq!(
        cache_file["entries"][OTHER_REPO_URL],
        serde_json::to_value(&other_repo).unwrap()
    );
    assert_eq!(
        cache_file["entries"][REPO_URL]["description"],
        "Fetched description"
    );
}

#[tokio::test]
async fn test_collect_github_data_refresh_failure_keeps_stale_entry() {
    // Setup cache with an expired entry
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let stale_repo = repository_data(now() - TimeDelta::days(8));
    write_cache_entries(tmp_dir.path(), &json!({ REPO_URL: stale_repo }));

    // Setup client expectations
    let mut gh = MockGH::new();
    gh.expect_get_repository()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Err(format_err!("rate limit exceeded")));

    // Run the collection
    let github_data =
        collect_github_data_with(&cache, &landscape_data(&[REPO_URL]), Some(pool(gh)), now()).await;

    // Check the stale entry is returned
    assert_eq!(github_data, BTreeMap::from([(REPO_URL.to_string(), stale_repo)]));
}

#[tokio::test]
async fn test_collect_github_data_refresh_failure_logs_error_cause() {
    // Setup cache with an expired entry
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    write_cache_entries(
        tmp_dir.path(),
        &json!({ REPO_URL: repository_data(now() - TimeDelta::days(8)) }),
    );

    // Setup client expectations
    let mut gh = MockGH::new();
    gh.expect_get_repository()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Err(format_err!("connection refused").context("request failed")));
    gh.expect_get_repository()
        .times(1)
        .withf(|owner, repo| owner == "other" && repo == "item")
        .returning(|_, _| Err(format_err!("connection refused").context("request failed")));

    // Run the collection for that repository and another one without cached
    // data
    let landscape_data = landscape_data(&[REPO_URL, OTHER_REPO_URL]);
    let (_, logs) = capture_logs(collect_github_data_with(
        &cache,
        &landscape_data,
        Some(pool(gh)),
        now(),
    ))
    .await;

    // Check both repositories are reported along with the cause of the error
    assert!(
        logs.contains(&format!(
            "using stale cached data url={REPO_URL} err=request failed: connection refused"
        )),
        "{logs}"
    );
    assert!(
        logs.contains(&format!(
            "no github data available for repository url={OTHER_REPO_URL} err=request failed: connection refused"
        )),
        "{logs}"
    );
}

#[tokio::test]
async fn test_collect_github_data_returns_only_current_urls() {
    // Setup cache with fresh entries for this landscape and another one
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    write_cache_entries(
        tmp_dir.path(),
        &json!({
            OTHER_REPO_URL: repository_data(now() - TimeDelta::days(1)),
            REPO_URL: repository_data(now() - TimeDelta::days(1)),
        }),
    );

    // Run the collection without a client
    let github_data = collect_github_data_with(&cache, &landscape_data(&[REPO_URL]), None, now()).await;

    // Check only the landscape repository is returned
    assert_eq!(github_data.keys().collect::<Vec<_>>(), vec![REPO_URL]);
}

#[tokio::test]
async fn test_collect_github_data_uses_first_declared_branch() {
    // Setup a landscape where the same repository is declared without a
    // branch first and then with two different branches
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let mut landscape_data = landscape_data(&[REPO_URL, REPO_URL, REPO_URL]);
    landscape_data.items[1].repositories.as_mut().unwrap()[0].branch = Some("dev".to_string());
    landscape_data.items[2].repositories.as_mut().unwrap()[0].branch = Some("other".to_string());

    // Setup client expectations
    let mut gh = MockGH::new();
    expect_repository_fetch(&mut gh, "example", "item-1", "dev");

    // Run the collection
    let github_data = collect_github_data_with(&cache, &landscape_data, Some(pool(gh)), now()).await;

    // Check the repository is collected once
    assert_eq!(github_data.keys().collect::<Vec<_>>(), vec![REPO_URL]);
}

#[tokio::test]
async fn test_collect_repository_data_contributors_unavailable_keeps_previous_count() {
    // Setup client expectations
    let mut gh = MockGH::new();
    gh.expect_get_repository()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Ok(full_repository()));
    expect_repository_fetch_with(&mut gh, "main", Ok(None), Ok(Some(vec![1, 2])));

    // Run the collection with some previous data
    let previous = repository_data(now() - TimeDelta::days(8));
    let repository_data = collect_repository_data(&gh, REPO_URL, None, Some(&previous), now()).await.unwrap();

    // Check the previous contributors count is kept
    assert_eq!(repository_data.contributors.count, 3);
    assert_eq!(repository_data.generated_at, now());
}

#[tokio::test]
async fn test_collect_repository_data_invalid_url_makes_no_calls() {
    // Setup client expectations
    let mut gh = MockGH::new();
    gh.expect_get_repository().never();

    // Run the collection
    let err = collect_repository_data(&gh, "https://gitlab.com/example/item-1", None, None, now())
        .await
        .unwrap_err();

    // Check the url is rejected
    assert_eq!(format!("{err:#}"), "invalid repository url");
}

#[tokio::test]
async fn test_collect_repository_data_maps_all_fields() {
    // Setup client expectations
    let mut gh = MockGH::new();
    gh.expect_get_repository()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| {
            Ok(serde_json::from_value(json!({
                "default_branch": "main",
                "description": "Fetched description",
                "html_url": REPO_URL,
                "license": {
                    "key": "apache-2.0",
                    "name": "Apache License 2.0",
                    "spdx_id": "Apache-2.0",
                },
                "stargazers_count": 100,
                "topics": ["cloud", "native"],
            }))
            .unwrap())
        });
    gh.expect_get_contributors_count()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Ok(Some(5)));
    gh.expect_get_first_commit()
        .times(1)
        .withf(|owner, repo, ref_| owner == "example" && repo == "item-1" && ref_ == "main")
        .returning(|_, _, _| Ok(Some(commit("1", Some(now() - TimeDelta::days(365))))));
    gh.expect_get_languages()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Ok(Some(BTreeMap::from([("Rust".to_string(), 1000)]))));
    gh.expect_get_latest_commit()
        .times(1)
        .withf(|owner, repo, ref_| owner == "example" && repo == "item-1" && ref_ == "main")
        .returning(|_, _, _| Ok(commit("2", Some(now() - TimeDelta::days(1)))));
    gh.expect_get_latest_release()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| {
            Ok(Some(Release {
                url: "https://github.com/example/item-1/releases/tag/v1.0.0".to_string(),
                ts: Some(now() - TimeDelta::days(30)),
            }))
        });
    gh.expect_get_participation_stats()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Ok(Some(vec![1, 2])));

    // Run the collection
    let repository_data = collect_repository_data(&gh, REPO_URL, None, None, now()).await.unwrap();

    // Check all fields are mapped
    assert_eq!(
        repository_data,
        RepositoryGithubData {
            contributors: Contributors {
                count: 5,
                url: "https://github.com/example/item-1/graphs/contributors".to_string(),
            },
            description: "Fetched description".to_string(),
            generated_at: now(),
            latest_commit: commit("2", Some(now() - TimeDelta::days(1))),
            participation_stats: vec![1, 2],
            stars: 100,
            url: REPO_URL.to_string(),

            first_commit: Some(commit("1", Some(now() - TimeDelta::days(365)))),
            languages: Some(BTreeMap::from([("Rust".to_string(), 1000)])),
            latest_release: Some(Release {
                url: "https://github.com/example/item-1/releases/tag/v1.0.0".to_string(),
                ts: Some(now() - TimeDelta::days(30)),
            }),
            license: Some("Apache License 2.0".to_string()),
            topics: vec!["cloud".to_string(), "native".to_string()],
        }
    );
}

#[tokio::test]
async fn test_collect_repository_data_participation_not_ready_stores_expired_entry() {
    // Setup client expectations for two collections
    let mut gh = MockGH::new();
    gh.expect_get_repository()
        .times(2)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Ok(full_repository()));
    gh.expect_get_contributors_count()
        .times(2)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Ok(Some(5)));
    gh.expect_get_first_commit()
        .times(2)
        .withf(|owner, repo, ref_| owner == "example" && repo == "item-1" && ref_ == "main")
        .returning(|_, _, _| Ok(None));
    gh.expect_get_languages()
        .times(2)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Ok(None));
    gh.expect_get_latest_commit()
        .times(2)
        .withf(|owner, repo, ref_| owner == "example" && repo == "item-1" && ref_ == "main")
        .returning(|_, _, _| Ok(commit("2", None)));
    gh.expect_get_latest_release()
        .times(2)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Ok(None));
    gh.expect_get_participation_stats()
        .times(2)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Ok(None));

    // Run the collection with some previous data
    let previous = repository_data(now() - TimeDelta::days(8));
    let with_previous = collect_repository_data(&gh, REPO_URL, None, Some(&previous), now()).await.unwrap();

    // Check the previous stats are reused and the entry is already expired
    assert_eq!(with_previous.participation_stats, vec![1, 0]);
    assert_eq!(with_previous.generated_at, now() - GITHUB_CACHE_TTL);

    // Run the collection without previous data
    let without_previous = collect_repository_data(&gh, REPO_URL, None, None, now()).await.unwrap();

    // Check the stats are empty and the entry is already expired
    assert_eq!(without_previous.participation_stats, Vec::<i64>::new());
    assert_eq!(without_previous.generated_at, now() - GITHUB_CACHE_TTL);
}

#[tokio::test]
async fn test_collect_repository_data_repository_error_skips_later_calls() {
    // Setup client expectations
    let mut gh = MockGH::new();
    gh.expect_get_repository()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Err(format_err!("repository not found")));
    gh.expect_get_contributors_count().never();
    gh.expect_get_first_commit().never();
    gh.expect_get_languages().never();
    gh.expect_get_latest_commit().never();
    gh.expect_get_latest_release().never();
    gh.expect_get_participation_stats().never();

    // Run the collection
    let err = collect_repository_data(&gh, REPO_URL, None, None, now()).await.unwrap_err();

    // Check the repository error is returned
    assert_eq!(format!("{err:#}"), "repository not found");
}

#[tokio::test]
async fn test_collect_repository_data_unidentified_license_is_other() {
    // Setup client expectations returning a license GitHub could not identify
    let mut gh = MockGH::new();
    gh.expect_get_repository()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| {
            Ok(serde_json::from_value(json!({
                "default_branch": "main",
                "html_url": REPO_URL,
                "license": {
                    "key": "other",
                    "name": "Other",
                    "spdx_id": "NOASSERTION",
                },
            }))
            .unwrap())
        });
    expect_repository_fetch_with(&mut gh, "main", Ok(Some(5)), Ok(Some(vec![1, 2])));

    // Run the collection
    let repository_data = collect_repository_data(&gh, REPO_URL, None, None, now()).await.unwrap();

    // Check the license is collected with the name GitHub gives it
    assert_eq!(repository_data.license, Some("Other".to_string()));
}

#[tokio::test]
async fn test_collect_repository_data_uses_configured_branch() {
    // Setup client expectations (the default branch is main)
    let mut gh = MockGH::new();
    gh.expect_get_repository()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Ok(full_repository()));
    expect_repository_fetch_with(&mut gh, "dev", Ok(Some(5)), Ok(Some(vec![1, 2])));

    // Run the collection
    let repository_data = collect_repository_data(&gh, REPO_URL, Some("dev"), None, now()).await.unwrap();

    // Check the commits are collected from the configured branch
    assert_eq!(repository_data.latest_commit, commit("2", None));
}

#[tokio::test]
async fn test_ghapi_contributors_head_server_error_returns_error() {
    // Setup server expectations
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("HEAD", "/repos/example/item-1/contributors")
        .match_query(Matcher::Any)
        .with_status(500)
        .with_header("link", &last_page_link(&server, "contributors", 42))
        .expect(1)
        .create_async()
        .await;

    // Run the request
    let err = ghapi(&server).get_contributors_count("example", "item-1").await.unwrap_err();

    // Check the server error is returned
    assert_eq!(
        format!("{err:#}"),
        format!(
            "HTTP status server error (500 Internal Server Error) for url ({}/repos/example/item-1/contributors?anon=true&per_page=1)",
            server.url()
        )
    );
    mock.assert_async().await;
}

#[tokio::test]
async fn test_ghapi_contributors_no_content_returns_zero() {
    // Setup server expectations
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("HEAD", "/repos/example/item-1/contributors")
        .match_query(Matcher::AllOf(vec![
            Matcher::UrlEncoded("anon".to_string(), "true".to_string()),
            Matcher::UrlEncoded("per_page".to_string(), "1".to_string()),
        ]))
        .match_header("authorization", "Bearer token")
        .with_status(204)
        .expect(1)
        .create_async()
        .await;

    // Run the request
    let count = ghapi(&server).get_contributors_count("example", "item-1").await.unwrap();

    // Check the repository has no contributors
    assert_eq!(count, Some(0));
    mock.assert_async().await;
}

#[tokio::test]
async fn test_ghapi_first_commit_head_error_returns_error() {
    // Setup server expectations
    let mut server = mockito::Server::new_async().await;
    let head_mock = server
        .mock("HEAD", "/repos/example/item-1/commits")
        .match_query(Matcher::Any)
        .with_status(403)
        .expect(1)
        .create_async()
        .await;
    let list_mock = server
        .mock("GET", "/repos/example/item-1/commits")
        .match_query(Matcher::Any)
        .with_header("content-type", "application/json")
        .with_body(json!([commit_data("2024-01-01T00:00:00Z")]).to_string())
        .expect(0)
        .create_async()
        .await;

    // Run the request
    let err = ghapi(&server).get_first_commit("example", "item-1", "main").await.unwrap_err();

    // Check the error is returned without listing the commits
    assert_eq!(
        format!("{err:#}"),
        format!(
            "HTTP status client error (403 Forbidden) for url ({}/repos/example/item-1/commits?per_page=1&sha=main)",
            server.url()
        )
    );
    head_mock.assert_async().await;
    list_mock.assert_async().await;
}

#[tokio::test]
async fn test_ghapi_languages_error_status_returns_error() {
    // Setup server expectations
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", "/repos/example/item-1/languages")
        .with_status(500)
        .with_header("content-type", "application/json")
        .with_body("{}")
        .expect(1)
        .create_async()
        .await;

    // Run the request
    let err = ghapi(&server).get_languages("example", "item-1").await.unwrap_err();

    // Check the server error is returned
    assert_eq!(
        format!("{err:#}"),
        format!(
            "HTTP status server error (500 Internal Server Error) for url ({}/repos/example/item-1/languages)",
            server.url()
        )
    );
    mock.assert_async().await;
}

#[tokio::test]
async fn test_ghapi_latest_release_not_found_returns_none() {
    // Setup server expectations
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", "/repos/example/item-1/releases/latest")
        .with_status(404)
        .with_header("content-type", "application/json")
        .with_body(r#"{"message": "Not Found"}"#)
        .expect(1)
        .create_async()
        .await;

    // Run the request
    let latest_release = ghapi(&server).get_latest_release("example", "item-1").await.unwrap();

    // Check no release is returned
    assert_eq!(latest_release, None);
    mock.assert_async().await;
}

#[test]
fn test_ghapi_new_token_with_newline_returns_error() {
    let err = GHApi::new("token\nvalue", test_config("http://127.0.0.1")).map(|_| ()).unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "invalid GITHUB_TOKENS entry: failed to parse header value"
    );
}

#[tokio::test]
async fn test_ghapi_participation_accepted_then_ok_returns_stats() {
    // Setup server expectations
    let mut server = mockito::Server::new_async().await;
    let accepted_mock = server
        .mock("GET", "/repos/example/item-1/stats/participation")
        .with_status(202)
        .with_header("content-type", "application/json")
        .with_body("{}")
        .expect(1)
        .create_async()
        .await;
    let ok_mock = server
        .mock("GET", "/repos/example/item-1/stats/participation")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(json!({ "all": [3, 4], "owner": [0, 1] }).to_string())
        .expect(1)
        .create_async()
        .await;

    // Run the request
    let participation_stats = ghapi(&server).get_participation_stats("example", "item-1").await.unwrap();

    // Check the stats are returned once computed
    assert_eq!(participation_stats, Some(vec![3, 4]));
    accepted_mock.assert_async().await;
    ok_mock.assert_async().await;
}

#[tokio::test]
async fn test_ghapi_participation_always_accepted_returns_none() {
    // Setup server expectations
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", "/repos/example/item-1/stats/participation")
        .with_status(202)
        .with_header("content-type", "application/json")
        .with_body("{}")
        .expect(4)
        .create_async()
        .await;

    // Run the request
    let participation_stats = ghapi(&server).get_participation_stats("example", "item-1").await.unwrap();

    // Check no stats are returned after retrying three times
    assert_eq!(participation_stats, None);
    mock.assert_async().await;
}

#[test]
fn test_get_last_page_non_numeric_returns_error() {
    let headers =
        link_headers(r#"<https://api.github.com/repositories/1/contributors?page=abc>; rel="last""#);
    let err = get_last_page(&headers).unwrap_err();
    assert_eq!(format!("{err:#}"), "invalid digit found in string");
}

#[test]
fn test_get_last_page_returns_last_page() {
    let headers = link_headers(
        r#"<https://api.github.com/repositories/1/contributors?page=2>; rel="next", <https://api.github.com/repositories/1/contributors?page=42>; rel="last""#,
    );
    assert_eq!(get_last_page(&headers).unwrap(), Some(42));
}

#[test]
fn test_get_last_page_without_last_rel_returns_none() {
    let headers = link_headers(r#"<https://api.github.com/repositories/1/contributors?page=2>; rel="next""#);
    assert_eq!(get_last_page(&headers).unwrap(), None);
}

#[test]
fn test_get_last_page_without_link_returns_none() {
    assert_eq!(get_last_page(&HeaderMap::new()).unwrap(), None);
}

#[test]
fn test_new_commit_from_invalid_date_has_no_ts() {
    let commit_data: CommitDataType = serde_json::from_value(commit_data("not a date")).unwrap();
    assert_eq!(new_commit_from(commit_data), commit("1", None));
}

#[test]
fn test_new_commit_from_without_author_has_no_ts() {
    let mut commit_data = commit_data("2024-01-01T00:00:00Z");
    commit_data["commit"]["author"] = Value::Null;
    let commit_data: CommitDataType = serde_json::from_value(commit_data).unwrap();
    assert_eq!(new_commit_from(commit_data), commit("1", None));
}

#[test]
fn test_parse_tokens_blank_returns_empty() {
    assert_eq!(parse_tokens(""), Vec::<String>::new());
    assert_eq!(parse_tokens(" , ,"), Vec::<String>::new());
}

#[test]
fn test_parse_tokens_trims_and_drops_empty_entries() {
    assert_eq!(
        parse_tokens(" token1 ,,token2\n,"),
        vec!["token1".to_string(), "token2".to_string()]
    );
}

// Helpers.

/// Returns a commit of the test repository with the id and timestamp
/// provided.
fn commit(id: &str, ts: Option<DateTime<Utc>>) -> Commit {
    Commit {
        url: format!("https://github.com/example/item-1/commit/{id}"),
        ts,
    }
}

/// Returns the GitHub API representation of the commit `1` of the test
/// repository, authored at the date provided.
fn commit_data(date: &str) -> Value {
    json!({
        "commit": {
            "author": { "date": date, "email": "dev@example.com", "name": "Dev" },
            "message": "Initial commit",
            "tree": { "sha": "abc", "url": "https://api.github.com/repos/example/item-1/git/trees/abc" },
            "url": "https://api.github.com/repos/example/item-1/git/commits/1",
        },
        "html_url": "https://github.com/example/item-1/commit/1",
        "sha": "1",
    })
}

/// Sets up the expectations of a successful fetch of the repository provided,
/// reading the commits from the reference provided.
fn expect_repository_fetch(gh: &mut MockGH, owner: &'static str, repo: &'static str, ref_: &'static str) {
    gh.expect_get_repository()
        .times(1)
        .withf(move |o, r| o == owner && r == repo)
        .returning(|_, _| Ok(full_repository()));
    gh.expect_get_contributors_count()
        .times(1)
        .withf(move |o, r| o == owner && r == repo)
        .returning(|_, _| Ok(Some(5)));
    gh.expect_get_first_commit()
        .times(1)
        .withf(move |o, r, rf| o == owner && r == repo && rf == ref_)
        .returning(|_, _, _| Ok(None));
    gh.expect_get_languages()
        .times(1)
        .withf(move |o, r| o == owner && r == repo)
        .returning(|_, _| Ok(None));
    gh.expect_get_latest_commit()
        .times(1)
        .withf(move |o, r, rf| o == owner && r == repo && rf == ref_)
        .returning(|_, _, _| Ok(commit("2", None)));
    gh.expect_get_latest_release()
        .times(1)
        .withf(move |o, r| o == owner && r == repo)
        .returning(|_, _| Ok(None));
    gh.expect_get_participation_stats()
        .times(1)
        .withf(move |o, r| o == owner && r == repo)
        .returning(|_, _| Ok(Some(vec![1, 2])));
}

/// Sets up the expectations of the calls made after getting the test
/// repository, reading the commits from the reference provided and returning
/// the contributors count and participation stats provided.
fn expect_repository_fetch_with(
    gh: &mut MockGH,
    ref_: &'static str,
    contributors_count: Result<Option<usize>>,
    participation_stats: Result<Option<Vec<i64>>>,
) {
    gh.expect_get_contributors_count()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .return_once(move |_, _| contributors_count);
    gh.expect_get_first_commit()
        .times(1)
        .withf(move |owner, repo, rf| owner == "example" && repo == "item-1" && rf == ref_)
        .returning(|_, _, _| Ok(None));
    gh.expect_get_languages()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Ok(None));
    gh.expect_get_latest_commit()
        .times(1)
        .withf(move |owner, repo, rf| owner == "example" && repo == "item-1" && rf == ref_)
        .returning(|_, _, _| Ok(commit("2", None)));
    gh.expect_get_latest_release()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .returning(|_, _| Ok(None));
    gh.expect_get_participation_stats()
        .times(1)
        .withf(|owner, repo| owner == "example" && repo == "item-1")
        .return_once(move |_, _| participation_stats);
}

/// Returns the repository the mocked GitHub API returns.
fn full_repository() -> FullRepository {
    serde_json::from_value(json!({
        "default_branch": "main",
        "description": "Fetched description",
        "html_url": REPO_URL,
        "stargazers_count": 100,
    }))
    .unwrap()
}

/// Returns a GitHub API client that sends its requests to the server
/// provided.
fn ghapi(server: &ServerGuard) -> GHApi {
    GHApi::new("token", test_config(&server.url())).unwrap()
}

/// Returns a landscape with one item for each of the repositories provided.
fn landscape_data(repo_urls: &[&str]) -> LandscapeData {
    LandscapeData {
        items: repo_urls
            .iter()
            .map(|url| Item {
                repositories: Some(vec![Repository {
                    url: (*url).to_string(),
                    ..Default::default()
                }]),
                ..Default::default()
            })
            .collect(),
        ..Default::default()
    }
}

/// Returns a `Link` header pointing to the last page provided of the test
/// repository resource provided, served by the server provided.
fn last_page_link(server: &ServerGuard, resource: &str, last_page: usize) -> String {
    format!(
        r#"<{}/repos/example/item-1/{resource}?page={last_page}>; rel="last""#,
        server.url()
    )
}

/// Returns some headers with the `Link` header provided.
fn link_headers(link: &str) -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(header::LINK, HeaderValue::from_str(link).unwrap());
    headers
}

/// Returns the fixed time used as the current time in the tests.
fn now() -> DateTime<Utc> {
    Utc.with_ymd_and_hms(2026, 1, 15, 0, 0, 0).unwrap()
}

/// Returns a clients pool with the mock provided.
fn pool(gh: MockGH) -> Pool<DynGH> {
    Pool::from(vec![Box::new(gh) as DynGH])
}

/// Reads the GitHub cache file as JSON.
fn read_cache_file(tmp_dir: &Path) -> Value {
    serde_json::from_slice(&fs::read(tmp_dir.join("landscape").join(GITHUB_CACHE_FILE)).unwrap()).unwrap()
}

/// Returns some cached repository data generated at the time provided.
fn repository_data(generated_at: DateTime<Utc>) -> RepositoryGithubData {
    RepositoryGithubData {
        contributors: Contributors {
            count: 3,
            url: "https://github.com/example/item-1/graphs/contributors".to_string(),
        },
        description: "Cached description".to_string(),
        generated_at,
        latest_commit: commit("1", None),
        participation_stats: vec![1, 0],
        stars: 10,
        url: REPO_URL.to_string(),
        ..Default::default()
    }
}

/// Returns the GitHub API client configuration used in the tests, without
/// retries nor delays.
fn test_config(api_url: &str) -> GHApiConfig {
    GHApiConfig {
        api_url: api_url.to_string(),
        max_retries: 0,
        retry_delay: Duration::ZERO,
    }
}

/// Writes the entries provided to the GitHub cache file.
fn write_cache_entries(tmp_dir: &Path, entries: &Value) {
    let cache_file = json!({ "entries": entries, "version": 1 });
    fs::write(
        tmp_dir.join("landscape").join(GITHUB_CACHE_FILE),
        serde_json::to_vec(&cache_file).unwrap(),
    )
    .unwrap();
}

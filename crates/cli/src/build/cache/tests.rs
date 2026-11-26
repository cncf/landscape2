use std::{
    fs::{self, File},
    io,
    path::PathBuf,
    time::SystemTime,
};

use chrono::{NaiveDate, TimeZone};
use landscape2_core::data::{Acquisition, Commit, Contributors, FundingRound, Release};
use pretty_assertions::assert_eq;
use serde_json::json;
use tempfile::TempDir;

use super::*;

#[test]
fn test_cache_new_creates_landscape_subdir() {
    // Run the cache setup
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();

    // Check the landscape subdirectory is created and used
    assert!(tmp_dir.path().join("landscape").is_dir());
    assert_eq!(cache.cache_dir, tmp_dir.path().join("landscape"));
}

#[test]
fn test_cache_prune_files_removes_unused_expired_files() {
    // Setup cache files with different names, usage and ages
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let expired = SystemTime::from(Utc::now() - TimeDelta::days(91));
    write_cache_file(&cache, "clomonitor_cncf_expired-unused.svg", Some(expired));
    write_cache_file(&cache, "clomonitor_cncf_expired-used.svg", Some(expired));
    write_cache_file(&cache, "clomonitor_cncf_recent-unused.svg", None);
    write_cache_file(&cache, "github.json", Some(expired));

    // Run the pruning
    let used = HashSet::from(["clomonitor_cncf_expired-used.svg".to_string()]);
    cache.prune_files("clomonitor_", ".svg", &used, CACHE_MAX_AGE).unwrap();

    // Check only the unused expired matching file is removed
    assert_eq!(
        cache_file_names(&cache),
        vec![
            "clomonitor_cncf_expired-used.svg",
            "clomonitor_cncf_recent-unused.svg",
            "github.json",
        ]
    );
}

#[test]
fn test_cache_read_missing_file_returns_none() {
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();

    assert!(cache.read("missing.json").unwrap().is_none());
}

#[test]
fn test_read_entries_accepts_legacy_unversioned_map() {
    // Setup a legacy cache file
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let entry = repository_data(now());
    let legacy = json!({ "https://github.com/example/repo": entry });
    cache.write("github.json", &serde_json::to_vec(&legacy).unwrap()).unwrap();

    // Run the entries read
    let entries: BTreeMap<String, RepositoryGithubData> = cache.read_entries("github.json");

    // Check the legacy entries are migrated
    assert_eq!(
        entries,
        BTreeMap::from([("https://github.com/example/repo".to_string(), entry)])
    );
}

#[test]
fn test_read_entries_drops_only_corrupt_entry() {
    // Setup a cache file with a valid and a corrupt entry
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let entry = repository_data(now());
    let cache_file = json!({
        "entries": {
            "https://github.com/example/corrupt": { "stars": "many" },
            "https://github.com/example/repo": entry,
        },
        "version": 1,
    });
    cache.write("github.json", &serde_json::to_vec(&cache_file).unwrap()).unwrap();

    // Run the entries read
    let entries: BTreeMap<String, RepositoryGithubData> = cache.read_entries("github.json");

    // Check only the valid entry is kept
    assert_eq!(
        entries,
        BTreeMap::from([("https://github.com/example/repo".to_string(), entry)])
    );
}

#[test]
fn test_read_entries_reads_crunchbase_file_written_by_v1_1_0() {
    // Setup a cache directory with a file written by landscape2 v1.1.0
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    copy_v1_1_0_cache_file(&cache, "crunchbase.json");

    // Run the entries read
    let entries: BTreeMap<String, Organization> = cache.read_entries("crunchbase.json");

    // Check every entry is read with all its fields
    assert_eq!(
        entries,
        BTreeMap::from([
            (
                "https://www.crunchbase.com/organization/full".to_string(),
                Organization {
                    generated_at: v1_1_0_generated_at(),
                    acquisitions: Some(vec![Acquisition {
                        acquiree_cb_permalink: Some("acquiree".to_string()),
                        acquiree_name: Some("Acquiree".to_string()),
                        announced_on: NaiveDate::from_ymd_opt(2024, 5, 6),
                        price: Some(1_000_000),
                    }]),
                    categories: Some(vec!["Cloud".to_string(), "Software".to_string()]),
                    city: Some("San Francisco".to_string()),
                    company_type: Some("for_profit".to_string()),
                    country: Some("United States".to_string()),
                    description: Some("Full organization".to_string()),
                    funding: Some(5_000_000),
                    funding_rounds: Some(vec![FundingRound {
                        amount: Some(2_000_000),
                        announced_on: NaiveDate::from_ymd_opt(2023, 1, 2),
                        kind: Some("series_a".to_string()),
                    }]),
                    homepage_url: Some("https://full.example".to_string()),
                    kind: Some("funding".to_string()),
                    linkedin_url: Some("https://www.linkedin.com/company/full".to_string()),
                    name: Some("Full".to_string()),
                    num_employees_max: Some(500),
                    num_employees_min: Some(251),
                    region: Some("California".to_string()),
                    stock_exchange: Some("nasdaq".to_string()),
                    ticker: Some("FULL".to_string()),
                    twitter_url: Some("https://twitter.com/full".to_string()),
                },
            ),
            (
                "https://www.crunchbase.com/organization/minimal".to_string(),
                Organization {
                    generated_at: v1_1_0_generated_at(),
                    ..Default::default()
                },
            ),
        ])
    );
}

#[test]
fn test_read_entries_reads_github_file_written_by_v1_1_0() {
    // Setup a cache directory with a file written by landscape2 v1.1.0
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    copy_v1_1_0_cache_file(&cache, "github.json");

    // Run the entries read
    let entries: BTreeMap<String, RepositoryGithubData> = cache.read_entries("github.json");

    // Check every entry is read with all its fields, including the null
    // timestamps and the omitted topics that version wrote
    let ts = Utc.with_ymd_and_hms(2025, 9, 15, 8, 0, 0).unwrap();
    assert_eq!(
        entries,
        BTreeMap::from([
            (
                "https://github.com/example/full".to_string(),
                RepositoryGithubData {
                    contributors: Contributors {
                        count: 42,
                        url: "https://github.com/example/full/graphs/contributors".to_string(),
                    },
                    description: "Full repository :rocket:".to_string(),
                    generated_at: v1_1_0_generated_at(),
                    latest_commit: Commit {
                        url: "https://github.com/example/full/commit/abc".to_string(),
                        ts: Some(ts),
                    },
                    participation_stats: vec![0, 1, 2, 3],
                    stars: 1234,
                    url: "https://github.com/example/full".to_string(),
                    first_commit: Some(Commit {
                        url: "https://github.com/example/full/commit/000".to_string(),
                        ts: Some(ts),
                    }),
                    languages: Some(BTreeMap::from([
                        ("Rust".to_string(), 1000),
                        ("TypeScript".to_string(), 500),
                    ])),
                    latest_release: Some(Release {
                        url: "https://github.com/example/full/releases/v1".to_string(),
                        ts: Some(ts),
                    }),
                    license: Some("Apache License 2.0".to_string()),
                    topics: vec!["cncf".to_string(), "landscape".to_string()],
                },
            ),
            (
                "https://github.com/example/minimal".to_string(),
                RepositoryGithubData {
                    contributors: Contributors {
                        count: 0,
                        url: "https://github.com/example/minimal/graphs/contributors".to_string(),
                    },
                    description: String::new(),
                    generated_at: v1_1_0_generated_at(),
                    latest_commit: Commit {
                        url: "https://github.com/example/minimal/commit/abc".to_string(),
                        ts: None,
                    },
                    participation_stats: vec![],
                    stars: 0,
                    url: "https://github.com/example/minimal".to_string(),
                    ..Default::default()
                },
            ),
        ])
    );
}

#[test]
fn test_read_entries_roundtrips_empty_topics_and_none_options() {
    // Setup entries with empty topics and no optional values
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let github_entries = BTreeMap::from([(
        "https://github.com/example/repo".to_string(),
        repository_data(now()),
    )]);
    let crunchbase_entries = BTreeMap::from([(
        "https://www.crunchbase.com/organization/example".to_string(),
        Organization {
            generated_at: now(),
            ..Default::default()
        },
    )]);

    // Run the entries write and read
    cache.write_entries("github.json", github_entries.clone()).unwrap();
    cache.write_entries("crunchbase.json", crunchbase_entries.clone()).unwrap();
    let read_github_entries: BTreeMap<String, RepositoryGithubData> = cache.read_entries("github.json");
    let read_crunchbase_entries: BTreeMap<String, Organization> = cache.read_entries("crunchbase.json");

    // Check the entries are read back unchanged
    assert_eq!(read_github_entries, github_entries);
    assert_eq!(read_crunchbase_entries, crunchbase_entries);
}

#[test]
fn test_read_entries_truncated_file_returns_empty() {
    // Setup a truncated cache file
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let cache_file = json!({
        "entries": { "https://github.com/example/repo": repository_data(now()) },
        "version": 1,
    });
    let data = serde_json::to_vec(&cache_file).unwrap();
    cache.write("github.json", &data[..data.len() / 2]).unwrap();

    // Run the entries read
    let entries: BTreeMap<String, RepositoryGithubData> = cache.read_entries("github.json");

    // Check no entries are returned
    assert!(entries.is_empty());
}

#[test]
fn test_read_entries_unknown_version_returns_empty() {
    // Setup a cache file in a future version
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let cache_file = json!({
        "entries": { "https://github.com/example/repo": repository_data(now()) },
        "version": CACHE_FORMAT_VERSION + 1,
    });
    cache.write("github.json", &serde_json::to_vec(&cache_file).unwrap()).unwrap();

    // Run the entries read
    let entries: BTreeMap<String, RepositoryGithubData> = cache.read_entries("github.json");

    // Check no entries are returned
    assert!(entries.is_empty());
}

#[test]
fn test_cache_write_leaves_no_temp_file() {
    // Run two writes to the same file
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    cache.write("github.json", b"first").unwrap();
    cache.write("github.json", b"second").unwrap();

    // Check only the target file is left, with the latest content
    assert_eq!(cache_file_names(&cache), vec!["github.json"]);
    assert_eq!(
        fs::read(tmp_dir.path().join("landscape/github.json")).unwrap(),
        b"second"
    );
}

#[test]
fn test_cache_write_rename_failure_removes_temp_file() {
    // Setup a non-empty directory at the target path
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let target = tmp_dir.path().join("landscape/github.json");
    fs::create_dir(&target).unwrap();
    fs::write(target.join("file"), b"content").unwrap();

    // Run the write
    let err = cache.write("github.json", b"data").unwrap_err();

    // Check the rename error is returned and the temporary file is removed
    assert_eq!(
        err.downcast_ref::<io::Error>().unwrap().kind(),
        io::ErrorKind::IsADirectory
    );
    assert_eq!(cache_file_names(&cache), vec!["github.json"]);
    assert_eq!(fs::read(target.join("file")).unwrap(), b"content");
}

#[test]
fn test_cache_write_then_read_roundtrips() {
    // Run the write and read
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    cache.write("report.svg", b"<svg/>").unwrap();
    let (modified_at, data) = cache.read("report.svg").unwrap().unwrap();

    // Check the content and modification time are returned
    assert_eq!(data, b"<svg/>");
    assert!(modified_at.is_some());
}

#[test]
fn test_write_entries_migrates_file_written_by_v1_1_0() {
    // Setup a cache directory with a file written by landscape2 v1.1.0
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    copy_v1_1_0_cache_file(&cache, "github.json");
    let entries: BTreeMap<String, RepositoryGithubData> = cache.read_entries("github.json");

    // Run the entries write
    cache.write_entries("github.json", entries.clone()).unwrap();

    // Check the file uses the versioned envelope and keeps the same entries
    let (_, data) = cache.read("github.json").unwrap().unwrap();
    let cache_file: CacheFile<RepositoryGithubData> = serde_json::from_slice(&data).unwrap();
    assert_eq!(cache_file.version, CACHE_FORMAT_VERSION);
    assert_eq!(cache_file.entries.len(), 2);
    assert_eq!(cache_file.entries, entries);
    assert_eq!(cache.read_entries::<RepositoryGithubData>("github.json"), entries);
}

#[test]
fn test_merge_for_write_keeps_foreign_recent_entries() {
    // Setup existing entries from another landscape and the used ones
    let existing = BTreeMap::from([
        (
            "https://github.com/other/repo".to_string(),
            repository_data(now() - TimeDelta::days(30)),
        ),
        (
            "https://github.com/example/repo".to_string(),
            repository_data(now() - TimeDelta::days(8)),
        ),
    ]);
    let used = BTreeMap::from([(
        "https://github.com/example/repo".to_string(),
        repository_data(now()),
    )]);

    // Run the merge
    let merged = merge_for_write(existing, &used, now(), CACHE_MAX_AGE);

    // Check the other landscape entry is kept
    assert_eq!(
        merged,
        BTreeMap::from([
            (
                "https://github.com/example/repo".to_string(),
                repository_data(now())
            ),
            (
                "https://github.com/other/repo".to_string(),
                repository_data(now() - TimeDelta::days(30))
            ),
        ])
    );
}

#[test]
fn test_merge_for_write_prunes_unused_entries_past_max_age() {
    // Setup existing entries past the maximum age, one of them in use
    let old_used = repository_data(now() - TimeDelta::days(120));
    let existing = BTreeMap::from([
        (
            "https://github.com/example/old-unused".to_string(),
            repository_data(now() - TimeDelta::days(91)),
        ),
        (
            "https://github.com/example/old-used".to_string(),
            old_used.clone(),
        ),
    ]);
    let used = BTreeMap::from([(
        "https://github.com/example/old-used".to_string(),
        old_used.clone(),
    )]);

    // Run the merge
    let merged = merge_for_write(existing, &used, now(), CACHE_MAX_AGE);

    // Check only the unused old entry is pruned
    assert_eq!(
        merged,
        BTreeMap::from([("https://github.com/example/old-used".to_string(), old_used)])
    );
}

#[test]
fn test_merge_for_write_replaces_entry_with_fresh_value() {
    // Setup an existing entry and a fresh value for it
    let existing = BTreeMap::from([(
        "https://github.com/example/repo".to_string(),
        repository_data(now() - TimeDelta::days(8)),
    )]);
    let fresh = RepositoryGithubData {
        stars: 20,
        ..repository_data(now())
    };
    let used = BTreeMap::from([("https://github.com/example/repo".to_string(), fresh.clone())]);

    // Run the merge
    let merged = merge_for_write(existing, &used, now(), CACHE_MAX_AGE);

    // Check the fresh value replaces the existing one
    assert_eq!(
        merged,
        BTreeMap::from([("https://github.com/example/repo".to_string(), fresh)])
    );
}

#[test]
fn test_select_cached_splits_fresh_and_expired() {
    // Setup fresh and expired cached entries
    let cached = BTreeMap::from([
        (
            "https://github.com/example/expired".to_string(),
            repository_data(now() - TimeDelta::days(8)),
        ),
        (
            "https://github.com/example/fresh".to_string(),
            repository_data(now() - TimeDelta::days(1)),
        ),
    ]);
    let expired_url = "https://github.com/example/expired";
    let fresh_url = "https://github.com/example/fresh";
    let missing_url = "https://github.com/example/missing";

    // Run the selection
    let (fresh, misses) = select_cached(
        &cached,
        &[expired_url, fresh_url, missing_url],
        now(),
        TimeDelta::days(7),
    );

    // Check fresh entries are hits and the expired and missing ones are misses
    assert_eq!(
        fresh,
        BTreeMap::from([(fresh_url.to_string(), repository_data(now() - TimeDelta::days(1)))])
    );
    assert_eq!(misses, vec![expired_url, missing_url]);
}

// Helpers.

/// Returns the names of the files in the cache directory, sorted.
fn cache_file_names(cache: &Cache) -> Vec<String> {
    let mut file_names: Vec<String> = fs::read_dir(&cache.cache_dir)
        .unwrap()
        .map(|entry| entry.unwrap().file_name().to_string_lossy().to_string())
        .collect();
    file_names.sort();
    file_names
}

/// Copies a cache file written by landscape2 v1.1.0 (the last release before
/// the versioned envelope) from the testdata directory to the cache directory.
fn copy_v1_1_0_cache_file(cache: &Cache, file_name: &str) {
    let source = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("src/testdata/cache-v1.1.0")
        .join(file_name);
    fs::copy(source, cache.cache_dir.join(file_name)).unwrap();
}

/// Returns the fixed time used as the current time in the tests.
fn now() -> DateTime<Utc> {
    Utc.with_ymd_and_hms(2026, 1, 15, 0, 0, 0).unwrap()
}

/// Returns some repository data generated at the time provided, with empty
/// topics and no optional values.
fn repository_data(generated_at: DateTime<Utc>) -> RepositoryGithubData {
    RepositoryGithubData {
        contributors: Contributors {
            count: 3,
            url: "https://github.com/example/repo/graphs/contributors".to_string(),
        },
        description: "Description".to_string(),
        generated_at,
        latest_commit: Commit {
            url: "https://github.com/example/repo/commit/1".to_string(),
            ts: None,
        },
        participation_stats: vec![1, 0],
        stars: 10,
        url: "https://github.com/example/repo".to_string(),
        ..Default::default()
    }
}

/// Returns the time the entries in the v1.1.0 cache files were generated at.
fn v1_1_0_generated_at() -> DateTime<Utc> {
    Utc.with_ymd_and_hms(2025, 10, 1, 12, 30, 45).unwrap()
}

/// Writes a file in the cache directory, setting its modification time when
/// provided.
fn write_cache_file(cache: &Cache, file_name: &str, modified_at: Option<SystemTime>) {
    let path = cache.cache_dir.join(file_name);
    fs::write(&path, b"content").unwrap();
    if let Some(modified_at) = modified_at {
        File::options().write(true).open(&path).unwrap().set_modified(modified_at).unwrap();
    }
}

//! This module checks the contract between the datasets generated in Rust and
//! the UI code that consumes them. Two sets of generated files are committed
//! to the `ui/common` package and must be kept up to date:
//!
//! - the TypeScript types generated from the datasets structs (only checked
//!   with the `ts` feature enabled);
//! - the datasets fixtures the UI tests read, written from the same structs
//!   the types are generated from.

use std::{
    collections::{BTreeMap, BTreeSet},
    env, fs, io,
    path::{Path, PathBuf},
};

use anyhow::Result;
use chrono::{DateTime, NaiveDate, TimeZone, Utc};
use serde::Serialize;
#[cfg(feature = "ts")]
use ts_rs::{Config, TS};

use crate::{
    data::{
        Acquisition, Commit, Contributors, CrunchbaseData, FundingRound, GithubData, LandscapeData,
        Organization, Release, RepositoryGithubData,
    },
    datasets::{Datasets, NewDatasetsInput},
    games::LandscapeGames,
    guide::LandscapeGuide,
    settings::LandscapeSettings,
    source::Parsed,
};
#[cfg(feature = "ts")]
use crate::{
    datasets::{base::Base, embed::EmbedView, full::Full},
    stats::Stats,
};

/// Directory where the datasets fixtures are committed.
const DATASET_FIXTURES_DIR: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../ui/common/src/types/__fixtures__"
);

/// Sources of the datasets fixtures, covering the cases the UI handles.
const FIXTURE_SOURCES: FixtureSources = FixtureSources {
    data: include_str!("testdata/contract/data.yml"),
    games: include_str!("testdata/contract/games.yml"),
    guide: include_str!("testdata/contract/guide.yml"),
    settings: include_str!("testdata/contract/settings.yml"),
};

/// Directory where the generated TypeScript types are committed.
#[cfg(feature = "ts")]
const GENERATED_TYPES_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../ui/common/src/types/generated");

/// Subdirectory of the datasets fixtures directory where the minimal fixtures
/// are committed.
const MINIMAL_FIXTURES_SUBDIR: &str = "minimal";

/// Sources of the minimal datasets fixtures, using only the required fields.
const MINIMAL_FIXTURE_SOURCES: FixtureSources = FixtureSources {
    data: include_str!("testdata/contract/minimal/data.yml"),
    games: include_str!("testdata/contract/minimal/games.yml"),
    guide: include_str!("testdata/contract/minimal/guide.yml"),
    settings: include_str!("testdata/contract/minimal/settings.yml"),
};

/// Command that refreshes the committed generated files.
const UPDATE_COMMAND: &str = "UPDATE_TS_TYPES=1 cargo test -p landscape2-core --features ts contract";

/// Environment variable that, set to `1`, makes the checks refresh the
/// committed generated files instead of failing when they are out of date.
const UPDATE_ENV_VAR: &str = "UPDATE_TS_TYPES";

/// Raw landscape sources a datasets fixtures set is built from.
struct FixtureSources {
    /// Landscape data (`data.yml`).
    data: &'static str,
    /// Landscape games (`games.yml`).
    games: &'static str,
    /// Landscape guide (`guide.yml`).
    guide: &'static str,
    /// Landscape settings (`settings.yml`).
    settings: &'static str,
}

impl FixtureSources {
    /// Parse the fixture games.
    fn games(&self) -> LandscapeGames {
        without_warnings(LandscapeGames::new_from_yaml(self.games))
    }

    /// Parse the fixture guide.
    fn guide(&self) -> LandscapeGuide {
        without_warnings(LandscapeGuide::new_from_yaml(self.guide))
    }
}

/// Build the datasets from the sources and the external data provided, the
/// same way the build does, using a fixed reference time.
fn build_datasets(
    sources: &FixtureSources,
    crunchbase_data: &CrunchbaseData,
    github_data: &GithubData,
    qr_code: Option<&str>,
) -> Datasets {
    // Parse the landscape sources
    let mut landscape_data = without_warnings(LandscapeData::new_from_yaml(sources.data));
    let settings = without_warnings(LandscapeSettings::new_from_yaml(sources.settings));
    let guide = sources.guide();
    let games = sources.games();

    // Enrich the data and build the datasets
    landscape_data.enrich(&settings, crunchbase_data, github_data);
    Datasets::new(&NewDatasetsInput {
        crunchbase_data,
        github_data,
        landscape_data: &landscape_data,
        now: fixture_now(),
        settings: &settings,
        games: Some(&games),
        guide: Some(&guide),
        qr_code,
    })
}

/// Build the datasets fixtures from the contract sources, enriched with some
/// fixed Crunchbase and GitHub data.
///
/// They cover a description fallback, overlapping featured rules with
/// excluded groups, an empty subcategory, a capitalized multi-word maturity,
/// an item with two TAGs, an item with additional categories, a repository
/// without first commit and a guide category without subcategories.
fn build_fixture_datasets() -> Datasets {
    build_datasets(
        &FIXTURE_SOURCES,
        &fixture_crunchbase_data(),
        &fixture_github_data(),
        Some("images/qr-code.svg"),
    )
}

/// Build the minimal datasets fixtures: settings with only the required keys,
/// one item with only the required fields and a repository without GitHub
/// data, empty guide and games, and no QR code (as in the overlay). Every field that can be skipped is absent
/// from their output.
fn build_minimal_fixture_datasets() -> Datasets {
    build_datasets(
        &MINIMAL_FIXTURE_SOURCES,
        &CrunchbaseData::new(),
        &GithubData::new(),
        None,
    )
}

/// Check that the committed directory holds exactly the rendered files, with
/// the same content.
///
/// When the `UPDATE_TS_TYPES` environment variable is set to `1`, the
/// committed directory contents are replaced with the rendered files instead.
///
/// # Panics
///
/// Panics listing the differing files when the directories do not match (and
/// no update was requested), or when the files cannot be read or written.
fn check_generated_dir(committed: &Path, rendered: &Path) {
    // Collect the files in both directories
    let committed_files = list_files(committed).expect("committed files to be listed");
    let rendered_files = list_files(rendered).expect("rendered files to be listed");

    // Replace the committed files with the rendered ones when requested
    if env::var(UPDATE_ENV_VAR).is_ok_and(|value| value == "1") {
        for file in committed_files.difference(&rendered_files) {
            fs::remove_file(committed.join(file)).expect("stale committed file to be removed");
        }
        for file in &rendered_files {
            let committed_file = committed.join(file);
            if let Some(parent) = committed_file.parent() {
                fs::create_dir_all(parent).expect("committed directory to be created");
            }
            fs::copy(rendered.join(file), committed_file).expect("rendered file to be copied");
        }
        return;
    }

    // Find the files missing on either side or with a different content
    let differing_files: Vec<String> = committed_files
        .union(&rendered_files)
        .filter(|file| {
            let committed_content = fs::read(committed.join(file)).ok();
            let rendered_content = fs::read(rendered.join(file)).ok();
            committed_content != rendered_content
        })
        .map(|file| file.display().to_string())
        .collect();

    // Fail listing the differing files and how to refresh them
    assert!(
        differing_files.is_empty(),
        "generated files in {} are out of date: {}\nrun `{UPDATE_COMMAND}`",
        committed.display(),
        differing_files.join(", "),
    );
}

/// Return the date provided.
fn date(year: i32, month: u32, day: u32) -> NaiveDate {
    NaiveDate::from_ymd_opt(year, month, day).unwrap()
}

/// Return the kind of the embed view with the key provided, used to pick one
/// view of each kind as a fixture.
fn embed_view_kind(key: &str) -> &'static str {
    match key.split_once('_') {
        Some(("category", name)) if name.contains("--") => "subcategory",
        Some(("category", _)) => "category",
        Some(("maturity", "all")) => "maturity-all",
        Some(("maturity", _)) => "maturity",
        Some(("tag", "all")) => "tag-all",
        Some(("tag", _)) => "tag",
        _ => panic!("unexpected embed key {key}"),
    }
}

/// Export the TypeScript types of the datasets (and of every type they
/// depend on) into the `core` directory of the root provided.
#[cfg(feature = "ts")]
fn export_ts_types(root: &Path) -> Result<()> {
    let config = Config::new().with_large_int("number").with_out_dir(root);

    // Export every dataset root type, along with the types it depends on
    Base::export_all(&config)?;
    EmbedView::export_all(&config)?;
    Full::export_all(&config)?;
    LandscapeGames::export_all(&config)?;
    LandscapeGuide::export_all(&config)?;
    Stats::export_all(&config)?;

    Ok(())
}

/// Return the fixed Crunchbase data used to enrich the datasets fixtures.
fn fixture_crunchbase_data() -> CrunchbaseData {
    CrunchbaseData::from([
        (
            "https://www.crunchbase.com/organization/item-2".to_string(),
            Organization {
                generated_at: fixture_now(),
                description: Some("Item 2 organization description".to_string()),
                homepage_url: Some("https://item-2.example".to_string()),
                name: Some("Item 2 Inc".to_string()),
                ..Default::default()
            },
        ),
        (
            "https://www.crunchbase.com/organization/item-3".to_string(),
            Organization {
                generated_at: fixture_now(),
                description: Some(":rocket: Item 3 organization description".to_string()),
                name: Some("Item 3 Inc".to_string()),
                ..Default::default()
            },
        ),
        (
            "https://www.crunchbase.com/organization/member-1".to_string(),
            Organization {
                generated_at: fixture_now(),
                acquisitions: Some(vec![Acquisition {
                    acquiree_cb_permalink: Some("acquired-company".to_string()),
                    acquiree_name: Some("Acquired Company".to_string()),
                    announced_on: Some(date(2023, 11, 20)),
                    price: Some(5_000_000),
                }]),
                categories: Some(vec!["Cloud Computing".to_string(), "Software".to_string()]),
                city: Some("San Francisco".to_string()),
                company_type: Some("for_profit".to_string()),
                country: Some("United States".to_string()),
                description: Some("Member 1 organization description".to_string()),
                funding: Some(25_000_000),
                funding_rounds: Some(vec![FundingRound {
                    amount: Some(25_000_000),
                    announced_on: Some(date(2023, 5, 10)),
                    kind: Some("series_a".to_string()),
                }]),
                homepage_url: Some("https://member-1.example".to_string()),
                kind: Some("company".to_string()),
                linkedin_url: Some("https://www.linkedin.com/company/member-1".to_string()),
                name: Some("Member 1 Inc".to_string()),
                num_employees_max: Some(500),
                num_employees_min: Some(251),
                region: Some("North America".to_string()),
                stock_exchange: Some("nasdaq".to_string()),
                ticker: Some("MBR".to_string()),
                twitter_url: Some("https://twitter.com/member1".to_string()),
            },
        ),
    ])
}

/// Return the fixed GitHub data used to enrich the datasets fixtures.
fn fixture_github_data() -> GithubData {
    GithubData::from([
        (
            "https://github.com/example/item-1".to_string(),
            RepositoryGithubData {
                contributors: Contributors {
                    count: 120,
                    url: "https://github.com/example/item-1/graphs/contributors".to_string(),
                },
                description: "Item 1 repository description".to_string(),
                generated_at: fixture_now(),
                latest_commit: Commit {
                    url: "https://github.com/example/item-1/commit/2".to_string(),
                    ts: Some(Utc.with_ymd_and_hms(2024, 5, 30, 12, 0, 0).unwrap()),
                },
                participation_stats: vec![3, 5, 8],
                stars: 1500,
                url: "https://github.com/example/item-1".to_string(),
                first_commit: Some(Commit {
                    url: "https://github.com/example/item-1/commit/1".to_string(),
                    ts: Some(Utc.with_ymd_and_hms(2019, 1, 10, 9, 0, 0).unwrap()),
                }),
                languages: Some(BTreeMap::from([
                    ("Go".to_string(), 90_000),
                    ("Shell".to_string(), 1_000),
                ])),
                latest_release: Some(Release {
                    url: "https://github.com/example/item-1/releases/tag/v1.2.0".to_string(),
                    ts: Some(Utc.with_ymd_and_hms(2024, 5, 1, 8, 0, 0).unwrap()),
                }),
                license: Some("Apache-2.0".to_string()),
                topics: vec!["cloud-native".to_string(), "networking".to_string()],
            },
        ),
        (
            "https://github.com/example/item-2".to_string(),
            RepositoryGithubData {
                contributors: Contributors {
                    count: 4,
                    url: "https://github.com/example/item-2/graphs/contributors".to_string(),
                },
                description: "Item 2 repository description".to_string(),
                generated_at: fixture_now(),
                latest_commit: Commit {
                    url: "https://github.com/example/item-2/commit/9".to_string(),
                    ts: Some(Utc.with_ymd_and_hms(2024, 4, 15, 10, 0, 0).unwrap()),
                },
                participation_stats: vec![0, 1],
                stars: 20,
                url: "https://github.com/example/item-2".to_string(),
                ..Default::default()
            },
        ),
        (
            "https://github.com/example/item-3".to_string(),
            RepositoryGithubData {
                contributors: Contributors {
                    count: 35,
                    url: "https://github.com/example/item-3/graphs/contributors".to_string(),
                },
                description: String::new(),
                generated_at: fixture_now(),
                latest_commit: Commit {
                    url: "https://github.com/example/item-3/commit/5".to_string(),
                    ts: Some(Utc.with_ymd_and_hms(2024, 5, 20, 16, 0, 0).unwrap()),
                },
                participation_stats: vec![2, 2, 4],
                stars: 300,
                url: "https://github.com/example/item-3".to_string(),
                first_commit: Some(Commit {
                    url: "https://github.com/example/item-3/commit/1".to_string(),
                    ts: Some(Utc.with_ymd_and_hms(2021, 7, 1, 11, 0, 0).unwrap()),
                }),
                languages: Some(BTreeMap::from([("Rust".to_string(), 40_000)])),
                license: Some("Apache-2.0".to_string()),
                ..Default::default()
            },
        ),
    ])
}

/// Return the fixed reference time used to build the datasets fixtures.
fn fixture_now() -> DateTime<Utc> {
    Utc.with_ymd_and_hms(2024, 6, 1, 0, 0, 0).unwrap()
}

/// List the files in the directory provided and its subdirectories, as paths
/// relative to it. A missing directory has no files.
fn list_files(dir: &Path) -> io::Result<BTreeSet<PathBuf>> {
    let mut files = BTreeSet::new();
    if !dir.exists() {
        return Ok(files);
    }

    // Walk the directory tree, collecting the files found
    let mut pending_dirs = vec![dir.to_path_buf()];
    while let Some(current_dir) = pending_dirs.pop() {
        for entry in fs::read_dir(&current_dir)? {
            let path = entry?.path();
            if path.is_dir() {
                pending_dirs.push(path);
            } else if let Ok(relative_path) = path.strip_prefix(dir) {
                files.insert(relative_path.to_path_buf());
            }
        }
    }

    Ok(files)
}

/// Write the datasets fixtures into the directory provided, as the build
/// writes them: the base, full, stats, guide and games datasets, plus the
/// first embed view (in key order) of each kind. Views without items are a
/// kind of their own, so an empty view is written when there is one.
fn render_dataset_fixtures(dir: &Path, datasets: &Datasets, sources: &FixtureSources) -> Result<()> {
    fs::create_dir_all(dir)?;

    // Write the datasets
    write_json(&dir.join("base.json"), &datasets.base)?;
    write_json(&dir.join("full.json"), &datasets.full)?;
    write_json(&dir.join("games.json"), &sources.games())?;
    write_json(&dir.join("guide.json"), &sources.guide())?;
    write_json(&dir.join("stats.json"), &datasets.stats)?;

    // Write the first embed view of each kind, empty views being a kind apart
    let mut embed_keys: Vec<&String> = datasets.embed.views.keys().collect();
    embed_keys.sort();
    let mut kinds_written = BTreeSet::new();
    for key in embed_keys {
        let view = &datasets.embed.views[key];
        let kind = if view.items.is_empty() {
            "empty"
        } else {
            embed_view_kind(key)
        };
        if kinds_written.insert(kind) {
            write_json(&dir.join(format!("embed_{key}.json")), view)?;
        }
    }

    Ok(())
}

/// Return the value parsed, checking no warnings were found while parsing it.
fn without_warnings<T>(parsed: Result<Parsed<T>>) -> T {
    let parsed = parsed.expect("fixture source to be valid");
    assert!(
        parsed.warnings.is_empty(),
        "fixture source warnings: {:?}",
        parsed.warnings
    );
    parsed.value
}

/// Write the value provided as pretty printed JSON, ending with a newline.
fn write_json(path: &Path, value: &impl Serialize) -> Result<()> {
    let mut json = serde_json::to_string_pretty(value)?;
    json.push('\n');
    fs::write(path, json)?;
    Ok(())
}

#[cfg(test)]
mod tests;

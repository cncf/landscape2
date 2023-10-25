//! This module defines some types used to represent the some landscape stats,
//! as well as the functionality used to prepare them.

use super::{settings::LandscapeSettings, LandscapeData};
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Format used to represent a date as year-month.
pub const YEAR_MONTH_FORMAT: &str = "%Y-%m";

/// Type alias to represent a month in a given year.
type YearMonth = String;

/// Landscape stats.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Stats {
    /// Foundation members stats.
    #[serde(skip_serializing_if = "Option::is_none")]
    members: Option<MembersStats>,

    /// Foundation projects stats.
    #[serde(skip_serializing_if = "Option::is_none")]
    projects: Option<ProjectsStats>,

    /// Repositories stats.
    #[serde(skip_serializing_if = "Option::is_none")]
    repositories: Option<RepositoriesStats>,
}

impl Stats {
    /// Create a new Stats instance from the information available in the
    /// landscape.
    pub(crate) fn new(landscape_data: &LandscapeData, settings: &LandscapeSettings) -> Self {
        Self {
            members: MembersStats::new(landscape_data, settings),
            projects: ProjectsStats::new(landscape_data),
            repositories: RepositoriesStats::new(landscape_data),
        }
    }
}

/// Some stats about the foundation's members.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct MembersStats {
    /// Number of members joined per year-month.
    joined_at: HashMap<YearMonth, u64>,

    /// Running total of number of members joined per year-month.
    joined_at_rt: HashMap<YearMonth, u64>,

    /// Total number of members.
    members: u64,

    /// Number of members per subcategory.
    subcategories: HashMap<String, u64>,
}

impl MembersStats {
    /// Create a new MembersStats instance from the information available in
    /// the landscape and the settings.
    fn new(landscape_data: &LandscapeData, settings: &LandscapeSettings) -> Option<Self> {
        let mut stats = MembersStats::default();

        // Collect stats from landscape items
        for item in &landscape_data.items {
            if let Some(members_category) = &settings.members_category {
                if &item.category == members_category {
                    // Total number of members
                    stats.members += 1;

                    // Number of members joined per year-month
                    if let Some(joined_at) = &item.joined_at {
                        let year_month = joined_at.format(YEAR_MONTH_FORMAT).to_string();
                        increment(&mut stats.joined_at, &year_month, 1);
                    }

                    // Number of members per subcategory
                    increment(&mut stats.subcategories, &item.subcategory, 1);
                }
            }
        }
        stats.joined_at_rt = calculate_running_total(&stats.joined_at);

        // Return stats collected
        if stats != MembersStats::default() {
            return Some(stats);
        }
        None
    }
}

/// Some stats about the landscape projects.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct ProjectsStats {
    /// Number of projects accepted per year-month.
    accepted_at: HashMap<YearMonth, u64>,

    /// Running total of number of projects accepted per year-month.
    accepted_at_rt: HashMap<YearMonth, u64>,

    /// Number of security audits per year-month.
    audits: HashMap<YearMonth, u64>,

    /// Running total of number of security audits per year-month.
    audits_rt: HashMap<YearMonth, u64>,

    /// Promotions from incubating to graduated per year-month.
    incubating_to_graduated: HashMap<YearMonth, u64>,

    /// Number of projects per maturity.
    maturity: HashMap<String, u64>,

    /// Total number of projects.
    projects: u64,

    /// Promotions from sandbox to incubating per year-month.
    sandbox_to_incubating: HashMap<YearMonth, u64>,
}

impl ProjectsStats {
    /// Create a new ProjectsStats instance from the information available in
    /// the landscape.
    fn new(landscape_data: &LandscapeData) -> Option<Self> {
        let mut stats = ProjectsStats::default();

        // Collect stats from landscape items
        let mut projects_seen = vec![];
        for item in &landscape_data.items {
            if let Some(maturity) = &item.maturity {
                // Check for duplicates
                let duplicate_key = (&item.homepage_url, &item.logo);
                if projects_seen.contains(&duplicate_key) {
                    continue;
                }
                projects_seen.push(duplicate_key);

                // Total number of projects
                stats.projects += 1;

                // Audits
                if let Some(audits) = &item.audits {
                    for audit in audits {
                        let year_month = audit.date.format(YEAR_MONTH_FORMAT).to_string();
                        increment(&mut stats.audits, &year_month, 1);
                    }
                }

                // Number of projects accepted per year-month
                if let Some(accepted_at) = &item.accepted_at {
                    let year_month = accepted_at.format(YEAR_MONTH_FORMAT).to_string();
                    increment(&mut stats.accepted_at, &year_month, 1);
                }

                // Number of projects per maturity
                increment(&mut stats.maturity, maturity, 1);

                // Promotions from sandbox to incubating
                if let Some(incubating_at) = &item.incubating_at {
                    if let Some(accepted_at) = &item.accepted_at {
                        if incubating_at != accepted_at {
                            let year_month = incubating_at.format(YEAR_MONTH_FORMAT).to_string();
                            increment(&mut stats.sandbox_to_incubating, &year_month, 1);
                        }
                    }
                }

                // Promotions from incubating to graduated
                if let Some(graduated_at) = &item.graduated_at {
                    let year_month = graduated_at.format(YEAR_MONTH_FORMAT).to_string();
                    increment(&mut stats.incubating_to_graduated, &year_month, 1);
                }
            }
        }
        stats.accepted_at_rt = calculate_running_total(&stats.accepted_at);
        stats.audits_rt = calculate_running_total(&stats.audits);

        // Return stats collected
        if stats != ProjectsStats::default() {
            return Some(stats);
        }
        None
    }
}

/// Some stats about the repositories listed in the landscape.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct RepositoriesStats {
    /// Source code bytes.
    bytes: u64,

    /// Number of contributors.
    contributors: u64,

    /// Number of repositories where each language is used.
    languages: HashMap<String, u64>,

    /// Source code bytes written on each language.
    languages_bytes: HashMap<String, u64>,

    /// Number of repositories where each license is used.
    licenses: HashMap<String, u64>,

    /// Number of commits per week over the last year.
    participation_stats: Vec<i64>,

    /// Number of repositories.
    repositories: u64,

    /// Number of stars.
    stars: u64,
}

impl RepositoriesStats {
    /// Create a new RepositoriesStats instance from the information available
    /// in the landscape.
    fn new(landscape_data: &LandscapeData) -> Option<Self> {
        let mut stats = RepositoriesStats::default();

        // Collect stats from landscape items
        for item in &landscape_data.items {
            if let Some(repos) = &item.repositories {
                stats.repositories += repos.len() as u64;

                for repo in repos {
                    if let Some(gh_data) = &repo.github_data {
                        // Contributors
                        stats.contributors += gh_data.contributors.count as u64;

                        // Languages
                        if let Some(languages) = &gh_data.languages {
                            for (language, value) in languages {
                                // All repositories source code bytes
                                stats.bytes += value.unsigned_abs();

                                // Number of repos using language
                                increment(&mut stats.languages, language, 1);

                                // Source code bytes per language
                                increment(&mut stats.languages_bytes, language, value.unsigned_abs());
                            }
                        }

                        // Licenses
                        if let Some(license) = &gh_data.license {
                            increment(&mut stats.licenses, license, 1);
                        }

                        // Participation stats
                        if stats.participation_stats.is_empty() {
                            stats.participation_stats = gh_data.participation_stats.clone();
                        } else {
                            stats.participation_stats = stats
                                .participation_stats
                                .iter()
                                .zip(&gh_data.participation_stats)
                                .map(|(accum_v, v)| accum_v + v)
                                .collect();
                        }

                        // Stars
                        stats.stars += gh_data.stars.unsigned_abs();
                    }
                }
            }
        }

        // Keep only top languages
        stats.languages = stats
            .languages
            .into_iter()
            .filter(|(language, _)| !EXCLUDED_LANGUAGES.contains(&language.as_str()))
            .sorted_by(|a, b| Ord::cmp(&b.1, &a.1))
            .take(10)
            .collect();
        stats.languages_bytes = stats
            .languages_bytes
            .into_iter()
            .filter(|(language, _)| !EXCLUDED_LANGUAGES.contains(&language.as_str()))
            .sorted_by(|a, b| Ord::cmp(&b.1, &a.1))
            .take(10)
            .collect();

        // Return stats collected
        if stats != RepositoriesStats::default() {
            return Some(stats);
        }
        None
    }
}

/// Languages to exclude from top lists.
const EXCLUDED_LANGUAGES: [&str; 7] = [
    "Batchfile",
    "Dockerfile",
    "Makefile",
    "Mustache",
    "PowerShell",
    "Shell",
    "Smarty",
];

/// Helper function to increment the value of an entry in a map by the value
/// provided if the entry exists, or insert a new entry with that value if it
/// doesn't.
fn increment<T>(map: &mut HashMap<T, u64>, key: &T, increment: u64)
where
    T: std::hash::Hash + Eq + Clone,
{
    if let Some(v) = map.get_mut(key) {
        *v += increment;
    } else {
        map.insert(key.clone(), increment);
    }
}

/// Calculate the running total of the values provided.
fn calculate_running_total(map: &HashMap<YearMonth, u64>) -> HashMap<YearMonth, u64> {
    let mut rt = HashMap::new();
    let mut acc = 0u64;

    for (k, v) in map.iter().sorted_by(|a, b| Ord::cmp(&a.0, &b.0)) {
        rt.insert(k.clone(), v + acc);
        acc += v;
    }

    rt
}

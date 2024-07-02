//! This module defines some types used to represent the some landscape stats,
//! as well as the functionality used to prepare them.

use super::{
    data::{CategoryName, SubcategoryName},
    settings::{LandscapeSettings, TagName},
};
use crate::data::LandscapeData;
use chrono::{Datelike, Utc};
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};

/// Format used to represent a date as year-month.
pub const YEAR_MONTH_FORMAT: &str = "%Y-%m";

/// Type alias to represent a year.
type Year = String;

/// Type alias to represent a month in a given year.
type YearMonth = String;

/// Landscape stats.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Stats {
    /// Foundation members stats.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub members: Option<MembersStats>,

    /// Foundation organizations stats.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub organizations: Option<OrganizationsStats>,

    /// Foundation projects stats.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub projects: Option<ProjectsStats>,

    /// Repositories stats.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repositories: Option<RepositoriesStats>,
}

impl Stats {
    /// Create a new Stats instance from the information available in the
    /// landscape.
    #[must_use]
    pub fn new(landscape_data: &LandscapeData, settings: &LandscapeSettings) -> Self {
        Self {
            members: MembersStats::new(landscape_data, settings),
            organizations: OrganizationsStats::new(landscape_data),
            projects: ProjectsStats::new(landscape_data),
            repositories: RepositoriesStats::new(landscape_data),
        }
    }
}

/// Some stats about the foundation's members.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct MembersStats {
    /// Number of members joined per year-month.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub joined_at: BTreeMap<YearMonth, u64>,

    /// Running total of number of members joined per year-month.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub joined_at_rt: BTreeMap<YearMonth, u64>,

    /// Total number of members.
    pub members: u64,

    /// Number of members per subcategory.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub subcategories: BTreeMap<String, u64>,
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

/// Some stats about the organizations in the landscape.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct OrganizationsStats {
    /// Total number of acquisitions per year across all organizations.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub acquisitions: BTreeMap<Year, u64>,

    /// Total acquisitions price per year across all organizations.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub acquisitions_price: BTreeMap<Year, u64>,

    /// Total number of funding rounds per year across all organizations.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub funding_rounds: BTreeMap<Year, u64>,

    /// Total money raised on funding rounds per year across all organizations.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub funding_rounds_money_raised: BTreeMap<Year, u64>,
}

impl OrganizationsStats {
    /// Create a new OrganizationsStats instance from the information available
    /// in the landscape.
    fn new(landscape_data: &LandscapeData) -> Option<Self> {
        let mut stats = OrganizationsStats::default();
        let mut crunchbase_data_processed = HashSet::new();

        // Collect stats from landscape items
        for item in &landscape_data.items {
            // Check if this crunchbase data has already been processed
            if let Some(url) = item.crunchbase_url.as_ref() {
                if crunchbase_data_processed.contains(url) {
                    continue;
                }
                crunchbase_data_processed.insert(url);
            }

            // Acquisitions
            if let Some(acquisitions) = item.crunchbase_data.as_ref().and_then(|d| d.acquisitions.as_ref()) {
                for acq in acquisitions {
                    if let Some(announced_on) = acq.announced_on {
                        let year = announced_on.format("%Y").to_string();
                        increment(&mut stats.acquisitions, &year, 1);
                        increment(
                            &mut stats.acquisitions_price,
                            &year,
                            acq.price.unwrap_or_default(),
                        );
                    }
                }
            }

            // Funding rounds
            if let Some(funding_rounds) =
                item.crunchbase_data.as_ref().and_then(|d| d.funding_rounds.as_ref())
            {
                for fr in funding_rounds {
                    if let Some(announced_on) = fr.announced_on {
                        // Only funding rounds in the last 5 years
                        if Utc::now().year() - announced_on.year() >= 5 {
                            continue;
                        }

                        let year = announced_on.format("%Y").to_string();
                        increment(&mut stats.funding_rounds, &year, 1);
                        increment(
                            &mut stats.funding_rounds_money_raised,
                            &year,
                            fr.amount.unwrap_or_default(),
                        );
                    }
                }
            }
        }

        // Return stats collected
        if stats != OrganizationsStats::default() {
            return Some(stats);
        }
        None
    }
}

/// Some stats about the landscape projects.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ProjectsStats {
    /// Number of projects accepted per year-month.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub accepted_at: BTreeMap<YearMonth, u64>,

    /// Running total of number of projects accepted per year-month.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub accepted_at_rt: BTreeMap<YearMonth, u64>,

    /// Number of security audits per year-month.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub audits: BTreeMap<YearMonth, u64>,

    /// Running total of number of security audits per year-month.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub audits_rt: BTreeMap<YearMonth, u64>,

    /// Number of projects per category and subcategory.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub category: BTreeMap<CategoryName, CategoryProjectsStats>,

    /// Promotions from incubating to graduated per year-month.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub incubating_to_graduated: BTreeMap<YearMonth, u64>,

    /// Number of projects per maturity.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub maturity: BTreeMap<String, u64>,

    /// Total number of projects.
    pub projects: u64,

    /// Promotions from sandbox to incubating per year-month.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub sandbox_to_incubating: BTreeMap<YearMonth, u64>,

    /// Number of projects per TAG.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub tag: BTreeMap<TagName, u64>,
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

                // Number of projects per category and subcategory
                if let Some(category_stats) = stats.category.get_mut(&item.category) {
                    category_stats.projects += 1;
                    increment(&mut category_stats.subcategories, &item.subcategory, 1);
                } else {
                    stats.category.insert(
                        item.category.clone(),
                        CategoryProjectsStats {
                            projects: 1,
                            subcategories: BTreeMap::from([(item.subcategory.clone(), 1)]),
                        },
                    );
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

                // Number of projects per TAG
                if let Some(tag) = &item.tag {
                    increment(&mut stats.tag, tag, 1);
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

/// Some stats about the projects in a category and its subcategories.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct CategoryProjectsStats {
    /// Number of projects in the category.
    pub projects: u64,

    /// Number of projects per subcategory.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub subcategories: BTreeMap<SubcategoryName, u64>,
}

/// Some stats about the repositories listed in the landscape.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct RepositoriesStats {
    /// Source code bytes.
    pub bytes: u64,

    /// Number of contributors.
    pub contributors: u64,

    /// Number of repositories where each language is used.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub languages: BTreeMap<String, u64>,

    /// Source code bytes written on each language.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub languages_bytes: BTreeMap<String, u64>,

    /// Number of repositories where each license is used.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub licenses: BTreeMap<String, u64>,

    /// Number of commits per week over the last year.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub participation_stats: Vec<i64>,

    /// Number of repositories.
    pub repositories: u64,

    /// Number of stars.
    pub stars: u64,
}

impl RepositoriesStats {
    /// Create a new RepositoriesStats instance from the information available
    /// in the landscape.
    fn new(landscape_data: &LandscapeData) -> Option<Self> {
        let mut stats = RepositoriesStats::default();
        let mut repositories_processed = HashSet::new();

        // Collect stats from landscape items
        for item in &landscape_data.items {
            if let Some(repos) = &item.repositories {
                for repo in repos {
                    // Check if this repository has already been processed
                    if repositories_processed.contains(&repo.url) {
                        continue;
                    }
                    repositories_processed.insert(&repo.url);

                    // Number of repositories
                    stats.repositories += 1;

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
                            stats.participation_stats.clone_from(&gh_data.participation_stats);
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
fn increment<T>(map: &mut BTreeMap<T, u64>, key: &T, increment: u64)
where
    T: std::hash::Hash + Ord + Eq + Clone,
{
    if let Some(v) = map.get_mut(key) {
        *v += increment;
    } else {
        map.insert(key.clone(), increment);
    }
}

/// Calculate the running total of the values provided.
fn calculate_running_total(map: &BTreeMap<YearMonth, u64>) -> BTreeMap<YearMonth, u64> {
    let mut rt = BTreeMap::new();
    let mut acc = 0u64;

    for (k, v) in map.iter().sorted_by(|a, b| Ord::cmp(&a.0, &b.0)) {
        rt.insert(k.clone(), v + acc);
        acc += v;
    }

    rt
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::{
        Acquisition, Contributors, FundingRound, Item, ItemAudit, Organization, Repository,
        RepositoryGithubData,
    };
    use chrono::NaiveDate;

    #[test]
    fn stats_new() {
        let landscape_data = LandscapeData::default();
        let settings = LandscapeSettings::default();

        let stats = Stats::new(&landscape_data, &settings);
        assert_eq!(stats, Stats::default());
    }

    #[test]
    fn members_stats_new() {
        let landscape_data = LandscapeData {
            categories: vec![],
            items: vec![
                Item {
                    name: "Member 1".to_string(),
                    category: "Members".to_string(),
                    subcategory: "Subcategory".to_string(),
                    joined_at: NaiveDate::from_ymd_opt(2024, 4, 2),
                    ..Default::default()
                },
                Item {
                    name: "Member 2".to_string(),
                    category: "Members".to_string(),
                    subcategory: "Subcategory".to_string(),
                    joined_at: NaiveDate::from_ymd_opt(2024, 5, 2),
                    ..Default::default()
                },
            ],
        };
        let settings = LandscapeSettings {
            members_category: Some("Members".to_string()),
            ..Default::default()
        };

        let members_stats = MembersStats::new(&landscape_data, &settings);
        let expected_members_stats = Some(MembersStats {
            joined_at: vec![("2024-04".to_string(), 1), ("2024-05".to_string(), 1)].into_iter().collect(),
            joined_at_rt: vec![("2024-04".to_string(), 1), ("2024-05".to_string(), 2)].into_iter().collect(),
            members: 2,
            subcategories: vec![("Subcategory".to_string(), 2)].into_iter().collect(),
        });
        pretty_assertions::assert_eq!(members_stats, expected_members_stats);
    }

    #[test]
    fn organization_stats_new() {
        let landscape_data = LandscapeData {
            categories: vec![],
            items: vec![
                Item {
                    name: "Organization 1".to_string(),
                    crunchbase_data: Some(Organization {
                        acquisitions: Some(vec![
                            Acquisition {
                                announced_on: NaiveDate::from_ymd_opt(2023, 5, 1),
                                price: Some(100),
                                ..Default::default()
                            },
                            Acquisition {
                                announced_on: NaiveDate::from_ymd_opt(2024, 5, 2),
                                price: Some(200),
                                ..Default::default()
                            },
                        ]),
                        funding_rounds: Some(vec![
                            FundingRound {
                                announced_on: NaiveDate::from_ymd_opt(2023, 5, 1),
                                amount: Some(100),
                                ..Default::default()
                            },
                            FundingRound {
                                announced_on: NaiveDate::from_ymd_opt(2024, 5, 2),
                                amount: Some(200),
                                ..Default::default()
                            },
                            FundingRound {
                                // This funding round will be ignored as it is older than 5 years
                                announced_on: Some(
                                    Utc::now().naive_utc().date() - chrono::Duration::days(365 * 10),
                                ),
                                amount: Some(1000),
                                ..Default::default()
                            },
                        ]),
                        ..Default::default()
                    }),
                    crunchbase_url: Some("https://crunchbase.com/org1".to_string()),
                    ..Default::default()
                },
                Item {
                    name: "Organization 2".to_string(),
                    crunchbase_data: Some(Organization {
                        acquisitions: Some(vec![Acquisition {
                            announced_on: NaiveDate::from_ymd_opt(2024, 5, 3),
                            price: Some(300),
                            ..Default::default()
                        }]),
                        funding_rounds: Some(vec![FundingRound {
                            announced_on: NaiveDate::from_ymd_opt(2024, 5, 3),
                            amount: Some(300),
                            ..Default::default()
                        }]),
                        ..Default::default()
                    }),
                    crunchbase_url: Some("https://crunchbase.com/org2".to_string()),
                    ..Default::default()
                },
                Item {
                    // This org will be ignored as it has the same crunchbase URL as the previous one
                    name: "Organization 3".to_string(),
                    crunchbase_data: Some(Organization {
                        acquisitions: Some(vec![Acquisition {
                            announced_on: NaiveDate::from_ymd_opt(2024, 5, 3),
                            price: Some(300),
                            ..Default::default()
                        }]),
                        ..Default::default()
                    }),
                    crunchbase_url: Some("https://crunchbase.com/org2".to_string()),
                    ..Default::default()
                },
            ],
        };

        let orgs_stats = OrganizationsStats::new(&landscape_data);
        let expected_orgs_stats = Some(OrganizationsStats {
            acquisitions: vec![("2023".to_string(), 1), ("2024".to_string(), 2)].into_iter().collect(),
            acquisitions_price: vec![("2023".to_string(), 100), ("2024".to_string(), 500)]
                .into_iter()
                .collect(),
            funding_rounds: vec![("2023".to_string(), 1), ("2024".to_string(), 2)].into_iter().collect(),
            funding_rounds_money_raised: vec![("2023".to_string(), 100), ("2024".to_string(), 500)]
                .into_iter()
                .collect(),
        });
        assert_eq!(orgs_stats, expected_orgs_stats);
    }

    #[test]
    fn projects_stats_new() {
        let landscape_data = LandscapeData {
            categories: vec![],
            items: vec![
                Item {
                    name: "Project 1".to_string(),
                    category: "Category 1".to_string(),
                    subcategory: "Subcategory 1".to_string(),
                    maturity: Some("graduated".to_string()),
                    homepage_url: "https://project1.com".to_string(),
                    accepted_at: NaiveDate::from_ymd_opt(2024, 4, 2),
                    incubating_at: NaiveDate::from_ymd_opt(2024, 4, 2),
                    graduated_at: NaiveDate::from_ymd_opt(2024, 4, 2),
                    tag: Some("tag1".to_string()),
                    audits: Some(vec![ItemAudit {
                        date: NaiveDate::from_ymd_opt(2024, 4, 2).unwrap(),
                        ..Default::default()
                    }]),
                    ..Default::default()
                },
                Item {
                    name: "Project 2".to_string(),
                    category: "Category 1".to_string(),
                    subcategory: "Subcategory 2".to_string(),
                    maturity: Some("incubating".to_string()),
                    homepage_url: "https://project2.com".to_string(),
                    accepted_at: NaiveDate::from_ymd_opt(2024, 5, 1),
                    incubating_at: NaiveDate::from_ymd_opt(2024, 5, 2),
                    tag: Some("tag1".to_string()),
                    audits: Some(vec![ItemAudit {
                        date: NaiveDate::from_ymd_opt(2024, 5, 2).unwrap(),
                        ..Default::default()
                    }]),
                    ..Default::default()
                },
                Item {
                    // This project will be ignored as it has the same homepage URL and logo as the previous one
                    name: "Project 3".to_string(),
                    category: "Category 1".to_string(),
                    subcategory: "Subcategory 2".to_string(),
                    maturity: Some("incubating".to_string()),
                    homepage_url: "https://project2.com".to_string(),
                    accepted_at: NaiveDate::from_ymd_opt(2024, 5, 1),
                    ..Default::default()
                },
            ],
        };

        let projects_stats = ProjectsStats::new(&landscape_data);
        let expected_projects_stats = Some(ProjectsStats {
            accepted_at: vec![("2024-04".to_string(), 1), ("2024-05".to_string(), 1)].into_iter().collect(),
            accepted_at_rt: vec![("2024-04".to_string(), 1), ("2024-05".to_string(), 2)]
                .into_iter()
                .collect(),
            audits: vec![("2024-04".to_string(), 1), ("2024-05".to_string(), 1)].into_iter().collect(),
            audits_rt: vec![("2024-04".to_string(), 1), ("2024-05".to_string(), 2)].into_iter().collect(),
            category: vec![(
                "Category 1".to_string(),
                CategoryProjectsStats {
                    projects: 2,
                    subcategories: vec![("Subcategory 1".to_string(), 1), ("Subcategory 2".to_string(), 1)]
                        .into_iter()
                        .collect(),
                },
            )]
            .into_iter()
            .collect(),
            incubating_to_graduated: vec![("2024-04".to_string(), 1)].into_iter().collect(),
            maturity: vec![("graduated".to_string(), 1), ("incubating".to_string(), 1)].into_iter().collect(),
            projects: 2,
            sandbox_to_incubating: vec![("2024-05".to_string(), 1)].into_iter().collect(),
            tag: vec![("tag1".to_string(), 2)].into_iter().collect(),
        });
        pretty_assertions::assert_eq!(projects_stats, expected_projects_stats);
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn repositories_stats_new() {
        let landscape_data = LandscapeData {
            categories: vec![],
            items: vec![
                Item {
                    name: "Project 1".to_string(),
                    repositories: Some(vec![Repository {
                        url: "https://repository1.url".to_string(),
                        github_data: Some(RepositoryGithubData {
                            contributors: Contributors {
                                count: 1,
                                ..Default::default()
                            },
                            languages: Some(
                                vec![
                                    ("Rust".to_string(), 100),
                                    ("Python".to_string(), 20),
                                    ("Shell".to_string(), 100), // In EXCLUDED_LANGUAGES
                                    ("otherlang1".to_string(), 5), // Out of top 10
                                    ("otherlang2".to_string(), 10),
                                    ("otherlang3".to_string(), 10),
                                    ("otherlang4".to_string(), 10),
                                    ("otherlang5".to_string(), 10),
                                    ("otherlang6".to_string(), 10),
                                    ("otherlang7".to_string(), 10),
                                    ("otherlang8".to_string(), 10),
                                    ("otherlang9".to_string(), 10),
                                ]
                                .into_iter()
                                .collect(),
                            ),
                            license: Some("Apache-2.0".to_string()),
                            participation_stats: vec![1, 2, 3],
                            stars: 10,
                            ..Default::default()
                        }),
                        ..Default::default()
                    }]),
                    ..Default::default()
                },
                Item {
                    name: "Project 2".to_string(),
                    repositories: Some(vec![
                        Repository {
                            url: "https://repository2.url".to_string(),
                            github_data: Some(RepositoryGithubData {
                                contributors: Contributors {
                                    count: 2,
                                    ..Default::default()
                                },
                                languages: Some(
                                    vec![
                                        ("Rust".to_string(), 200),
                                        ("Python".to_string(), 100),
                                        ("otherlang2".to_string(), 10),
                                        ("otherlang3".to_string(), 10),
                                        ("otherlang4".to_string(), 10),
                                        ("otherlang5".to_string(), 10),
                                        ("otherlang6".to_string(), 10),
                                        ("otherlang7".to_string(), 10),
                                        ("otherlang8".to_string(), 10),
                                        ("otherlang9".to_string(), 10),
                                    ]
                                    .into_iter()
                                    .collect(),
                                ),
                                license: Some("MIT".to_string()),
                                participation_stats: vec![4, 5, 6],
                                stars: 20,
                                ..Default::default()
                            }),
                            ..Default::default()
                        },
                        Repository {
                            // This repository will be ignored as it has the same URL as the previous one
                            url: "https://repository2.url".to_string(),
                            github_data: Some(RepositoryGithubData {
                                stars: 20,
                                ..Default::default()
                            }),
                            ..Default::default()
                        },
                    ]),
                    ..Default::default()
                },
            ],
        };

        let repositories_stats = RepositoriesStats::new(&landscape_data);
        let expected_repositories_stats = Some(RepositoriesStats {
            bytes: 685,
            contributors: 3,
            languages: vec![
                ("Rust".to_string(), 2),
                ("Python".to_string(), 2),
                ("otherlang2".to_string(), 2),
                ("otherlang3".to_string(), 2),
                ("otherlang4".to_string(), 2),
                ("otherlang5".to_string(), 2),
                ("otherlang6".to_string(), 2),
                ("otherlang7".to_string(), 2),
                ("otherlang8".to_string(), 2),
                ("otherlang9".to_string(), 2),
            ]
            .into_iter()
            .collect(),
            languages_bytes: vec![
                ("Rust".to_string(), 300),
                ("Python".to_string(), 120),
                ("otherlang2".to_string(), 20),
                ("otherlang3".to_string(), 20),
                ("otherlang4".to_string(), 20),
                ("otherlang5".to_string(), 20),
                ("otherlang6".to_string(), 20),
                ("otherlang7".to_string(), 20),
                ("otherlang8".to_string(), 20),
                ("otherlang9".to_string(), 20),
            ]
            .into_iter()
            .collect(),
            licenses: vec![("Apache-2.0".to_string(), 1), ("MIT".to_string(), 1)].into_iter().collect(),
            participation_stats: vec![5, 7, 9],
            repositories: 2,
            stars: 30,
        });
        pretty_assertions::assert_eq!(repositories_stats, expected_repositories_stats);
    }

    #[test]
    fn increment_works() {
        let mut map = std::collections::BTreeMap::new();
        increment(&mut map, &"key1", 1);
        increment(&mut map, &"key1", 1);
        increment(&mut map, &"key2", 1);

        assert_eq!(map.get(&"key1"), Some(&2));
        assert_eq!(map.get(&"key2"), Some(&1));
    }

    #[test]
    fn calculate_running_total_works() {
        let mut map = std::collections::BTreeMap::new();
        map.insert("2024-01".to_string(), 1);
        map.insert("2024-02".to_string(), 2);
        map.insert("2024-03".to_string(), 3);

        let rt = calculate_running_total(&map);
        assert_eq!(rt.get("2024-01"), Some(&1));
        assert_eq!(rt.get("2024-02"), Some(&3));
        assert_eq!(rt.get("2024-03"), Some(&6));
    }
}

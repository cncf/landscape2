//! This module defines some types used to represent some landscape stats,
//! as well as the functionality used to prepare them.

use std::collections::{BTreeMap, HashSet};

use chrono::{DateTime, Datelike, Utc};
use itertools::Itertools;
use serde::Serialize;

use crate::{
    data::{CategoryName, LandscapeData, SubcategoryName},
    settings::{LandscapeSettings, TagName},
};

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

/// Number of calendar years, counting the current one, covered by the
/// funding rounds stats.
pub const FUNDING_ROUNDS_YEARS: i32 = 5;

/// Format used to represent a date as year-month.
const YEAR_MONTH_FORMAT: &str = "%Y-%m";

/// Type alias to represent a year.
type Year = String;

/// Type alias to represent a month in a given year.
type YearMonth = String;

/// Landscape stats.
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct Stats {
    /// Time the stats were generated at.
    ///
    /// It is the reference time used to compute the stats time windows, and
    /// the anchor of the landscape-wide charts, such as the weekly
    /// participation stats.
    pub generated_at: DateTime<Utc>,

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
    /// landscape, using `now` as the reference time.
    #[must_use]
    pub fn new(landscape_data: &LandscapeData, settings: &LandscapeSettings, now: DateTime<Utc>) -> Self {
        Self {
            generated_at: now,
            members: MembersStats::new(landscape_data, settings),
            organizations: OrganizationsStats::new(landscape_data, now),
            projects: ProjectsStats::new(landscape_data),
            repositories: RepositoriesStats::new(landscape_data),
        }
    }
}

/// Some stats about the foundation's members.
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct MembersStats {
    /// Total number of members.
    pub members: u64,

    /// Number of members joined per year-month.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub joined_at: BTreeMap<YearMonth, u64>,

    /// Running total of number of members joined per year-month.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub joined_at_rt: BTreeMap<YearMonth, u64>,

    /// Number of members per subcategory.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub subcategories: BTreeMap<String, u64>,
}

impl MembersStats {
    /// Create a new MembersStats instance from the information available in
    /// the landscape and the settings.
    fn new(landscape_data: &LandscapeData, settings: &LandscapeSettings) -> Option<Self> {
        let Some(members_category) = &settings.members_category else {
            return None;
        };
        let mut stats = MembersStats::default();

        // Collect stats from the members category items
        for item in landscape_data.items.iter().filter(|i| &i.category == members_category) {
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
        stats.joined_at_rt = calculate_running_total(&stats.joined_at);

        // Return stats collected
        if stats != MembersStats::default() {
            return Some(stats);
        }
        None
    }
}

/// Some stats about the organizations in the landscape.
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct OrganizationsStats {
    /// Total number of acquisitions per year across all organizations.
    ///
    /// It covers every year with acquisitions, without any time window.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub acquisitions: BTreeMap<Year, u64>,

    /// Total acquisitions price per year across all organizations.
    ///
    /// It covers every year with acquisitions, without any time window.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub acquisitions_price: BTreeMap<Year, u64>,

    /// Total number of funding rounds per year across all organizations.
    ///
    /// It only covers the last [`FUNDING_ROUNDS_YEARS`] calendar years,
    /// counting the year of the stats reference time.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub funding_rounds: BTreeMap<Year, u64>,

    /// Total money raised on funding rounds per year across all organizations.
    ///
    /// It only covers the last [`FUNDING_ROUNDS_YEARS`] calendar years,
    /// counting the year of the stats reference time.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub funding_rounds_money_raised: BTreeMap<Year, u64>,
}

impl OrganizationsStats {
    /// Create a new OrganizationsStats instance from the information available
    /// in the landscape, using `now` as the reference time for the funding
    /// rounds window.
    fn new(landscape_data: &LandscapeData, now: DateTime<Utc>) -> Option<Self> {
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
                        // Only funding rounds in the last calendar years
                        if now.year() - announced_on.year() >= FUNDING_ROUNDS_YEARS {
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
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct ProjectsStats {
    /// Total number of projects.
    pub projects: u64,

    /// Number of projects accepted per year-month.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub accepted_at: BTreeMap<YearMonth, u64>,

    /// Running total of number of projects accepted per year-month.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub accepted_at_rt: BTreeMap<YearMonth, u64>,

    /// Number of security audits per year-month.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub audits: BTreeMap<YearMonth, u64>,

    /// Running total of number of security audits per year-month.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub audits_rt: BTreeMap<YearMonth, u64>,

    /// Number of projects per category and subcategory.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub category: BTreeMap<CategoryName, CategoryProjectsStats>,

    /// Promotions from incubating to graduated per year-month.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub incubating_to_graduated: BTreeMap<YearMonth, u64>,

    /// Number of projects per maturity.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub maturity: BTreeMap<String, u64>,

    /// Promotions from sandbox to incubating per year-month.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub sandbox_to_incubating: BTreeMap<YearMonth, u64>,

    /// Number of projects per TAG.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub tag: BTreeMap<TagName, u64>,
}

impl ProjectsStats {
    /// Create a new ProjectsStats instance from the information available in
    /// the landscape.
    fn new(landscape_data: &LandscapeData) -> Option<Self> {
        let mut stats = ProjectsStats::default();

        // Collect stats from landscape items
        let mut projects_seen: HashSet<(&str, &str)> = HashSet::new();
        for item in &landscape_data.items {
            if let Some(maturity) = &item.maturity {
                // Check for duplicates
                if !projects_seen.insert((&item.homepage_url, &item.logo)) {
                    continue;
                }

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
                let category_stats = stats.category.entry(item.category.clone()).or_default();
                category_stats.projects += 1;
                increment(&mut category_stats.subcategories, &item.subcategory, 1);

                // Number of projects per maturity
                increment(&mut stats.maturity, maturity, 1);

                // Promotions from sandbox to incubating
                if let Some(incubating_at) = &item.incubating_at
                    && let Some(accepted_at) = &item.accepted_at
                    && incubating_at != accepted_at
                {
                    let year_month = incubating_at.format(YEAR_MONTH_FORMAT).to_string();
                    increment(&mut stats.sandbox_to_incubating, &year_month, 1);
                }

                // Promotions from incubating to graduated (projects accepted
                // directly as graduated are not promotions)
                if let Some(graduated_at) = &item.graduated_at
                    && item.accepted_at.as_ref() != Some(graduated_at)
                {
                    let year_month = graduated_at.format(YEAR_MONTH_FORMAT).to_string();
                    increment(&mut stats.incubating_to_graduated, &year_month, 1);
                }

                // Number of projects per TAG
                if let Some(tags) = &item.tag {
                    for tag in tags {
                        increment(&mut stats.tag, tag, 1);
                    }
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
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct CategoryProjectsStats {
    /// Number of projects in the category.
    pub projects: u64,

    /// Number of projects per subcategory.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub subcategories: BTreeMap<SubcategoryName, u64>,
}

/// Some stats about the repositories listed in the landscape.
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct RepositoriesStats {
    /// Source code bytes.
    pub bytes: u64,
    /// Number of contributors.
    pub contributors: u64,
    /// Number of repositories.
    pub repositories: u64,
    /// Number of stars.
    pub stars: u64,

    /// Number of repositories where each language is used.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub languages: BTreeMap<String, u64>,

    /// Source code bytes written on each language.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub languages_bytes: BTreeMap<String, u64>,

    /// Number of repositories where each license is used.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub licenses: BTreeMap<String, u64>,

    /// Number of commits per week over the last year, summed across
    /// repositories with the most recent weeks aligned (last entry).
    #[serde(skip_serializing_if = "Vec::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub participation_stats: Vec<i64>,
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

                    // Licenses
                    let mut license_overriden = false;
                    if let Some(license) = &repo.license {
                        license_overriden = true;
                        increment(&mut stats.licenses, license, 1);
                    }

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
                        if !license_overriden && let Some(license) = &gh_data.license {
                            increment(&mut stats.licenses, license, 1);
                        }

                        // Participation stats
                        add_participation_stats(&mut stats.participation_stats, &gh_data.participation_stats);

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

/// Add the weekly participation stats provided to the accumulator.
///
/// Both series are right-aligned, as the last entry of a GitHub participation
/// series is the most recent week. Empty series (e.g. stats still being
/// computed by GitHub) are skipped.
fn add_participation_stats(acc: &mut Vec<i64>, weekly: &[i64]) {
    // Skip repositories without participation stats
    if weekly.is_empty() {
        return;
    }

    // Pad the accumulator at the front when the new series is longer
    if weekly.len() > acc.len() {
        let padding = weekly.len() - acc.len();
        acc.splice(0..0, std::iter::repeat_n(0, padding));
    }

    // Add the new series element-wise, aligning the most recent weeks
    let offset = acc.len() - weekly.len();
    for (acc_value, value) in acc[offset..].iter_mut().zip(weekly) {
        *acc_value += value;
    }
}

/// Calculate the running total of the values provided.
fn calculate_running_total(map: &BTreeMap<YearMonth, u64>) -> BTreeMap<YearMonth, u64> {
    let mut rt = BTreeMap::new();
    let mut acc = 0u64;

    for (k, v) in map {
        rt.insert(k.clone(), v + acc);
        acc += v;
    }

    rt
}

/// Helper function to increment the value of an entry in a map by the value
/// provided if the entry exists, or insert a new entry with that value if it
/// doesn't.
fn increment<T>(map: &mut BTreeMap<T, u64>, key: &T, increment: u64)
where
    T: Ord + Clone,
{
    *map.entry(key.clone()).or_default() += increment;
}

#[cfg(test)]
mod tests;

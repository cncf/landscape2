//! This module defines the types used to represent the landscape data that is
//! usually provided from a YAML file (landscape.yml). The landscape data is
//! the main source of information for a landscape.
//!
//! The landscape data representation used in this module doesn't match the
//! legacy format used by the existing landscapes data files. To maintain
//! backwards compatibility, this module provides a `legacy` submodule that
//! allows parsing the legacy format and convert it to the new one.

use super::settings::{self, LandscapeSettings};
use crate::util::normalize_name;
use anyhow::{bail, Context, Result};
use chrono::{DateTime, NaiveDate, Utc};
use clap::Args;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, HashMap},
    fs,
    path::{Path, PathBuf},
};
use tracing::{debug, instrument, warn};

mod legacy;

/// Format used for dates across the landscape data file.
#[allow(dead_code)]
pub const DATE_FORMAT: &str = "%Y-%m-%d";

/// Type alias to represent a category name.
pub type CategoryName = String;

/// Type alias to represent some organizations' Crunchbase data.
pub type CrunchbaseData = BTreeMap<CrunchbaseUrl, Organization>;

/// Type alias to represent a crunchbase url.
pub type CrunchbaseUrl = String;

/// Type alias to represent some repositories' GitHub data.
pub type GithubData = BTreeMap<RepositoryUrl, RepositoryGithubData>;

/// Type alias to represent a GitHub repository url.
pub type RepositoryUrl = String;

/// Type alias to represent a subcategory name.
pub type SubCategoryName = String;

/// Landscape data source.
#[derive(Args, Default)]
#[group(required = true, multiple = false)]
pub struct DataSource {
    /// Landscape data file local path.
    #[arg(long)]
    pub data_file: Option<PathBuf>,

    /// Landscape data file url.
    #[arg(long)]
    pub data_url: Option<String>,
}

impl DataSource {
    /// Create a new data source from the url provided.
    #[must_use]
    pub fn new_from_url(url: String) -> Self {
        Self {
            data_file: None,
            data_url: Some(url),
        }
    }
}

/// Landscape data.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct LandscapeData {
    pub categories: Vec<Category>,
    pub items: Vec<Item>,
}

impl LandscapeData {
    /// Create a new landscape data instance from the source provided.
    #[instrument(skip_all, err)]
    pub async fn new(src: &DataSource) -> Result<Self> {
        // Try from file
        if let Some(file) = &src.data_file {
            debug!(?file, "getting landscape data from file");
            return LandscapeData::new_from_file(file);
        };

        // Try from url
        if let Some(url) = &src.data_url {
            debug!(?url, "getting landscape data from url");
            return LandscapeData::new_from_url(url).await;
        };

        bail!("data file or url not provided");
    }

    /// Create a new landscape data instance from the file provided.
    fn new_from_file(file: &Path) -> Result<Self> {
        let raw_data = fs::read_to_string(file)?;
        let landscape_data = LandscapeData::new_from_raw_data(&raw_data)?;

        Ok(landscape_data)
    }

    /// Create a new landscape data instance from the url provided.
    async fn new_from_url(url: &str) -> Result<Self> {
        let resp = reqwest::get(url).await?;
        if resp.status() != StatusCode::OK {
            bail!(
                "unexpected status code getting landscape data file: {}",
                resp.status()
            );
        }
        let raw_data = resp.text().await?;
        let landscape_data = LandscapeData::new_from_raw_data(&raw_data)?;

        Ok(landscape_data)
    }

    /// Create a new landscape data instance from the raw legacy data provided.
    fn new_from_raw_data(raw_data: &str) -> Result<Self> {
        let legacy_data: legacy::LandscapeData =
            serde_yaml::from_str(raw_data).context("invalid yaml file")?;
        legacy_data.validate()?;
        let landscape_data = LandscapeData::from(legacy_data);

        Ok(landscape_data)
    }

    /// Add items Crunchbase data.
    #[instrument(skip_all)]
    pub fn add_crunchbase_data(&mut self, crunchbase_data: &CrunchbaseData) {
        for item in &mut self.items {
            if let Some(crunchbase_url) = item.crunchbase_url.as_ref() {
                if let Some(org_crunchbase_data) = crunchbase_data.get(crunchbase_url) {
                    item.crunchbase_data = Some(org_crunchbase_data.clone());
                }
            }
        }
    }

    /// Add featured items information to the landscape data based on the
    /// settings provided (i.e. graduated and incubating projects must be
    /// featured and the former displayed first).
    #[instrument(skip_all)]
    pub fn add_featured_items_data(&mut self, settings: &LandscapeSettings) {
        let Some(rules) = &settings.featured_items else {
            return;
        };

        for rule in rules {
            match rule.field.as_str() {
                "maturity" => {
                    for item in &mut self.items {
                        if let Some(item_maturity) = item.maturity.as_ref() {
                            if let Some(option) = rule.options.iter().find(|o| o.value == *item_maturity) {
                                item.featured = Some(ItemFeatured {
                                    order: option.order,
                                    label: option.label.clone(),
                                });
                            }
                        }
                    }
                }
                "subcategory" => {
                    for item in &mut self.items {
                        if let Some(option) = rule.options.iter().find(|o| o.value == item.subcategory) {
                            item.featured = Some(ItemFeatured {
                                order: option.order,
                                label: option.label.clone(),
                            });
                        }
                    }
                }
                _ => {}
            }
        }
    }

    /// Add items repositories GitHub data.
    #[instrument(skip_all)]
    pub fn add_github_data(&mut self, github_data: &GithubData) {
        for item in &mut self.items {
            // Add GH data to each of the items repositories
            if item.repositories.is_some() {
                let mut repositories = vec![];
                for mut repo in item.repositories.clone().unwrap_or_default() {
                    if let Some(repo_github_data) = github_data.get(&repo.url) {
                        repo.github_data = Some(repo_github_data.clone());
                    }
                    repositories.push(repo);
                }
                item.repositories = Some(repositories);
            }

            // Set item's oss field
            if item
                .primary_repository()
                .and_then(|repo| repo.github_data.as_ref())
                .and_then(|gh_data| gh_data.license.as_ref())
                .is_some()
            {
                item.oss = Some(true);
            }
        }
    }

    /// Add items member subcategory.
    #[cfg_attr(feature = "instrument", instrument(skip_all))]
    pub fn add_member_subcategory(&mut self, members_category: &Option<String>) {
        let Some(members_category) = members_category else {
            return;
        };

        // Create a map with the member subcategory for each Crunchbase url
        let mut members_subcategories: HashMap<String, String> = HashMap::new();
        for item in self.items.iter().filter(|i| &i.category == members_category) {
            if let Some(crunchbase_url) = &item.crunchbase_url {
                members_subcategories.insert(crunchbase_url.clone(), item.subcategory.clone());
            }
        }

        // Set item's member subcategory using the item's Crunchbase url to match
        for item in &mut self.items {
            if let Some(crunchbase_url) = &item.crunchbase_url {
                if let Some(member_subcategory) = members_subcategories.get(crunchbase_url) {
                    item.member_subcategory = Some(member_subcategory.clone());
                }
            }
        }
    }

    /// Add projects items TAG based on the TAGs settings.
    #[cfg_attr(feature = "instrument", instrument(skip_all))]
    pub fn add_tags(&mut self, settings: &LandscapeSettings) {
        let Some(tags) = &settings.tags else {
            return;
        };

        // Helper closure to find the tag of an item
        let find_tag = |item: &Item| {
            // Iterate over the rules looking for a match
            for (tag, rules) in tags {
                for rule in rules {
                    // Consider an empty list of subcategories as None
                    let subcategories = rule.subcategories.as_ref().and_then(|s| {
                        if s.is_empty() {
                            return None;
                        }
                        Some(s)
                    });

                    if let Some(subcategories) = subcategories {
                        if item.category == rule.category && subcategories.contains(&item.subcategory) {
                            return Some(tag.clone());
                        }
                    } else if item.category == rule.category {
                        return Some(tag.clone());
                    }
                }
            }

            None
        };

        // Iterate over items and set TAG when found
        for item in &mut self.items {
            // Only projects should be owned by a TAG
            if item.maturity.is_none() {
                continue;
            }

            // TAGs already set at the item level have precedence
            if item.tag.is_some() {
                continue;
            }

            // Try to find the appropriate TAG based on the settings
            if let Some(tag) = find_tag(item) {
                item.tag = Some(tag);
            }
        }
    }
}

impl From<legacy::LandscapeData> for LandscapeData {
    #[allow(clippy::too_many_lines)]
    fn from(legacy_data: legacy::LandscapeData) -> Self {
        let mut data = LandscapeData::default();

        // Categories
        for legacy_category in legacy_data.landscape {
            let mut category = Category {
                name: legacy_category.name.clone(),
                normalized_name: normalize_name(&legacy_category.name),
                subcategories: vec![],
            };

            // Subcategories
            for legacy_subcategory in legacy_category.subcategories {
                category.subcategories.push(SubCategory {
                    name: legacy_subcategory.name.clone(),
                    normalized_name: normalize_name(&legacy_subcategory.name),
                });

                // Items
                for legacy_item in legacy_subcategory.items {
                    // Base item information
                    let mut item = Item {
                        name: legacy_item.name,
                        category: legacy_category.name.clone(),
                        crunchbase_url: legacy_item.crunchbase,
                        description: legacy_item.description.clone(),
                        enduser: legacy_item.enduser,
                        joined_at: legacy_item.joined,
                        homepage_url: legacy_item.homepage_url,
                        logo: legacy_item.logo,
                        maturity: legacy_item.project,
                        openssf_best_practices_url: legacy_item.url_for_bestpractices,
                        subcategory: legacy_subcategory.name.clone(),
                        twitter_url: legacy_item.twitter,
                        unnamed_organization: legacy_item.unnamed_organization,
                        ..Default::default()
                    };
                    item.set_id();

                    // Additional categories
                    if let Some(second_path) = legacy_item.second_path {
                        let mut additional_categories = vec![];
                        for entry in second_path {
                            // Extract category/subcategory from second path entry
                            let parts: Vec<&str> = entry.split('/').collect();
                            if parts.len() != 2 {
                                warn!("invalid second path entry ({entry}), ignoring it");
                                continue;
                            }
                            let category = parts[0].trim().to_string();
                            let subcategory = parts[1].trim().to_string();
                            if category.is_empty() || subcategory.is_empty() {
                                warn!("invalid second path entry ({entry}), ignoring it");
                                continue;
                            }

                            // Prepare additional category and track it
                            let additional_category = AdditionalCategory {
                                category,
                                subcategory,
                            };
                            additional_categories.push(additional_category);
                        }
                        if !additional_categories.is_empty() {
                            item.additional_categories = Some(additional_categories);
                        }
                    }

                    // Repositories
                    let mut repositories = vec![];
                    if let Some(url) = legacy_item.repo_url {
                        repositories.push(Repository {
                            url,
                            branch: legacy_item.branch,
                            primary: Some(true),
                            ..Default::default()
                        });
                    }
                    if let Some(additional_repos) = legacy_item.additional_repos {
                        for entry in additional_repos {
                            repositories.push(Repository {
                                url: entry.repo_url,
                                branch: entry.branch,
                                primary: Some(false),
                                ..Default::default()
                            });
                        }
                    }
                    if !repositories.is_empty() {
                        item.repositories = Some(repositories);
                    }

                    // Additional information in extra field
                    if let Some(extra) = legacy_item.extra {
                        item.accepted_at = extra.accepted;
                        item.archived_at = extra.archived;
                        item.artwork_url = extra.artwork_url;
                        item.audits = extra.audits;
                        item.blog_url = extra.blog_url;
                        item.chat_channel = extra.chat_channel;
                        item.clomonitor_name = extra.clomonitor_name;
                        item.devstats_url = extra.dev_stats_url;
                        item.discord_url = extra.discord_url;
                        item.github_discussions_url = extra.github_discussions_url;
                        item.gitter_url = extra.gitter_url;
                        item.graduated_at = extra.graduated;
                        item.incubating_at = extra.incubating;
                        item.latest_annual_review_at = extra.annual_review_date;
                        item.latest_annual_review_url = extra.annual_review_url;
                        item.linkedin_url = extra.linkedin_url;
                        item.mailing_list_url = extra.mailing_list_url;
                        item.package_manager_url = extra.package_manager_url;
                        item.parent_project = extra.parent_project;
                        item.slack_url = extra.slack_url;
                        item.specification = extra.specification;
                        item.stack_overflow_url = extra.stack_overflow_url;
                        item.tag = extra.tag;
                        item.training_certifications = extra.training_certifications;
                        item.training_type = extra.training_type;
                        item.youtube_url = extra.youtube_url;

                        // Summary information
                        let mut summary = ItemSummary {
                            business_use_case: extra.summary_business_use_case,
                            integration: extra.summary_integration,
                            integrations: extra.summary_integrations,
                            intro_url: extra.summary_intro_url,
                            release_rate: extra.summary_release_rate,
                            use_case: extra.summary_use_case,
                            ..Default::default()
                        };
                        if let Some(personas) = extra.summary_personas {
                            let v: Vec<String> = personas.split(',').map(|p| p.trim().to_string()).collect();
                            if !v.is_empty() {
                                summary.personas = Some(v);
                            }
                        }
                        if let Some(tags) = extra.summary_tags {
                            let v: Vec<String> = tags.split(',').map(|t| t.trim().to_string()).collect();
                            if !v.is_empty() {
                                summary.tags = Some(v);
                            }
                        }
                        if summary != ItemSummary::default() {
                            item.summary = Some(summary);
                        }
                    }

                    data.items.push(item);
                }
            }

            data.categories.push(category);
        }

        data
    }
}

/// Landscape category.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Category {
    pub name: CategoryName,
    pub normalized_name: CategoryName,
    pub subcategories: Vec<SubCategory>,
}

impl From<&settings::Category> for Category {
    fn from(settings_category: &settings::Category) -> Self {
        Self {
            name: settings_category.name.clone(),
            normalized_name: normalize_name(&settings_category.name),
            subcategories: settings_category
                .subcategories
                .iter()
                .map(|sc| SubCategory {
                    name: sc.clone(),
                    normalized_name: normalize_name(sc),
                })
                .collect(),
        }
    }
}

/// Landscape subcategory.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct SubCategory {
    pub name: SubCategoryName,
    pub normalized_name: SubCategoryName,
}

/// Landscape item (project, product, member, etc).
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Item {
    pub category: String,
    pub homepage_url: String,
    pub id: String,
    pub logo: String,
    pub name: String,
    pub subcategory: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub accepted_at: Option<NaiveDate>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub additional_categories: Option<Vec<AdditionalCategory>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub archived_at: Option<NaiveDate>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub artwork_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub audits: Option<Vec<ItemAudit>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub blog_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub chat_channel: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub clomonitor_name: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub clomonitor_report_summary: Option<String>,

    #[serde(skip_serializing)]
    pub crunchbase_data: Option<Organization>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub crunchbase_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub devstats_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub discord_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub docker_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub enduser: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub featured: Option<ItemFeatured>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub github_discussions_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub gitter_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub graduated_at: Option<NaiveDate>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub incubating_at: Option<NaiveDate>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub joined_at: Option<NaiveDate>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub linkedin_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub mailing_list_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub maturity: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub member_subcategory: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_annual_review_at: Option<NaiveDate>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_annual_review_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub openssf_best_practices_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub oss: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub package_manager_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_project: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub repositories: Option<Vec<Repository>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub slack_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub specification: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack_overflow_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<ItemSummary>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub training_certifications: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub training_type: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub twitter_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub unnamed_organization: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub youtube_url: Option<String>,
}

impl Item {
    /// Get item's description.
    #[allow(clippy::missing_panics_doc)]
    #[must_use]
    pub fn description(&self) -> Option<&String> {
        // Use item's description if available
        let mut description = self.description.as_ref();

        // Otherwise, use primary repository description if available
        if description.is_none() || description.expect("it to be present").is_empty() {
            description =
                self.primary_repository().and_then(|r| r.github_data.as_ref().map(|gh| &gh.description));
        }

        // Otherwise, use Crunchbase data description
        if description.is_none() || description.unwrap().is_empty() {
            description = self.crunchbase_data.as_ref().and_then(|cb| cb.description.as_ref());
        }

        description
    }

    /// Get primary repository if available.
    #[must_use]
    pub fn primary_repository(&self) -> Option<&Repository> {
        self.repositories
            .as_ref()
            .and_then(|repos| repos.iter().find(|r| r.primary.unwrap_or_default()))
    }

    /// Generate and set the item's id.
    fn set_id(&mut self) {
        self.id = format!(
            "{}--{}--{}",
            normalize_name(&self.category),
            normalize_name(&self.subcategory),
            normalize_name(&self.name)
        );
    }
}

/// Crunchbase acquisition details.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Acquisition {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub acquiree_cb_permalink: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub acquiree_name: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub announced_on: Option<NaiveDate>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub price: Option<u64>,
}

/// Additional category/subcategory an item can belong to.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct AdditionalCategory {
    pub category: CategoryName,
    pub subcategory: SubCategoryName,
}

/// Commit information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Commit {
    pub ts: Option<DateTime<Utc>>,
    pub url: String,
}

/// Contributors information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Contributors {
    pub count: usize,
    pub url: String,
}

/// Crunchbase funding round details.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct FundingRound {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub amount: Option<u64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub announced_on: Option<NaiveDate>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
}

/// Landscape item audit information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ItemAudit {
    pub date: NaiveDate,
    #[serde(rename = "type")]
    pub kind: String,
    pub url: String,
    pub vendor: String,
}

/// Landscape item featured information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ItemFeatured {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub order: Option<usize>,
}

/// Landscape item summary.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ItemSummary {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub business_use_case: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub integration: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub integrations: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub intro_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub personas: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub release_rate: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub use_case: Option<String>,
}

/// Organization information collected from Crunchbase.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Organization {
    pub generated_at: DateTime<Utc>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub acquisitions: Option<Vec<Acquisition>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub city: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub company_type: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub country: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub funding: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub funding_rounds: Option<Vec<FundingRound>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub homepage_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub linkedin_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_employees_max: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_employees_min: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub region: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub stock_exchange: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub ticker: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub twitter_url: Option<String>,
}

/// Release information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Release {
    pub ts: Option<DateTime<Utc>>,
    pub url: String,
}

/// Repository information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Repository {
    pub url: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,

    #[serde(skip_serializing)]
    pub github_data: Option<RepositoryGithubData>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary: Option<bool>,
}

/// Repository information collected from GitHub.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct RepositoryGithubData {
    pub contributors: Contributors,
    pub description: String,
    pub generated_at: DateTime<Utc>,
    pub latest_commit: Commit,
    pub participation_stats: Vec<i64>,
    pub stars: i64,
    pub topics: Vec<String>,
    pub url: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_commit: Option<Commit>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub languages: Option<BTreeMap<String, i64>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_release: Option<Release>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
}

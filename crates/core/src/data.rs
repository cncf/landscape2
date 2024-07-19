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
pub type SubcategoryName = String;

/// Landscape data source.
#[derive(Args, Default, Debug, Clone, PartialEq)]
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
    #[instrument(skip_all)]
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
    #[instrument(skip_all)]
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

    /// Set items `enduser` flag based on the settings provided.
    #[instrument(skip_all)]
    pub fn set_enduser_flag(&mut self, settings: &LandscapeSettings) {
        let Some(enduser) = &settings.enduser else {
            return;
        };

        // Iterate over items and set enduser flag when applicable
        for item in &mut self.items {
            // `enduser` values set at the item level have precedence
            if item.enduser.is_some() {
                continue;
            }

            // Set `enduser` flag when the category/subcategory matches
            for rule in enduser {
                // Consider an empty list of subcategories as None
                let subcategories = rule.subcategories.as_ref().and_then(|s| {
                    if s.is_empty() {
                        return None;
                    }
                    Some(s)
                });

                if let Some(subcategories) = &subcategories {
                    if item.category == rule.category && subcategories.contains(&item.subcategory) {
                        item.enduser = Some(true);
                    }
                } else if item.category == rule.category {
                    item.enduser = Some(true);
                }
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
                category.subcategories.push(Subcategory {
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
                            github_data: None,
                            primary: Some(true),
                        });
                    }
                    if let Some(additional_repos) = legacy_item.additional_repos {
                        for entry in additional_repos {
                            repositories.push(Repository {
                                url: entry.repo_url,
                                branch: entry.branch,
                                github_data: None,
                                primary: Some(false),
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
                        item.docker_url = extra.docker_url;
                        item.documentation_url = extra.documentation_url;
                        item.github_discussions_url = extra.github_discussions_url;
                        item.gitter_url = extra.gitter_url;
                        item.graduated_at = extra.graduated;
                        item.incubating_at = extra.incubating;
                        item.latest_annual_review_at = extra.annual_review_date;
                        item.latest_annual_review_url = extra.annual_review_url;
                        item.linkedin_url = extra.linkedin_url;
                        item.mailing_list_url = extra.mailing_list_url;
                        item.other_links = extra.other_links;
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
                            personas: None,
                            release_rate: extra.summary_release_rate,
                            tags: None,
                            use_case: extra.summary_use_case,
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

                    item.set_id();
                    item.set_website();
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
    pub subcategories: Vec<Subcategory>,
}

impl From<&settings::Category> for Category {
    fn from(settings_category: &settings::Category) -> Self {
        Self {
            name: settings_category.name.clone(),
            normalized_name: normalize_name(&settings_category.name),
            subcategories: settings_category
                .subcategories
                .iter()
                .map(|sc| Subcategory {
                    name: sc.clone(),
                    normalized_name: normalize_name(sc),
                })
                .collect(),
        }
    }
}

/// Landscape subcategory.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Subcategory {
    pub name: SubcategoryName,
    pub normalized_name: SubcategoryName,
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
    pub website: String,

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
    pub documentation_url: Option<String>,

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
    pub other_links: Option<Vec<ItemLink>>,

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

    /// Set item's website.
    ///
    /// The homepage URL is the preferred source for the website. However, when
    /// it matches the primary repository URL, we'll fallback to the homepage
    /// URL defined in the Crunchbase data -when available-.
    pub fn set_website(&mut self) {
        if let Some(primary_repository) = self.primary_repository() {
            if self.homepage_url == primary_repository.url {
                if let Some(crunchbase_data) = &self.crunchbase_data {
                    if let Some(cb_homepage_url) = &crunchbase_data.homepage_url {
                        self.website.clone_from(cb_homepage_url);
                        return;
                    }
                }
            }
        }

        self.website.clone_from(&self.homepage_url);
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
    pub subcategory: SubcategoryName,
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

/// Landscape item link.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ItemLink {
    pub name: String,
    pub url: String,
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
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::{EndUserRule, FeaturedItemRule, FeaturedItemRuleOption, TagRule};

    const DATA_FILE: &str = "data.yml";
    const TESTS_DATA_FILE: &str = "src/testdata/data.yml";

    #[test]
    fn datasource_new_from_url() {
        let url = "https://example.url/data.yml";
        let src = DataSource::new_from_url(url.to_string());
        assert_eq!(
            src,
            DataSource {
                data_file: None,
                data_url: Some(url.to_string()),
            }
        );
    }

    #[tokio::test]
    async fn landscape_data_new_using_file() {
        let src = DataSource {
            data_file: Some(PathBuf::from(TESTS_DATA_FILE)),
            data_url: None,
        };
        let _ = LandscapeData::new(&src).await.unwrap();
    }

    #[tokio::test]
    async fn landscape_data_new_using_url() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", format!("/{DATA_FILE}").as_str())
            .with_status(200)
            .with_body_from_file(TESTS_DATA_FILE)
            .create_async()
            .await;

        let src = DataSource::new_from_url(format!("{}/{DATA_FILE}", server.url()));
        let _ = LandscapeData::new(&src).await.unwrap();
        mock.assert_async().await;
    }

    #[tokio::test]
    #[should_panic(expected = "data file or url not provided")]
    async fn landscape_data_new_no_file_or_url_provided() {
        let src = DataSource::default();
        let _ = LandscapeData::new(&src).await.unwrap();
    }

    #[test]
    fn landscape_data_new_from_file() {
        let file = Path::new(TESTS_DATA_FILE);
        let _ = LandscapeData::new_from_file(file).unwrap();
    }

    #[tokio::test]
    async fn landscape_data_new_from_url() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", format!("/{DATA_FILE}").as_str())
            .with_status(200)
            .with_body_from_file(TESTS_DATA_FILE)
            .create_async()
            .await;

        let url = format!("{}/{DATA_FILE}", server.url());
        let _ = LandscapeData::new_from_url(&url).await.unwrap();
        mock.assert_async().await;
    }

    #[tokio::test]
    #[should_panic(expected = "unexpected status code getting landscape data file: 404")]
    async fn landscape_data_new_from_url_not_found() {
        let mut server = mockito::Server::new_async().await;
        let mock = server.mock("GET", format!("/{DATA_FILE}").as_str()).with_status(404).create_async().await;

        let url = format!("{}/{DATA_FILE}", server.url());
        let _ = LandscapeData::new_from_url(&url).await.unwrap();
        mock.assert_async().await;
    }

    #[test]
    fn landscape_data_new_from_raw_data() {
        let raw_data = fs::read_to_string(TESTS_DATA_FILE).unwrap();
        let _ = LandscapeData::new_from_raw_data(&raw_data).unwrap();
    }

    #[test]
    fn landscape_data_add_crunchbase_data() {
        let mut landscape_data = LandscapeData::default();
        let crunchbase_url = "https://crunchbase.url/test".to_string();
        landscape_data.items.push(Item {
            crunchbase_url: Some(crunchbase_url.clone()),
            ..Default::default()
        });

        let mut crunchbase_data = CrunchbaseData::default();
        let org = Organization {
            name: Some("test".to_string()),
            ..Default::default()
        };
        crunchbase_data.insert(crunchbase_url, org.clone());

        landscape_data.add_crunchbase_data(&crunchbase_data);
        assert_eq!(landscape_data.items[0].crunchbase_data, Some(org));
    }

    #[test]
    fn landscape_data_add_featured_items_data_maturity() {
        let mut landscape_data = LandscapeData::default();
        landscape_data.items.push(Item {
            maturity: Some("graduated".to_string()),
            ..Default::default()
        });

        let settings = LandscapeSettings {
            featured_items: Some(vec![FeaturedItemRule {
                field: "maturity".to_string(),
                options: vec![FeaturedItemRuleOption {
                    value: "graduated".to_string(),
                    label: Some("Graduated".to_string()),
                    order: Some(1),
                }],
            }]),
            ..Default::default()
        };

        landscape_data.add_featured_items_data(&settings);
        assert_eq!(
            landscape_data.items[0].featured,
            Some(ItemFeatured {
                label: Some("Graduated".to_string()),
                order: Some(1)
            })
        );
    }

    #[test]
    fn landscape_data_add_featured_items_data_subcategory() {
        let mut landscape_data = LandscapeData::default();
        landscape_data.items.push(Item {
            subcategory: "Subcategory".to_string(),
            ..Default::default()
        });

        let settings = LandscapeSettings {
            featured_items: Some(vec![FeaturedItemRule {
                field: "subcategory".to_string(),
                options: vec![FeaturedItemRuleOption {
                    value: "Subcategory".to_string(),
                    label: Some("VIP category".to_string()),
                    order: Some(1),
                }],
            }]),
            ..Default::default()
        };

        landscape_data.add_featured_items_data(&settings);
        assert_eq!(
            landscape_data.items[0].featured,
            Some(ItemFeatured {
                label: Some("VIP category".to_string()),
                order: Some(1)
            })
        );
    }

    #[test]
    fn landscape_data_add_github_data() {
        let mut landscape_data = LandscapeData::default();
        let repository_url = "https://repo.url/test".to_string();
        let repository = Repository {
            url: repository_url.clone(),
            primary: Some(true),
            ..Default::default()
        };
        landscape_data.items.push(Item {
            repositories: Some(vec![repository.clone()]),
            ..Default::default()
        });

        let mut github_data = GithubData::default();
        let repository_github_data = RepositoryGithubData {
            description: "test".to_string(),
            license: Some("Apache-2.0".to_string()),
            ..Default::default()
        };
        github_data.insert(repository_url.clone(), repository_github_data.clone());

        landscape_data.add_github_data(&github_data);
        assert_eq!(
            landscape_data.items[0].repositories,
            Some(vec![Repository {
                github_data: Some(repository_github_data),
                ..repository
            }])
        );
        assert_eq!(landscape_data.items[0].oss, Some(true));
    }

    #[test]
    fn landscape_data_add_member_subcategory() {
        let mut landscape_data = LandscapeData::default();
        landscape_data.items.push(Item {
            category: "Members".to_string(),
            subcategory: "Member subcategory".to_string(),
            crunchbase_url: Some("https://crunchbase.url/test".to_string()),
            ..Default::default()
        });
        landscape_data.items.push(Item {
            category: "Other category".to_string(),
            crunchbase_url: Some("https://crunchbase.url/test".to_string()),
            ..Default::default()
        });

        landscape_data.add_member_subcategory(&Some("Members".to_string()));
        assert_eq!(
            landscape_data.items[1].member_subcategory,
            Some("Member subcategory".to_string())
        );
    }

    #[test]
    fn landscape_data_add_tags_category_match() {
        let mut landscape_data = LandscapeData::default();
        landscape_data.items.push(Item {
            category: "Category".to_string(),
            maturity: Some("graduated".to_string()),
            ..Default::default()
        });

        let mut tags = BTreeMap::new();
        tags.insert(
            "tag1".to_string(),
            vec![TagRule {
                category: "Category".to_string(),
                subcategories: Some(vec![]),
            }],
        );
        let settings = LandscapeSettings {
            tags: Some(tags),
            ..Default::default()
        };

        landscape_data.add_tags(&settings);
        assert_eq!(landscape_data.items[0].tag, Some("tag1".to_string()));
    }

    #[test]
    fn landscape_data_add_tags_subcategory_match() {
        let mut landscape_data = LandscapeData::default();
        landscape_data.items.push(Item {
            category: "Category".to_string(),
            subcategory: "Subcategory".to_string(),
            maturity: Some("graduated".to_string()),
            ..Default::default()
        });

        let mut tags = BTreeMap::new();
        tags.insert(
            "tag1".to_string(),
            vec![TagRule {
                category: "Category".to_string(),
                subcategories: Some(vec!["Subcategory".to_string()]),
            }],
        );
        let settings = LandscapeSettings {
            tags: Some(tags),
            ..Default::default()
        };

        landscape_data.add_tags(&settings);
        assert_eq!(landscape_data.items[0].tag, Some("tag1".to_string()));
    }

    #[test]
    fn landscape_data_add_tags_no_project() {
        let mut landscape_data = LandscapeData::default();
        landscape_data.items.push(Item {
            category: "Category".to_string(),
            ..Default::default()
        });

        let mut tags = BTreeMap::new();
        tags.insert(
            "tag1".to_string(),
            vec![TagRule {
                category: "Category".to_string(),
                ..Default::default()
            }],
        );
        let settings = LandscapeSettings {
            tags: Some(tags),
            ..Default::default()
        };

        landscape_data.add_tags(&settings);
        assert_eq!(landscape_data.items[0].tag, None);
    }

    #[test]
    fn landscape_data_add_tags_item_tag_already_set() {
        let mut landscape_data = LandscapeData::default();
        landscape_data.items.push(Item {
            category: "Category".to_string(),
            maturity: Some("graduated".to_string()),
            tag: Some("tag2".to_string()),
            ..Default::default()
        });

        let mut tags = BTreeMap::new();
        tags.insert(
            "tag1".to_string(),
            vec![TagRule {
                category: "Category".to_string(),
                ..Default::default()
            }],
        );
        let settings = LandscapeSettings {
            tags: Some(tags),
            ..Default::default()
        };

        landscape_data.add_tags(&settings);
        assert_eq!(landscape_data.items[0].tag, Some("tag2".to_string()));
    }

    #[test]
    fn landscape_data_set_enduser_flag_category_match() {
        let mut landscape_data = LandscapeData::default();
        landscape_data.items.push(Item {
            category: "Category".to_string(),
            maturity: Some("graduated".to_string()),
            ..Default::default()
        });

        let enduser = Some(vec![EndUserRule {
            category: "Category".to_string(),
            subcategories: Some(vec![]),
        }]);
        let settings = LandscapeSettings {
            enduser,
            ..Default::default()
        };

        landscape_data.set_enduser_flag(&settings);
        assert_eq!(landscape_data.items[0].enduser, Some(true));
    }

    #[test]
    fn landscape_data_set_enduser_flag_subcategory_match() {
        let mut landscape_data = LandscapeData::default();
        landscape_data.items.push(Item {
            category: "Category".to_string(),
            subcategory: "Subcategory".to_string(),
            maturity: Some("graduated".to_string()),
            ..Default::default()
        });

        let enduser = Some(vec![EndUserRule {
            category: "Category".to_string(),
            subcategories: Some(vec!["Subcategory".to_string()]),
        }]);
        let settings = LandscapeSettings {
            enduser,
            ..Default::default()
        };

        landscape_data.set_enduser_flag(&settings);
        assert_eq!(landscape_data.items[0].enduser, Some(true));
    }

    #[test]
    fn landscape_data_set_enduser_flag_already_set() {
        let mut landscape_data = LandscapeData::default();
        landscape_data.items.push(Item {
            category: "Category".to_string(),
            maturity: Some("graduated".to_string()),
            enduser: Some(false),
            ..Default::default()
        });

        let enduser = Some(vec![EndUserRule {
            category: "Category".to_string(),
            subcategories: Some(vec![]),
        }]);
        let settings = LandscapeSettings {
            enduser,
            ..Default::default()
        };

        landscape_data.set_enduser_flag(&settings);
        assert_eq!(landscape_data.items[0].enduser, Some(false));
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn landscape_data_from_legacy_data() {
        let date = NaiveDate::from_ymd_opt(2024, 5, 1).unwrap();
        let legacy_data = legacy::LandscapeData {
            landscape: vec![legacy::Category {
                name: "Category".to_string(),
                subcategories: vec![legacy::SubCategory {
                    name: "Subcategory".to_string(),
                    items: vec![legacy::Item {
                        name: "Item".to_string(),
                        homepage_url: "homepage_url".to_string(),
                        logo: "logo".to_string(),
                        additional_repos: Some(vec![legacy::Repository {
                            repo_url: "additional_repo_url".to_string(),
                            branch: Some("branch".to_string()),
                        }]),
                        branch: Some("branch".to_string()),
                        crunchbase: Some("crunchbase_url".to_string()),
                        description: Some("description".to_string()),
                        enduser: Some(false),
                        extra: Some(legacy::ItemExtra {
                            accepted: Some(date),
                            archived: Some(date),
                            audits: Some(vec![ItemAudit {
                                date,
                                kind: "kind".to_string(),
                                url: "url".to_string(),
                                vendor: "vendor".to_string(),
                            }]),
                            annual_review_date: Some(date),
                            annual_review_url: Some("annual_review_url".to_string()),
                            artwork_url: Some("artwork_url".to_string()),
                            blog_url: Some("blog_url".to_string()),
                            chat_channel: Some("chat_channel".to_string()),
                            clomonitor_name: Some("clomonitor_name".to_string()),
                            dev_stats_url: Some("dev_stats_url".to_string()),
                            discord_url: Some("discord_url".to_string()),
                            docker_url: Some("docker_url".to_string()),
                            documentation_url: Some("documentation_url".to_string()),
                            github_discussions_url: Some("github_discussions_url".to_string()),
                            gitter_url: Some("gitter_url".to_string()),
                            graduated: Some(date),
                            incubating: Some(date),
                            linkedin_url: Some("linkedin_url".to_string()),
                            mailing_list_url: Some("mailing_list_url".to_string()),
                            other_links: Some(vec![ItemLink {
                                name: "name".to_string(),
                                url: "https://link.url".to_string(),
                            }]),
                            package_manager_url: Some("package_manager_url".to_string()),
                            parent_project: Some("parent_project".to_string()),
                            slack_url: Some("slack_url".to_string()),
                            specification: Some(false),
                            stack_overflow_url: Some("stack_overflow_url".to_string()),
                            summary_business_use_case: Some("summary_business_use_case".to_string()),
                            summary_integration: Some("summary_integration".to_string()),
                            summary_integrations: Some("summary_integrations".to_string()),
                            summary_intro_url: Some("summary_intro_url".to_string()),
                            summary_personas: Some("summary_personas".to_string()),
                            summary_release_rate: Some("summary_release_rate".to_string()),
                            summary_tags: Some("tag1,tag2".to_string()),
                            summary_use_case: Some("summary_use_case".to_string()),
                            tag: Some("tag".to_string()),
                            training_certifications: Some("training_certifications".to_string()),
                            training_type: Some("training_type".to_string()),
                            youtube_url: Some("youtube_url".to_string()),
                        }),
                        joined: Some(date),
                        project: Some("graduated".to_string()),
                        repo_url: Some("repo_url".to_string()),
                        second_path: Some(vec!["category2/subcategory2.1".to_string()]),
                        twitter: Some("twitter_url".to_string()),
                        url_for_bestpractices: Some("url_for_bestpractices".to_string()),
                        unnamed_organization: Some(false),
                    }],
                }],
            }],
        };

        let expected_landscape_data = LandscapeData {
            categories: vec![Category {
                name: "Category".to_string(),
                normalized_name: "category".to_string(),
                subcategories: vec![Subcategory {
                    name: "Subcategory".to_string(),
                    normalized_name: "subcategory".to_string(),
                }],
            }],
            items: vec![Item {
                category: "Category".to_string(),
                homepage_url: "homepage_url".to_string(),
                id: "category--subcategory--item".to_string(),
                logo: "logo".to_string(),
                name: "Item".to_string(),
                subcategory: "Subcategory".to_string(),
                accepted_at: Some(date),
                additional_categories: Some(vec![AdditionalCategory {
                    category: "category2".to_string(),
                    subcategory: "subcategory2.1".to_string(),
                }]),
                archived_at: Some(date),
                artwork_url: Some("artwork_url".to_string()),
                audits: Some(vec![ItemAudit {
                    date,
                    kind: "kind".to_string(),
                    url: "url".to_string(),
                    vendor: "vendor".to_string(),
                }]),
                blog_url: Some("blog_url".to_string()),
                chat_channel: Some("chat_channel".to_string()),
                clomonitor_name: Some("clomonitor_name".to_string()),
                clomonitor_report_summary: None,
                crunchbase_data: None,
                crunchbase_url: Some("crunchbase_url".to_string()),
                description: Some("description".to_string()),
                devstats_url: Some("dev_stats_url".to_string()),
                discord_url: Some("discord_url".to_string()),
                docker_url: Some("docker_url".to_string()),
                documentation_url: Some("documentation_url".to_string()),
                enduser: Some(false),
                featured: None,
                github_discussions_url: Some("github_discussions_url".to_string()),
                gitter_url: Some("gitter_url".to_string()),
                graduated_at: Some(date),
                incubating_at: Some(date),
                joined_at: Some(date),
                linkedin_url: Some("linkedin_url".to_string()),
                mailing_list_url: Some("mailing_list_url".to_string()),
                maturity: Some("graduated".to_string()),
                member_subcategory: None,
                latest_annual_review_at: Some(date),
                latest_annual_review_url: Some("annual_review_url".to_string()),
                openssf_best_practices_url: Some("url_for_bestpractices".to_string()),
                oss: None,
                other_links: Some(vec![ItemLink {
                    name: "name".to_string(),
                    url: "https://link.url".to_string(),
                }]),
                package_manager_url: Some("package_manager_url".to_string()),
                parent_project: Some("parent_project".to_string()),
                repositories: Some(vec![
                    Repository {
                        url: "repo_url".to_string(),
                        branch: Some("branch".to_string()),
                        github_data: None,
                        primary: Some(true),
                    },
                    Repository {
                        url: "additional_repo_url".to_string(),
                        branch: Some("branch".to_string()),
                        github_data: None,
                        primary: Some(false),
                    },
                ]),
                slack_url: Some("slack_url".to_string()),
                specification: Some(false),
                stack_overflow_url: Some("stack_overflow_url".to_string()),
                summary: Some(ItemSummary {
                    business_use_case: Some("summary_business_use_case".to_string()),
                    integration: Some("summary_integration".to_string()),
                    integrations: Some("summary_integrations".to_string()),
                    intro_url: Some("summary_intro_url".to_string()),
                    personas: Some("summary_personas".split(',').map(|p| p.trim().to_string()).collect()),
                    release_rate: Some("summary_release_rate".to_string()),
                    tags: Some(vec!["tag1".to_string(), "tag2".to_string()]),
                    use_case: Some("summary_use_case".to_string()),
                }),
                tag: Some("tag".to_string()),
                training_certifications: Some("training_certifications".to_string()),
                training_type: Some("training_type".to_string()),
                twitter_url: Some("twitter_url".to_string()),
                unnamed_organization: Some(false),
                website: "homepage_url".to_string(),
                youtube_url: Some("youtube_url".to_string()),
            }],
        };

        let landscape_data = LandscapeData::from(legacy_data);
        pretty_assertions::assert_eq!(landscape_data, expected_landscape_data);
    }

    #[test]
    fn category_from_settings_category() {
        let settings_category = settings::Category {
            name: "Category".to_string(),
            subcategories: vec!["Subcategory".to_string()],
        };

        let category = Category::from(&settings_category);
        assert_eq!(
            category,
            Category {
                name: "Category".to_string(),
                normalized_name: "category".to_string(),
                subcategories: vec![Subcategory {
                    name: "Subcategory".to_string(),
                    normalized_name: "subcategory".to_string(),
                }],
            }
        );
    }

    #[test]
    fn item_description() {
        let item = Item {
            description: Some("item description".to_string()),
            repositories: Some(vec![Repository {
                github_data: Some(RepositoryGithubData {
                    description: "repository description".to_string(),
                    ..Default::default()
                }),
                primary: Some(true),
                ..Default::default()
            }]),
            crunchbase_data: Some(Organization {
                description: Some("crunchbase description".to_string()),
                ..Default::default()
            }),
            ..Default::default()
        };

        assert_eq!(item.description(), Some(&"item description".to_string()));
    }

    #[test]
    fn item_description_from_repository() {
        let item = Item {
            repositories: Some(vec![Repository {
                github_data: Some(RepositoryGithubData {
                    description: "repository description".to_string(),
                    ..Default::default()
                }),
                primary: Some(true),
                ..Default::default()
            }]),
            crunchbase_data: Some(Organization {
                description: Some("crunchbase description".to_string()),
                ..Default::default()
            }),
            ..Default::default()
        };

        assert_eq!(item.description(), Some(&"repository description".to_string()));
    }

    #[test]
    fn item_description_from_crunchbase() {
        let item = Item {
            crunchbase_data: Some(Organization {
                description: Some("crunchbase description".to_string()),
                ..Default::default()
            }),
            ..Default::default()
        };

        assert_eq!(item.description(), Some(&"crunchbase description".to_string()));
    }

    #[test]
    fn item_primary_repository_found() {
        let item = Item {
            repositories: Some(vec![
                Repository {
                    url: "repo1".to_string(),
                    primary: Some(false),
                    ..Default::default()
                },
                Repository {
                    url: "repo2".to_string(),
                    primary: Some(true),
                    ..Default::default()
                },
            ]),
            ..Default::default()
        };

        assert_eq!(item.primary_repository().unwrap().url, "repo2".to_string());
    }

    #[test]
    fn item_primary_repository_not_found() {
        let item = Item {
            repositories: Some(vec![Repository {
                url: "repo1".to_string(),
                primary: Some(false),
                ..Default::default()
            }]),
            ..Default::default()
        };

        assert!(item.primary_repository().is_none());
    }

    #[test]
    fn item_set_id() {
        let mut item = Item {
            category: "Category".to_string(),
            subcategory: "Subcategory".to_string(),
            name: "Item".to_string(),
            ..Default::default()
        };

        item.set_id();
        assert_eq!(item.id, "category--subcategory--item".to_string());
    }

    #[test]
    fn item_set_website_from_crunchbase_data() {
        let mut item = Item {
            crunchbase_data: Some(Organization {
                homepage_url: Some("crunchbase_homepage_url".to_string()),
                ..Default::default()
            }),
            homepage_url: "repository_url".to_string(),
            repositories: Some(vec![Repository {
                url: "repository_url".to_string(),
                primary: Some(true),
                ..Default::default()
            }]),
            ..Default::default()
        };

        item.set_website();
        assert_eq!(item.website, "crunchbase_homepage_url".to_string());
    }

    #[test]
    fn item_set_website_from_homepage_url() {
        let mut item = Item {
            homepage_url: "homepage_url".to_string(),
            ..Default::default()
        };

        item.set_website();
        assert_eq!(item.website, "homepage_url".to_string());
    }
}

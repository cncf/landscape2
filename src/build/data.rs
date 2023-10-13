//! This module defines the types used to represent the landscape data that is
//! usually provided from a YAML file (landscape.yml). The landscape data is
//! the main source of information for a landscape.
//!
//! The landscape data representation used in this module doesn't match the
//! legacy format used by the existing landscapes data files. To maintain
//! backwards compatibility, this module provides a `legacy` submodule that
//! allows parsing the legacy format and convert it to the new one.

use super::{
    crunchbase::{CrunchbaseData, Organization},
    github::{self, GithubData},
    settings::LandscapeSettings,
};
use crate::DataSource;
use anyhow::{format_err, Result};
use chrono::NaiveDate;
use lazy_static::lazy_static;
use regex::Regex;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::Path};
use tracing::{debug, instrument};

/// Format used for dates across the landscape data file.
pub const DATE_FORMAT: &str = "%Y-%m-%d";

/// Landscape data.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct LandscapeData {
    pub categories: Vec<Category>,
    pub items: Vec<Item>,
}

impl LandscapeData {
    /// Create a new landscape data instance from the source provided.
    #[instrument(skip_all, err)]
    pub(crate) async fn new(src: &DataSource) -> Result<Self> {
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

        Err(format_err!("data file or url not provided"))
    }

    /// Create a new landscape data instance from the file provided.
    fn new_from_file(file: &Path) -> Result<Self> {
        let raw_data = fs::read_to_string(file)?;
        let legacy_data: legacy::LandscapeData = serde_yaml::from_str(&raw_data)?;
        legacy_data.validate()?;

        Ok(LandscapeData::from(legacy_data))
    }

    /// Create a new landscape data instance from the url provided.
    async fn new_from_url(url: &str) -> Result<Self> {
        let resp = reqwest::get(url).await?;
        if resp.status() != StatusCode::OK {
            return Err(format_err!(
                "unexpected status code getting landscape data file: {}",
                resp.status()
            ));
        }
        let raw_data = resp.text().await?;
        let legacy_data: legacy::LandscapeData = serde_yaml::from_str(&raw_data)?;
        legacy_data.validate()?;

        Ok(LandscapeData::from(legacy_data))
    }

    /// Add items Crunchbase data.
    #[instrument(skip_all, err)]
    pub(crate) fn add_crunchbase_data(&mut self, crunchbase_data: CrunchbaseData) -> Result<()> {
        for item in &mut self.items {
            if let Some(crunchbase_url) = item.crunchbase_url.as_ref() {
                if let Some(org_crunchbase_data) = crunchbase_data.get(crunchbase_url) {
                    item.crunchbase_data = Some(org_crunchbase_data.clone());
                }
            }
        }
        Ok(())
    }

    /// Add featured items information to the landscape data based on the
    /// settings provided (i.e. graduated and incubating projects must be
    /// featured and the former displayed first).
    #[instrument(skip_all, err)]
    pub(crate) fn add_featured_items_data(&mut self, settings: &LandscapeSettings) -> Result<()> {
        let Some(rules) = &settings.featured_items else {
            return Ok(());
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

        Ok(())
    }

    /// Add items repositories GitHub data.
    #[instrument(skip_all, err)]
    pub(crate) fn add_github_data(&mut self, github_data: GithubData) -> Result<()> {
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

        Ok(())
    }

    /// Add items member subcategory.
    #[instrument(skip_all)]
    pub(crate) fn add_member_subcategory(&mut self, members_category: &Option<String>) {
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
    pub(crate) fn add_tags(&mut self, settings: &LandscapeSettings) {
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
                subcategories: vec![],
            };

            // Subcategories
            for legacy_subcategory in legacy_category.subcategories {
                category.subcategories.push(legacy_subcategory.name.clone());

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
                        item.graduated_at = extra.graduated;
                        item.incubating_at = extra.incubating;
                        item.latest_annual_review_at = extra.annual_review_date;
                        item.latest_annual_review_url = extra.annual_review_url;
                        item.mailing_list_url = extra.mailing_list_url;
                        item.slack_url = extra.slack_url;
                        item.specification = extra.specification;
                        item.stack_overflow_url = extra.stack_overflow_url;
                        item.tag = extra.tag;
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
pub(crate) struct Category {
    pub name: CategoryName,
    pub subcategories: Vec<SubCategoryName>,
}

/// Type alias to represent a category name.
pub(crate) type CategoryName = String;

/// Type alias to represent a sub category name.
pub(crate) type SubCategoryName = String;

/// Landscape item (project, product, member, etc).
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Item {
    pub category: String,
    pub homepage_url: String,
    pub id: String,
    pub logo: String,
    pub name: String,
    pub subcategory: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub accepted_at: Option<NaiveDate>,

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

    #[serde(skip_serializing_if = "Option::is_none")]
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
    pub graduated_at: Option<NaiveDate>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub incubating_at: Option<NaiveDate>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub joined_at: Option<NaiveDate>,

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
    pub twitter_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub unnamed_organization: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub youtube_url: Option<String>,
}

impl Item {
    /// Get item's description.
    #[allow(dead_code)]
    pub(crate) fn description(&self) -> Option<&String> {
        // Use item's description if available
        let mut description = self.description.as_ref();

        // Otherwise, use primary repository description if available
        if description.is_none() || description.unwrap().is_empty() {
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
    #[allow(dead_code)]
    pub(crate) fn primary_repository(&self) -> Option<&Repository> {
        self.repositories
            .as_ref()
            .and_then(|repos| repos.iter().find(|r| r.primary.unwrap_or_default()))
    }

    /// Generate and set the item's id.
    fn set_id(&mut self) {
        lazy_static! {
            static ref VALID_CHARS: Regex =
                Regex::new(r"[a-z0-9\-\ ]").expect("exprs in VALID_CHARS to be valid");
        }

        // Normalize category, subcategory and item name
        let normalize = |value: &str| {
            value
                .to_lowercase()
                .replace(' ', "-")
                .chars()
                .filter(|c| VALID_CHARS.is_match(&c.to_string()))
                .collect::<String>()
                .replace("--", "-")
        };
        let category = normalize(&self.category);
        let subcategory = normalize(&self.subcategory);
        let item = normalize(&self.name);

        // Build and set id
        self.id = format!("{category}--{subcategory}--{item}");
    }
}

/// Landscape item audit information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct ItemAudit {
    pub date: NaiveDate,
    #[serde(rename = "type")]
    pub kind: String,
    pub url: String,
    pub vendor: String,
}

/// Landscape item featured information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct ItemFeatured {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub order: Option<usize>,
}

/// Landscape item summary.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct ItemSummary {
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

/// Repository information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Repository {
    pub url: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub github_data: Option<github::Repository>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary: Option<bool>,
}

mod legacy {
    //! This module defines some types used to parse the landscape data file in
    //! legacy format and convert it to the new one.

    use super::ItemAudit;
    use crate::build::crunchbase::CRUNCHBASE_URL;
    use anyhow::{format_err, Context, Result};
    use chrono::NaiveDate;
    use lazy_static::lazy_static;
    use regex::Regex;
    use serde::{Deserialize, Serialize};
    use url::Url;

    /// Landscape data (legacy format).
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct LandscapeData {
        pub landscape: Vec<Category>,
    }

    impl LandscapeData {
        /// Validate landscape data.
        pub(crate) fn validate(&self) -> Result<()> {
            let mut items_seen = Vec::new();

            for (category_index, category) in self.landscape.iter().enumerate() {
                // Check category name
                if category.name.is_empty() {
                    return Err(format_err!("category [{category_index}] name is required"));
                }

                for (subcategory_index, subcategory) in category.subcategories.iter().enumerate() {
                    // Check subcategory name
                    if subcategory.name.is_empty() {
                        return Err(format_err!(
                            "subcategory [{subcategory_index}] name is required (category: [{}]) ",
                            category.name
                        ));
                    }

                    for (item_index, item) in subcategory.items.iter().enumerate() {
                        // Prepare context for errors
                        let item_id = if item.name.is_empty() {
                            format!("{item_index}")
                        } else {
                            item.name.clone()
                        };
                        let ctx = format!(
                            "item [{}] is not valid (category: [{}] | subcategory: [{}])",
                            item_id, category.name, subcategory.name
                        );

                        // Check name
                        if item.name.is_empty() {
                            return Err(format_err!("name is required")).context(ctx);
                        }
                        if items_seen.contains(&item.name) {
                            return Err(format_err!("duplicate item name")).context(ctx);
                        }
                        items_seen.push(item.name.clone());

                        // Check homepage
                        if item.homepage_url.is_empty() {
                            return Err(format_err!("hompage_url is required")).context(ctx);
                        }

                        // Check logo
                        if item.logo.is_empty() {
                            return Err(format_err!("logo is required")).context(ctx);
                        }

                        // Check some values in extra
                        if let Some(extra) = &item.extra {
                            // Check tag name
                            if let Some(tag) = &extra.tag {
                                if !TAG_NAME.is_match(tag) {
                                    return Err(format_err!(
                                        "invalid tag (must use only lowercase letters and hyphens)"
                                    ))
                                    .context(ctx);
                                }
                            }
                        }

                        // Check urls
                        validate_urls(item).context(ctx)?;
                    }
                }
            }

            Ok(())
        }
    }

    /// Landscape category.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Category {
        pub name: String,
        pub subcategories: Vec<SubCategory>,
    }

    /// Landscape subcategory.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct SubCategory {
        pub name: String,
        pub items: Vec<Item>,
    }

    /// Landscape item (project, product, member, etc).
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Item {
        pub name: String,
        pub homepage_url: String,
        pub logo: String,
        pub additional_repos: Option<Vec<Repository>>,
        pub branch: Option<String>,
        pub crunchbase: Option<String>,
        pub description: Option<String>,
        pub enduser: Option<bool>,
        pub extra: Option<ItemExtra>,
        pub joined: Option<NaiveDate>,
        pub project: Option<String>,
        pub repo_url: Option<String>,
        pub twitter: Option<String>,
        pub url_for_bestpractices: Option<String>,
        pub unnamed_organization: Option<bool>,
    }

    /// Landscape item repository.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Repository {
        pub repo_url: String,
        pub branch: Option<String>,
    }

    /// Extra information for a landscape item.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct ItemExtra {
        pub accepted: Option<NaiveDate>,
        pub archived: Option<NaiveDate>,
        pub audits: Option<Vec<ItemAudit>>,
        pub annual_review_date: Option<NaiveDate>,
        pub annual_review_url: Option<String>,
        pub artwork_url: Option<String>,
        pub blog_url: Option<String>,
        pub chat_channel: Option<String>,
        pub clomonitor_name: Option<String>,
        pub dev_stats_url: Option<String>,
        pub discord_url: Option<String>,
        pub docker_url: Option<String>,
        pub github_discussions_url: Option<String>,
        pub graduated: Option<NaiveDate>,
        pub incubating: Option<NaiveDate>,
        pub mailing_list_url: Option<String>,
        pub slack_url: Option<String>,
        pub specification: Option<bool>,
        pub stack_overflow_url: Option<String>,
        pub summary_business_use_case: Option<String>,
        pub summary_integration: Option<String>,
        pub summary_integrations: Option<String>,
        pub summary_intro_url: Option<String>,
        pub summary_use_case: Option<String>,
        pub summary_personas: Option<String>,
        pub summary_release_rate: Option<String>,
        pub summary_tags: Option<String>,
        pub tag: Option<String>,
        pub youtube_url: Option<String>,
    }

    /// Validate the urls of the item provided.
    fn validate_urls(item: &Item) -> Result<()> {
        // Check urls in item
        let homepage_url = Some(item.homepage_url.clone());
        let urls = [
            ("best_practices", &item.url_for_bestpractices),
            ("crunchbase", &item.crunchbase),
            ("homepage", &homepage_url),
            ("repository", &item.repo_url),
            ("twitter", &item.twitter),
        ];
        for (name, url) in urls {
            validate_url(name, url)?;
        }

        // Check additional repositories
        if let Some(additional_repos) = &item.additional_repos {
            for r in additional_repos {
                let repo_url = Some(r.repo_url.clone());
                validate_url("additional_repository", &repo_url)?;
            }
        }

        // Check urls in item extra
        if let Some(extra) = &item.extra {
            let urls = [
                ("annual_review", &extra.annual_review_url),
                ("artwork", &extra.artwork_url),
                ("blog", &extra.blog_url),
                ("dev_stats", &extra.dev_stats_url),
                ("discord", &extra.discord_url),
                ("docker", &extra.docker_url),
                ("github_discussions", &extra.github_discussions_url),
                ("mailing_list", &extra.mailing_list_url),
                ("slack", &extra.slack_url),
                ("stack_overflow", &extra.stack_overflow_url),
                ("youtube", &extra.youtube_url),
            ];
            for (name, url) in urls {
                validate_url(name, url)?;
            }

            // Check audits urls
            if let Some(audits) = &extra.audits {
                for a in audits {
                    let audit_url = Some(a.url.clone());
                    validate_url("audit", &audit_url)?;
                }
            }
        };

        Ok(())
    }

    /// Validate the url provided.
    fn validate_url(kind: &str, url: &Option<String>) -> Result<()> {
        if let Some(url) = url {
            let invalid_url = |reason: &str| Err(format_err!("invalid {kind} url: {reason}"));

            // Parse url
            let url = match Url::parse(url) {
                Ok(url) => url,
                Err(err) => return invalid_url(&err.to_string()),
            };

            // Check scheme
            if url.scheme() != "http" && url.scheme() != "https" {
                return invalid_url("invalid scheme");
            }

            // Some checks specific to the url kind provided
            match kind {
                "crunchbase" => {
                    if !CRUNCHBASE_URL.is_match(url.as_str()) {
                        return invalid_url(&format!("expecting: {}", CRUNCHBASE_URL.as_str()));
                    }
                }
                "stack_overflow" => {
                    if url.host_str().is_some_and(|host| !host.contains("stackoverflow.com")) {
                        return invalid_url("invalid stack overflow url");
                    }
                }
                "twitter" => {
                    if url.host_str().is_some_and(|host| !host.contains("twitter.com")) {
                        return invalid_url("expecting https://twitter.com/...");
                    }
                }
                "youtube" => {
                    if url.host_str().is_some_and(|host| !host.contains("youtube.com")) {
                        return invalid_url("expecting https://youtube.com/...");
                    }
                }
                _ => {}
            }
        }

        Ok(())
    }

    lazy_static! {
        /// TAG name regular expression.
        pub(crate) static ref TAG_NAME: Regex = Regex::new(r"^[a-z\-]+$").expect("exprs in TAG_NAME to be valid");
    }
}

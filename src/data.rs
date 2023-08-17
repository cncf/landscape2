//! This module defines the types used to represent the landscape data that is
//! usually provided from a YAML file (landscape.yml). The landscape data is
//! the main source of information for a landscape.
//!
//! The landscape data representation used in this module doesn't match the
//! legacy format used by the existing landscapes data files. To maintain
//! backwards compatibility, this module provides a `legacy` submodule that
//! allows parsing the legacy format and convert it to the new one.

use crate::{
    crunchbase::{CrunchbaseData, Organization},
    github::{self, GithubData},
    settings::LandscapeSettings,
    DataSource,
};
use anyhow::{format_err, Result};
use chrono::NaiveDate;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::Path};
use tracing::{debug, instrument};
use uuid::Uuid;

/// Format used for dates across the landscape data file.
pub const DATE_FORMAT: &str = "%Y-%m-%d";

/// Get landscape data from the source provided.
#[instrument(skip_all, err)]
pub(crate) async fn get_landscape_data(src: &DataSource) -> Result<LandscapeData> {
    let data = if let Some(file) = &src.data_file {
        debug!(?file, "getting landscape data from file");
        LandscapeData::new_from_file(file)
    } else {
        debug!(url = ?src.data_url.as_ref().unwrap(), "getting landscape data from url");
        LandscapeData::new_from_url(src.data_url.as_ref().unwrap()).await
    }?;

    Ok(data)
}

/// Landscape data.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct LandscapeData {
    pub categories: Vec<Category>,
    pub items: Vec<Item>,
}

impl LandscapeData {
    /// Create a new landscape data instance from the file provided.
    pub(crate) fn new_from_file(file: &Path) -> Result<Self> {
        let raw_data = fs::read_to_string(file)?;
        let legacy_data: legacy::LandscapeData = serde_yaml::from_str(&raw_data)?;
        legacy_data.validate()?;

        Ok(LandscapeData::from(legacy_data))
    }

    /// Create a new landscape data instance from the url provided.
    pub(crate) async fn new_from_url(url: &str) -> Result<Self> {
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

    /// Add Crunchbase data to the landscape data.
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
                            let option =
                                rule.options.iter().find(|o| match Maturity::try_from(o.value.as_str()) {
                                    Ok(option_maturity) => option_maturity == *item_maturity,
                                    Err(_) => false,
                                });
                            if let Some(option) = option {
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

    /// Add GitHub data to the landscape data.
    #[instrument(skip_all, err)]
    pub(crate) fn add_github_data(&mut self, github_data: GithubData) -> Result<()> {
        for item in &mut self.items {
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
                        subcategory: legacy_subcategory.name.clone(),
                        crunchbase_url: legacy_item.crunchbase,
                        enduser: legacy_item.enduser,
                        homepage_url: legacy_item.homepage_url,
                        joined_at: legacy_item.joined,
                        logo: legacy_item.logo,
                        maturity: legacy_item.project,
                        openssf_best_practices_url: legacy_item.url_for_bestpractices,
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
                        item.latest_annual_review_at = extra.annual_review_date;
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
                        item.mailing_list_url = extra.mailing_list_url;
                        item.latest_annual_review_url = extra.annual_review_url;
                        item.slack_url = extra.slack_url;
                        item.specification = extra.specification;
                        item.stack_overflow_url = extra.stack_overflow_url;
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
    pub id: Uuid,
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
    pub crunchbase_data: Option<Organization>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub crunchbase_url: Option<String>,

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
    pub maturity: Option<Maturity>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub member_subcategory: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_annual_review_at: Option<NaiveDate>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_annual_review_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub openssf_best_practices_url: Option<String>,

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
    pub twitter_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub unnamed_organization: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub youtube_url: Option<String>,
}

impl Item {
    /// Generate and set the item's id.
    fn set_id(&mut self) {
        let key = format!("{}##{}##{}", &self.category, &self.subcategory, &self.name);
        self.id = Uuid::new_v5(&Uuid::NAMESPACE_OID, key.as_bytes());
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

/// Project maturity level.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(super) enum Maturity {
    Archived,
    Graduated,
    Incubating,
    Sandbox,
}

impl std::fmt::Display for Maturity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Archived => write!(f, "archived"),
            Self::Graduated => write!(f, "graduated"),
            Self::Incubating => write!(f, "incubating"),
            Self::Sandbox => write!(f, "sandbox"),
        }
    }
}

impl TryFrom<&str> for Maturity {
    type Error = anyhow::Error;

    fn try_from(value: &str) -> Result<Self> {
        match value {
            "archived" => Ok(Self::Archived),
            "graduated" => Ok(Self::Graduated),
            "incubating" => Ok(Self::Incubating),
            "sandbox" => Ok(Self::Sandbox),
            _ => Err(format_err!("invalid maturity level")),
        }
    }
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

    use super::{ItemAudit, Maturity};
    use crate::{crunchbase::CRUNCHBASE_URL, github::GITHUB_REPO_URL};
    use anyhow::{format_err, Context, Result};
    use chrono::NaiveDate;
    use lazy_static::lazy_static;
    use regex::Regex;
    use serde::{Deserialize, Serialize};
    use url::Url;

    /// Landscape data (legacy format).
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(super) struct LandscapeData {
        pub landscape: Vec<Category>,
    }

    impl LandscapeData {
        /// Validate landscape data.
        pub(super) fn validate(&self) -> Result<()> {
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

                        // Check homepage
                        if item.homepage_url.is_empty() {
                            return Err(format_err!("hompage_url is required")).context(ctx);
                        }

                        // Check logo
                        if item.logo.is_empty() {
                            return Err(format_err!("logo is required")).context(ctx);
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
    pub(super) struct Category {
        pub name: String,
        pub subcategories: Vec<SubCategory>,
    }

    /// Landscape subcategory.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(super) struct SubCategory {
        pub name: String,
        pub items: Vec<Item>,
    }

    /// Landscape item (project, product, member, etc).
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(super) struct Item {
        pub name: String,
        pub homepage_url: String,
        pub logo: String,
        pub additional_repos: Option<Vec<Repository>>,
        pub branch: Option<String>,
        pub crunchbase: Option<String>,
        pub enduser: Option<bool>,
        pub extra: Option<ItemExtra>,
        pub joined: Option<NaiveDate>,
        pub project: Option<Maturity>,
        pub repo_url: Option<String>,
        pub twitter: Option<String>,
        pub url_for_bestpractices: Option<String>,
        pub unnamed_organization: Option<bool>,
    }

    /// Landscape item repository.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(super) struct Repository {
        pub repo_url: String,
        pub branch: Option<String>,
    }

    /// Extra information for a landscape item.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(super) struct ItemExtra {
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
                "additional_repository" | "repository" => {
                    if !GITHUB_REPO_URL.is_match(url.as_str()) {
                        return invalid_url(&format!("expecting: {}", GITHUB_REPO_URL.as_str()));
                    }
                }
                "best_practices" => {
                    if !BEST_PRACTICES_URL.is_match(url.as_str()) {
                        return invalid_url(&format!("expecting: {}", BEST_PRACTICES_URL.as_str()));
                    }
                }
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
                        return invalid_url("invalid twitter url");
                    }
                }
                "youtube" => {
                    if url.host_str().is_some_and(|host| !host.contains("youtube.com")) {
                        return invalid_url("invalid youtube url");
                    }
                }
                _ => {}
            }
        }

        Ok(())
    }

    lazy_static! {
        /// Best practices url regular expression.
        static ref BEST_PRACTICES_URL: Regex =
            Regex::new(r"(https://bestpractices.coreinfrastructure.org/(en/)?projects/\d+)",)
                .expect("exprs in BEST_PRACTICES_URL to be valid");
    }
}

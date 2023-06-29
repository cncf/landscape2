//! This module defines the types used to represent the landscape data that is
//! usually provided from a YAML file (landscape.yml). The landscape data is
//! the main source of information for a landscape.
//!
//! The landscape data representation used in this module doesn't match the
//! legacy format used by the existing landscapes data files. To maintain
//! backwards compatibility, this module provides a `legacy` submodule that
//! allows parsing the legacy format and convert to the new one.

use crate::{crunchbase::Organization, github};
use anyhow::{format_err, Result};
use chrono::NaiveDate;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};
use uuid::Uuid;

/// Format used for dates across the landscape data file.
pub const DATE_FORMAT: &str = "%Y-%m-%d";

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

        Ok(LandscapeData::from(legacy_data))
    }
}

impl From<legacy::LandscapeData> for LandscapeData {
    #[allow(clippy::too_many_lines)]
    fn from(legacy_landscape_data: legacy::LandscapeData) -> Self {
        let mut landscape_data = LandscapeData::default();

        // Categories
        for legacy_category in legacy_landscape_data.landscape {
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
                        logo: legacy_item.logo,
                        openssf_best_practices_url: legacy_item.url_for_bestpractices,
                        project: legacy_item.project,
                        twitter_url: legacy_item.twitter,
                        unnamed_organization: legacy_item.unnamed_organization,
                        ..Default::default()
                    };
                    item.set_id();
                    if let Some(joined) = legacy_item.joined {
                        if let Ok(v) = NaiveDate::parse_from_str(&joined, DATE_FORMAT) {
                            item.joined_at = Some(v);
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
                        item.artwork_url = extra.artwork_url;
                        item.blog_url = extra.blog_url;
                        item.chat_channel = extra.chat_channel;
                        item.clomonitor_name = extra.clomonitor_name;
                        item.devstats_url = extra.dev_stats_url;
                        item.discord_url = extra.discord_url;
                        item.github_discussions_url = extra.github_discussions_url;
                        item.mailing_list_url = extra.mailing_list_url;
                        item.latest_annual_review_url = extra.annual_review_url;
                        item.slack_url = extra.slack_url;
                        item.specification = extra.specification;
                        item.stack_overflow_url = extra.stack_overflow_url;
                        item.youtube_url = extra.youtube_url;

                        if let Some(accepted) = extra.accepted {
                            if let Ok(v) = NaiveDate::parse_from_str(&accepted, DATE_FORMAT) {
                                item.accepted_at = Some(v);
                            }
                        }
                        if let Some(graduated) = extra.graduated {
                            if let Ok(v) = NaiveDate::parse_from_str(&graduated, DATE_FORMAT) {
                                item.graduated_at = Some(v);
                            }
                        }
                        if let Some(incubating) = extra.incubating {
                            if let Ok(v) = NaiveDate::parse_from_str(&incubating, DATE_FORMAT) {
                                item.incubating_at = Some(v);
                            }
                        }
                        if let Some(annual_review_date) = extra.annual_review_date {
                            if let Ok(v) = NaiveDate::parse_from_str(&annual_review_date, DATE_FORMAT) {
                                item.latest_annual_review_at = Some(v);
                            }
                        }

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

                    landscape_data.items.push(item);
                }
            }

            landscape_data.categories.push(category);
        }

        landscape_data
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
    pub artwork_url: Option<String>,

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
    pub latest_annual_review_at: Option<NaiveDate>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_annual_review_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub openssf_best_practices_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub project: Option<String>,

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

    use serde::{Deserialize, Serialize};

    /// Landscape data (legacy format).
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(super) struct LandscapeData {
        pub landscape: Vec<Category>,
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
        pub joined: Option<String>,
        pub project: Option<String>,
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
        pub accepted: Option<String>,
        pub annual_review_date: Option<String>,
        pub annual_review_url: Option<String>,
        pub artwork_url: Option<String>,
        pub blog_url: Option<String>,
        pub chat_channel: Option<String>,
        pub clomonitor_name: Option<String>,
        pub dev_stats_url: Option<String>,
        pub discord_url: Option<String>,
        pub docker_url: Option<String>,
        pub github_discussions_url: Option<String>,
        pub graduated: Option<String>,
        pub incubating: Option<String>,
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
}

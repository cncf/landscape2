use anyhow::{format_err, Result};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};
use time::{format_description::FormatItem, Date};

/// Format used for dates across the landscape data file.
pub const DATE_FORMAT: &[FormatItem<'_>] = time::macros::format_description!("[year]-[month]-[day]");
time::serde::format_description!(date_format, Date, DATE_FORMAT);

/// Landscape data.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Data {
    pub categories: Vec<Category>,
    pub items: Vec<Item>,
}

/// Landscape category.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Category {
    pub name: String,
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
    pub name: String,
    pub homepage_url: String,
    pub logo: String,
    pub subcategory: String,

    #[serde(skip_serializing_if = "Option::is_none", with = "date_format::option")]
    pub accepted_at: Option<Date>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub artwork_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub blog_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub chat_channel: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub clomonitor_name: Option<String>,

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
    pub github_discussions_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", with = "date_format::option")]
    pub graduated_at: Option<Date>,

    #[serde(skip_serializing_if = "Option::is_none", with = "date_format::option")]
    pub incubating_at: Option<Date>,

    #[serde(skip_serializing_if = "Option::is_none", with = "date_format::option")]
    pub joined_at: Option<Date>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub mailing_list_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none", with = "date_format::option")]
    pub latest_annual_review_at: Option<Date>,

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
    pub primary: Option<bool>,
}

impl Data {
    /// Create a new landscape data instance from the file provided.
    pub(crate) fn new_from_file(file: &Path) -> Result<Self> {
        let raw_data = fs::read_to_string(file)?;
        let legacy_data: legacy::Data = serde_yaml::from_str(&raw_data)?;
        let data = Data::from(legacy_data);

        Ok(data)
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
        let legacy_data: legacy::Data = serde_yaml::from_str(&raw_data)?;
        let data = Data::from(legacy_data);

        Ok(data)
    }
}

impl From<legacy::Data> for Data {
    #[allow(clippy::too_many_lines)]
    fn from(legacy_data: legacy::Data) -> Self {
        let mut data = Data::default();

        for legacy_category in legacy_data.landscape {
            let mut category = Category {
                name: legacy_category.name.clone(),
                subcategories: vec![],
            };

            for legacy_subcategory in legacy_category.subcategories {
                category.subcategories.push(legacy_subcategory.name.clone());

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
                    if let Some(joined) = legacy_item.joined {
                        if let Ok(v) = Date::parse(&joined, &DATE_FORMAT) {
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
                        });
                    }
                    if let Some(additional_repos) = legacy_item.additional_repos {
                        for entry in additional_repos {
                            repositories.push(Repository {
                                url: entry.repo_url,
                                branch: entry.branch,
                                primary: Some(false),
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
                            if let Ok(v) = Date::parse(&accepted, &DATE_FORMAT) {
                                item.accepted_at = Some(v);
                            }
                        }
                        if let Some(graduated) = extra.graduated {
                            if let Ok(v) = Date::parse(&graduated, &DATE_FORMAT) {
                                item.graduated_at = Some(v);
                            }
                        }
                        if let Some(incubating) = extra.incubating {
                            if let Ok(v) = Date::parse(&incubating, &DATE_FORMAT) {
                                item.incubating_at = Some(v);
                            }
                        }
                        if let Some(annual_review_date) = extra.annual_review_date {
                            if let Ok(v) = Date::parse(&annual_review_date, &DATE_FORMAT) {
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

                    data.items.push(item);
                }
            }

            data.categories.push(category);
        }

        data
    }
}

mod legacy {
    use serde::{Deserialize, Serialize};

    /// Landscape data (legacy format).
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(super) struct Data {
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

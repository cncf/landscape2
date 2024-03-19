//! This module defines the landscape API endpoints and the data that will be
//! exposed from each of them.
//!
//! The landscape API should be the preferred source for applications that'd
//! like to consume data available on the landscape. It's meant to be stable,
//! so we'll do our best to not introduce breaking changes unless it's strictly
//! necessary.

use super::{
    data::{self, AdditionalCategory, ItemAudit},
    LandscapeData, LandscapeSettings,
};
use chrono::NaiveDate;
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::{BTreeMap, HashMap};

/// Sources of information used to generate the landscape API data.
#[derive(Debug, Clone)]
pub(crate) struct ApiSources<'a> {
    pub landscape_data: &'a LandscapeData,
    pub settings: &'a LandscapeSettings,
}

/// Type alias to represent an endpoint.
pub(crate) type Endpoint = String;

/// Type alias to represent some data.
pub(crate) type Data = String;

/// API endpoints and data served from each of them.
#[derive(Debug, Clone)]
pub(crate) struct Api<'a> {
    sources: &'a ApiSources<'a>,
    pub endpoints: HashMap<Endpoint, Data>,
}

impl<'a> Api<'a> {
    /// Create a new Api instance.
    pub(crate) fn new(sources: &'a ApiSources) -> Self {
        let mut api = Self {
            sources,
            endpoints: HashMap::new(),
        };
        api.setup_endpoints();
        api
    }

    /// Setup API endpoints.
    fn setup_endpoints(&mut self) {
        // Categories and subcategories
        let members = self.sources.settings.members_category.as_ref();
        for category in &self.sources.landscape_data.categories {
            // Members category will be treated specially
            if let Some(members) = members {
                if category.name == *members {
                    continue;
                }
            }

            // Category endpoints
            self.endpoints.insert(
                format!("categories/{}/all.json", category.normalized_name),
                to_json(&self.category_all(Some(&category.name))),
            );
            self.endpoints.insert(
                format!("categories/{}/count.json", category.normalized_name),
                count_to_json(self.category_count(Some(&category.name))),
            );

            for subcategory in &category.subcategories {
                // Subcategory endpoints
                self.endpoints.insert(
                    format!(
                        "categories/{}/{}/all.json",
                        category.normalized_name, subcategory.normalized_name
                    ),
                    to_json(&self.subcategory_all(&category.name, &subcategory.name)),
                );
                self.endpoints.insert(
                    format!(
                        "categories/{}/{}/count.json",
                        category.normalized_name, subcategory.normalized_name
                    ),
                    count_to_json(self.subcategory_count(&category.name, &subcategory.name)),
                );
            }
        }

        // Members
        self.endpoints.insert(
            "members/all.json".to_string(),
            to_json(&self.category_all(members)),
        );
        self.endpoints.insert(
            "members/count.json".to_string(),
            count_to_json(self.category_count(members)),
        );
        self.endpoints.insert(
            "members/end-users.json".to_string(),
            to_json(&self.members_end_users()),
        );

        // Projects
        self.endpoints.insert("projects/all.json".to_string(), to_json(&self.projects_all()));
        self.endpoints.insert(
            "projects/count.json".to_string(),
            count_to_json(self.projects_count()),
        );
    }

    /// Return all the items in the category provided.
    fn category_all(&self, category: Option<&String>) -> Vec<Item> {
        let Some(category) = category else {
            return vec![];
        };
        self.sources
            .landscape_data
            .items
            .iter()
            .filter_map(|i| {
                if i.category == *category {
                    return Some(Item::from_data_item(i, &self.sources.settings.url));
                }
                None
            })
            .sorted_by(|a, b| Ord::cmp(&a.name.to_lowercase(), &b.name.to_lowercase()))
            .collect()
    }

    /// Count the number of items in the category provided.
    fn category_count(&self, category: Option<&String>) -> usize {
        let Some(category) = category else {
            return 0;
        };
        self.sources.landscape_data.items.iter().filter(|i| i.category == *category).count()
    }

    /// Return all the items in the members category that are end users.
    fn members_end_users(&self) -> Vec<Item> {
        self.category_all(self.sources.settings.members_category.as_ref())
            .into_iter()
            .filter(|i| i.enduser.unwrap_or(false))
            .collect()
    }

    /// Return all the landscape items that are projects.
    fn projects_all(&self) -> Vec<Item> {
        self.sources
            .landscape_data
            .items
            .iter()
            .filter_map(|i| {
                i.maturity.as_ref()?;
                Some(Item::from_data_item(i, &self.sources.settings.url))
            })
            .sorted_by(|a, b| Ord::cmp(&a.name.to_lowercase(), &b.name.to_lowercase()))
            .collect()
    }

    /// Return the number of landscape items that are projects.
    fn projects_count(&self) -> usize {
        self.sources.landscape_data.items.iter().filter(|i| i.maturity.is_some()).count()
    }

    /// Return all the items in the category and subcategory provided.
    fn subcategory_all(&self, category: &str, subcategory: &str) -> Vec<Item> {
        self.sources
            .landscape_data
            .items
            .iter()
            .filter_map(|i| {
                if i.category == category && i.subcategory == subcategory {
                    return Some(Item::from_data_item(i, &self.sources.settings.url));
                }
                None
            })
            .sorted_by(|a, b| Ord::cmp(&a.name.to_lowercase(), &b.name.to_lowercase()))
            .collect()
    }

    /// Count the number of items in the category and subcategory provided.
    fn subcategory_count(&self, category: &str, subcategory: &str) -> usize {
        self.sources
            .landscape_data
            .items
            .iter()
            .filter(|i| i.category == category && i.subcategory == subcategory)
            .count()
    }
}

/// Landscape item data that will be exposed from the API.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Item {
    pub category: String,
    pub homepage_url: String,
    pub id: String,
    pub logo_url: String,
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
    pub country: Option<String>,

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
    pub mailing_list_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub maturity: Option<String>,

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
    pub tag: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub training_certifications: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub training_type: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub twitter_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub youtube_url: Option<String>,
}

impl Item {
    /// Create a new item from the data::Item instance provided.
    fn from_data_item(item: &data::Item, landscape_url: &str) -> Self {
        Self {
            accepted_at: item.accepted_at,
            additional_categories: item.additional_categories.clone(),
            archived_at: item.archived_at,
            artwork_url: item.artwork_url.clone(),
            audits: item.audits.clone(),
            blog_url: item.blog_url.clone(),
            category: item.category.clone(),
            chat_channel: item.chat_channel.clone(),
            country: item.crunchbase_data.as_ref().and_then(|cb| cb.country.clone()),
            crunchbase_url: item.crunchbase_url.clone(),
            description: item.description().cloned(),
            devstats_url: item.devstats_url.clone(),
            discord_url: item.discord_url.clone(),
            docker_url: item.docker_url.clone(),
            enduser: item.enduser,
            github_discussions_url: item.github_discussions_url.clone(),
            gitter_url: item.gitter_url.clone(),
            graduated_at: item.graduated_at,
            homepage_url: item.homepage_url.clone(),
            id: item.id.clone(),
            incubating_at: item.incubating_at,
            joined_at: item.joined_at,
            logo_url: format!(
                "{}/{}",
                landscape_url.strip_suffix('/').unwrap_or(landscape_url),
                item.logo,
            ),
            mailing_list_url: item.mailing_list_url.clone(),
            maturity: item.maturity.clone(),
            name: item.name.clone(),
            openssf_best_practices_url: item.openssf_best_practices_url.clone(),
            oss: item.oss,
            repositories: item.repositories.as_ref().map(|repos| repos.iter().map(Into::into).collect()),
            slack_url: item.slack_url.clone(),
            specification: item.specification,
            stack_overflow_url: item.stack_overflow_url.clone(),
            subcategory: item.subcategory.clone(),
            tag: item.tag.clone(),
            training_certifications: item.training_certifications.clone(),
            training_type: item.training_type.clone(),
            twitter_url: item.twitter_url.clone(),
            youtube_url: item.youtube_url.clone(),
        }
    }
}

/// Repository information that will be exposed from the API.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Repository {
    pub url: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub languages: Option<BTreeMap<String, i64>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary: Option<bool>,
}

impl From<&data::Repository> for Repository {
    fn from(r: &data::Repository) -> Self {
        Self {
            url: r.url.clone(),
            branch: r.branch.clone(),
            languages: r.github_data.as_ref().and_then(|gh| gh.languages.clone()),
            primary: r.primary,
        }
    }
}

/// Helper function to serialize the count value provided as a json string.
fn count_to_json(count: usize) -> String {
    json!({"count": count}).to_string()
}

/// Helper function to serialize the given data structure as a json string
/// assuming the serialization will succeed.
fn to_json<T>(value: &T) -> String
where
    T: ?Sized + Serialize,
{
    serde_json::to_string(value).expect("serialization to succeed")
}

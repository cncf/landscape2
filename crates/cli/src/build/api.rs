//! This module defines the landscape API endpoints and the data that will be
//! exposed from each of them.
//!
//! The landscape API should be the preferred source for applications that'd
//! like to consume data available on the landscape. It's meant to be stable:
//! changes within a major version are additive only, and the contract is
//! documented in `docs/api.md`.
//!
//! The `index.json` endpoint lists the paths of every other endpoint, so
//! consumers don't need to rebuild the categories normalized names.
//!
//! Category, subcategory and members endpoints only include the items whose
//! primary category matches. Items listed in other categories through
//! `additional_categories` aren't included there; consumers can use each
//! item's `additional_categories` field instead.

use std::collections::{BTreeMap, HashMap};

use chrono::{DateTime, NaiveDate, Utc};
use itertools::Itertools;
use landscape2_core::{
    data::{self, AdditionalCategory, ItemAudit, ItemLink, ItemSummary, LandscapeData},
    settings::LandscapeSettings,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

/// Sources of information used to generate the landscape API data.
#[derive(Debug, Clone)]
pub(crate) struct ApiSources<'a> {
    /// Landscape data, enriched with the data collected from external services.
    pub landscape_data: &'a LandscapeData,
    /// Landscape settings.
    pub settings: &'a LandscapeSettings,
}

/// Type alias to represent an endpoint.
pub(crate) type Endpoint = String;

/// Type alias to represent some data.
pub(crate) type Data = String;

/// API endpoints and data served from each of them.
#[derive(Debug, Clone)]
pub(crate) struct Api<'a> {
    /// Data served from each endpoint, keyed by its path (relative to the API
    /// base path).
    pub endpoints: HashMap<Endpoint, Data>,
    /// Sources of information used to generate the API data.
    sources: &'a ApiSources<'a>,
}

impl<'a> Api<'a> {
    /// Create a new Api instance.
    pub(crate) fn new(sources: &'a ApiSources) -> Self {
        let mut api = Self {
            endpoints: HashMap::new(),
            sources,
        };
        api.setup_endpoints();
        api
    }

    /// Insert the endpoints listing and counting the items provided.
    fn insert_items_endpoints(&mut self, all: &str, count: &str, items: &[&Item]) {
        self.endpoints.insert(all.to_string(), to_json(items));
        self.endpoints.insert(count.to_string(), count_to_json(items.len()));
    }

    /// Setup API endpoints, including the index listing their paths.
    fn setup_endpoints(&mut self) {
        // Prepare the API items once, sorted by name (ignoring case)
        let site_url = self.site_url();
        let items: Vec<Item> = self
            .sources
            .landscape_data
            .items
            .iter()
            .map(|i| Item::from_data_item(i, &site_url))
            .sorted_by_cached_key(|i| i.name.to_lowercase())
            .collect();

        // Group the items by category and by category and subcategory, keeping
        // their order
        let mut category_items: HashMap<&str, Vec<&Item>> = HashMap::new();
        let mut subcategory_items: HashMap<(&str, &str), Vec<&Item>> = HashMap::new();
        for item in &items {
            category_items.entry(item.category.as_str()).or_default().push(item);
            subcategory_items
                .entry((item.category.as_str(), item.subcategory.as_str()))
                .or_default()
                .push(item);
        }

        // Categories and subcategories
        let members = self.sources.settings.members_category.as_deref();
        let mut index_categories = vec![];
        for category in &self.sources.landscape_data.categories {
            // Members category will be treated specially
            if members == Some(category.name.as_str()) {
                continue;
            }

            // Category endpoints
            let mut index_category = IndexCategory {
                all: format!("categories/{}/all.json", category.normalized_name),
                count: format!("categories/{}/count.json", category.normalized_name),
                name: category.name.clone(),
                normalized_name: category.normalized_name.clone(),
                subcategories: vec![],
            };
            let items_in_category = category_items.get(category.name.as_str()).map_or(&[][..], Vec::as_slice);
            self.insert_items_endpoints(&index_category.all, &index_category.count, items_in_category);

            for subcategory in &category.subcategories {
                // Subcategory endpoints
                let index_subcategory = IndexSubcategory {
                    all: format!(
                        "categories/{}/{}/all.json",
                        category.normalized_name, subcategory.normalized_name
                    ),
                    count: format!(
                        "categories/{}/{}/count.json",
                        category.normalized_name, subcategory.normalized_name
                    ),
                    name: subcategory.name.clone(),
                    normalized_name: subcategory.normalized_name.clone(),
                };
                let items_in_subcategory = subcategory_items
                    .get(&(category.name.as_str(), subcategory.name.as_str()))
                    .map_or(&[][..], Vec::as_slice);
                self.insert_items_endpoints(
                    &index_subcategory.all,
                    &index_subcategory.count,
                    items_in_subcategory,
                );
                index_category.subcategories.push(index_subcategory);
            }

            index_categories.push(index_category);
        }

        // Members (always published, empty when no members category is set)
        let index_members = IndexMembers {
            all: "members/all.json".to_string(),
            count: "members/count.json".to_string(),
            end_users: "members/end-users.json".to_string(),
        };
        let members_items =
            members.and_then(|members| category_items.get(members)).map_or(&[][..], Vec::as_slice);
        self.insert_items_endpoints(&index_members.all, &index_members.count, members_items);
        let end_users: Vec<&Item> =
            members_items.iter().copied().filter(|i| i.enduser.unwrap_or(false)).collect();
        self.endpoints.insert(index_members.end_users.clone(), to_json(&end_users));

        // Projects
        let index_projects = IndexProjects {
            all: "projects/all.json".to_string(),
            count: "projects/count.json".to_string(),
            project: "projects/{id}.json".to_string(),
        };
        let projects: Vec<&Item> = items.iter().filter(|i| i.maturity.is_some()).collect();
        self.insert_items_endpoints(&index_projects.all, &index_projects.count, &projects);
        for project in &projects {
            self.endpoints.insert(format!("projects/{}.json", project.id), to_json(project));
        }

        // Index
        let index = Index {
            categories: index_categories,
            landscape2_version: env!("CARGO_PKG_VERSION").to_string(),
            members: index_members,
            projects: index_projects,
        };
        self.endpoints.insert("index.json".to_string(), to_json(&index));
    }

    /// Return the landscape site url, including the base path.
    fn site_url(&self) -> String {
        let settings = self.sources.settings;
        site_url(&settings.url, settings.base_path.as_deref())
    }
}

/// Index of the API endpoints, served from `index.json`.
///
/// Paths are relative to the API base path.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub(crate) struct Index {
    /// Categories endpoints, excluding the members category.
    pub categories: Vec<IndexCategory>,
    /// Version of landscape2 that generated the API.
    pub landscape2_version: String,
    /// Members endpoints.
    pub members: IndexMembers,
    /// Projects endpoints.
    pub projects: IndexProjects,
}

/// Category entry in the API index.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub(crate) struct IndexCategory {
    /// Path of the endpoint listing the category items.
    pub all: Endpoint,
    /// Path of the endpoint counting the category items.
    pub count: Endpoint,
    /// Name of the category.
    pub name: String,
    /// Normalized name of the category, used in the endpoints paths.
    pub normalized_name: String,
    /// Subcategories in the category.
    pub subcategories: Vec<IndexSubcategory>,
}

/// Members entry in the API index.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub(crate) struct IndexMembers {
    /// Path of the endpoint listing the members.
    pub all: Endpoint,
    /// Path of the endpoint counting the members.
    pub count: Endpoint,
    /// Path of the endpoint listing the members that are end users.
    pub end_users: Endpoint,
}

/// Projects entry in the API index.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub(crate) struct IndexProjects {
    /// Path of the endpoint listing the projects.
    pub all: Endpoint,
    /// Path of the endpoint counting the projects.
    pub count: Endpoint,
    /// Path template of the endpoint of each project (`{id}` is the item id).
    pub project: Endpoint,
}

/// Subcategory entry in the API index.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub(crate) struct IndexSubcategory {
    /// Path of the endpoint listing the subcategory items.
    pub all: Endpoint,
    /// Path of the endpoint counting the subcategory items.
    pub count: Endpoint,
    /// Name of the subcategory.
    pub name: String,
    /// Normalized name of the subcategory, used in the endpoints paths.
    pub normalized_name: String,
}

/// Landscape item data that will be exposed from the API.
#[derive(Serialize, Deserialize)]
pub(crate) struct Item {
    /// Name of the item's primary category.
    pub category: String,
    /// Homepage url.
    pub homepage_url: String,
    /// Item identifier, built from its category, subcategory and name normalized names.
    pub id: String,
    /// Absolute url of the item's logo, built from the landscape url and base
    /// path. Empty when the logo could not be processed.
    pub logo_url: String,
    /// Name of the item.
    pub name: String,
    /// Name of the item's primary subcategory.
    pub subcategory: String,
    /// Website url: the homepage url, or the Crunchbase homepage (when available)
    /// if the homepage is the primary repository url.
    pub website: String,

    /// Date at which the project was accepted in the foundation.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accepted_at: Option<NaiveDate>,

    /// Additional categories and subcategories the item is listed in.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub additional_categories: Option<Vec<AdditionalCategory>>,

    /// User-defined annotations, sorted by key.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub annotations: Option<BTreeMap<String, String>>,

    /// Date at which the project was archived.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub archived_at: Option<NaiveDate>,

    /// Artwork url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub artwork_url: Option<String>,

    /// Security audits the project has undergone.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audits: Option<Vec<ItemAudit>>,

    /// Blog url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blog_url: Option<String>,

    /// Bluesky url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bluesky_url: Option<String>,

    /// Channel to discuss topics related to this item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chat_channel: Option<String>,

    /// Country where the organization the item belongs to is headquartered
    /// (from Crunchbase).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub country: Option<String>,

    /// Crunchbase url of the organization the item belongs to.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crunchbase_url: Option<String>,

    /// Resolved description: the item's own one, or the primary repository GitHub
    /// description or the Crunchbase description without emoji shortcodes.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Dev stats url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub devstats_url: Option<String>,

    /// Discord url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub discord_url: Option<String>,

    /// Docker url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub docker_url: Option<String>,

    /// Documentation url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub documentation_url: Option<String>,

    /// Whether the item corresponds to an end user.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enduser: Option<bool>,

    /// Facebook url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub facebook_url: Option<String>,

    /// Url to external financial details.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub funding_url: Option<String>,

    /// GitHub discussions url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub github_discussions_url: Option<String>,

    /// Gitter url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gitter_url: Option<String>,

    /// Date at which the project moved to graduated.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub graduated_at: Option<NaiveDate>,

    /// Date at which the project moved to incubating.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub incubating_at: Option<NaiveDate>,

    /// Date at which the member joined the foundation.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub joined_at: Option<NaiveDate>,

    /// Date of the last annual review presented by this project.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_annual_review_at: Option<NaiveDate>,

    /// Url of the last annual review presented by this project.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_annual_review_url: Option<String>,

    /// Slug used by LFX to reference the project.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lfx_slug: Option<String>,

    /// LinkedIn url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub linkedin_url: Option<String>,

    /// Mailing list url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mailing_list_url: Option<String>,

    /// Maturity of the project (e.g. `graduated`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub maturity: Option<String>,

    /// Members category subcategory of the organization the item belongs to.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub member_subcategory: Option<String>,

    /// OpenSSF best practices url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub openssf_best_practices_url: Option<String>,

    /// Whether the item is open source (its primary repository has a license).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub oss: Option<bool>,

    /// Other links of the item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub other_links: Option<Vec<ItemLink>>,

    /// Package manager url where the item is available.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub package_manager_url: Option<String>,

    /// Name of the parent project.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_project: Option<String>,

    /// Pinterest url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pinterest_url: Option<String>,

    /// Reddit url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reddit_url: Option<String>,

    /// Repositories of the item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repositories: Option<Vec<Repository>>,

    /// Slack url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub slack_url: Option<String>,

    /// Whether the item is a specification.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub specification: Option<bool>,

    /// Stack Overflow url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack_overflow_url: Option<String>,

    /// Summary information about the item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<ItemSummary>,

    /// Technical Advisory Groups (TAG) the item is associated to.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag: Option<Vec<String>>,

    /// Training certifications offered.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub training_certifications: Option<String>,

    /// Training type offered.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub training_type: Option<String>,

    /// Twitter url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub twitter_url: Option<String>,

    /// Whether the organization the item belongs to is unnamed.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unnamed_organization: Option<bool>,

    /// YouTube url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub youtube_url: Option<String>,
}

impl Item {
    /// Create a new item from the data::Item instance provided.
    ///
    /// `site_url` is the landscape url including the base path, as returned
    /// by [`site_url`]. The logo url is empty when the item has no logo (i.e.
    /// it could not be processed).
    fn from_data_item(item: &data::Item, site_url: &str) -> Self {
        Self {
            accepted_at: item.accepted_at,
            additional_categories: item.additional_categories.clone(),
            annotations: item.annotations.clone(),
            archived_at: item.archived_at,
            artwork_url: item.artwork_url.clone(),
            audits: item.audits.clone(),
            blog_url: item.blog_url.clone(),
            bluesky_url: item.bluesky_url.clone(),
            category: item.category.clone(),
            chat_channel: item.chat_channel.clone(),
            country: item.crunchbase_data.as_ref().and_then(|cb| cb.country.clone()),
            crunchbase_url: item.crunchbase_url.clone(),
            description: item.description.clone(),
            devstats_url: item.devstats_url.clone(),
            discord_url: item.discord_url.clone(),
            docker_url: item.docker_url.clone(),
            documentation_url: item.documentation_url.clone(),
            enduser: item.enduser,
            facebook_url: item.facebook_url.clone(),
            funding_url: item.funding_url.clone(),
            github_discussions_url: item.github_discussions_url.clone(),
            gitter_url: item.gitter_url.clone(),
            graduated_at: item.graduated_at,
            homepage_url: item.homepage_url.clone(),
            id: item.id.clone(),
            incubating_at: item.incubating_at,
            joined_at: item.joined_at,
            latest_annual_review_at: item.latest_annual_review_at,
            latest_annual_review_url: item.latest_annual_review_url.clone(),
            lfx_slug: item.lfx_slug.clone(),
            linkedin_url: item.linkedin_url.clone(),
            logo_url: if item.logo.is_empty() {
                String::new()
            } else {
                format!(
                    "{}/{}",
                    site_url.trim_end_matches('/'),
                    item.logo.trim_start_matches('/')
                )
            },
            mailing_list_url: item.mailing_list_url.clone(),
            maturity: item.maturity.clone(),
            member_subcategory: item.member_subcategory.clone(),
            name: item.name.clone(),
            openssf_best_practices_url: item.openssf_best_practices_url.clone(),
            oss: item.oss,
            other_links: item.other_links.clone(),
            package_manager_url: item.package_manager_url.clone(),
            parent_project: item.parent_project.clone(),
            pinterest_url: item.pinterest_url.clone(),
            reddit_url: item.reddit_url.clone(),
            repositories: item.repositories.as_ref().map(|repos| repos.iter().map(Into::into).collect()),
            slack_url: item.slack_url.clone(),
            specification: item.specification,
            stack_overflow_url: item.stack_overflow_url.clone(),
            subcategory: item.subcategory.clone(),
            summary: item.summary.clone(),
            tag: item.tag.clone(),
            training_certifications: item.training_certifications.clone(),
            training_type: item.training_type.clone(),
            twitter_url: item.twitter_url.clone(),
            unnamed_organization: item.unnamed_organization,
            website: item.website.clone(),
            youtube_url: item.youtube_url.clone(),
        }
    }
}

/// Repository information that will be exposed from the API.
#[derive(Serialize, Deserialize)]
pub(crate) struct Repository {
    /// Repository url.
    pub url: String,

    /// Branch used when collecting information for the repository.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,

    /// Number of contributors (from GitHub).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contributors: Option<usize>,

    /// Source code bytes written on each language (from GitHub).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub languages: Option<BTreeMap<String, i64>>,

    /// Timestamp of the latest release (from GitHub).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_release: Option<DateTime<Utc>>,

    /// Repository license (SPDX identifier): the data file override, or the
    /// one detected by GitHub.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,

    /// Whether this is the item's primary repository.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary: Option<bool>,

    /// Number of stars (from GitHub).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stars: Option<i64>,
}

impl From<&data::Repository> for Repository {
    fn from(r: &data::Repository) -> Self {
        Self {
            url: r.url.clone(),
            branch: r.branch.clone(),
            contributors: r.github_data.as_ref().map(|gh| gh.contributors.count),
            languages: r.github_data.as_ref().and_then(|gh| gh.languages.clone()),
            latest_release: r
                .github_data
                .as_ref()
                .and_then(|gh| gh.latest_release.as_ref().and_then(|release| release.ts)),
            license: r.license.clone().or_else(|| r.github_data.as_ref().and_then(|gh| gh.license.clone())),
            primary: r.primary,
            stars: r.github_data.as_ref().map(|gh| gh.stars),
        }
    }
}

/// Helper function to serialize the count value provided as a json string.
fn count_to_json(count: usize) -> String {
    json!({"count": count}).to_string()
}

/// Return the landscape site url: the url provided followed by the base path,
/// unless the url already ends with it. The result has no trailing slash, so
/// site relative paths can be appended after a `/`.
fn site_url(url: &str, base_path: Option<&str>) -> String {
    let url = url.trim_end_matches('/');
    match base_path.map(|base_path| base_path.trim_matches('/')) {
        Some(base_path) if !base_path.is_empty() && !url.ends_with(&format!("/{base_path}")) => {
            format!("{url}/{base_path}")
        }
        _ => url.to_string(),
    }
}

/// Helper function to serialize the given data structure as a json string
/// assuming the serialization will succeed.
fn to_json<T>(value: &T) -> String
where
    T: ?Sized + Serialize,
{
    serde_json::to_string(value).expect("serialization to succeed")
}

#[cfg(test)]
mod tests;

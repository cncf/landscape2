//! This module defines the types used to represent the landscape data that is
//! usually provided from a YAML file (landscape.yml). The landscape data is
//! the main source of information for a landscape.
//!
//! The landscape data representation used in this module doesn't match the
//! legacy format used by the existing landscapes data files. To maintain
//! backwards compatibility, this module provides a `legacy` submodule that
//! allows parsing the legacy format and convert it to the new one.

use std::{
    collections::{BTreeMap, HashMap},
    path::PathBuf,
    sync::LazyLock,
};

use anyhow::{Context, Result, bail};
use chrono::{DateTime, NaiveDate, Utc};
use clap::Args;
use regex::Regex;
use serde::{Deserialize, Serialize};
use tracing::instrument;

use crate::{
    settings::{self, FeaturedItemField, FeaturedItemRule, FeaturedItemRuleOption, LandscapeSettings},
    source::{self, Parsed, SourceKind, parse_yaml},
    util::normalize_name,
};

mod legacy;

/// Format used for dates across the landscape data file.
pub const DATE_FORMAT: &str = "%Y-%m-%d";

/// GitHub emoji shortcode (e.g. `:rocket:`), stripped from the fallback
/// descriptions.
static GITHUB_SHORTCODE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r":[a-z0-9_+-]+:").expect("exprs in GITHUB_SHORTCODE to be valid"));

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

    /// Read the raw landscape data from the file or url provided, preferring
    /// the file. Returns `None` when neither is set.
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or the url cannot be fetched.
    pub async fn read_raw(&self) -> Result<Option<String>> {
        source::read_raw(
            SourceKind::Data,
            self.data_file.as_deref(),
            self.data_url.as_deref(),
        )
        .await
    }
}

/// Landscape data.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct LandscapeData {
    /// Categories in the landscape, in the order they were defined.
    pub categories: Vec<Category>,
    /// Items in the landscape, in the order they were defined.
    pub items: Vec<Item>,
}

impl LandscapeData {
    /// Create a new landscape data instance from the source provided, logging
    /// the warnings found while parsing it.
    ///
    /// # Errors
    /// Returns an error if the source is missing, the file or URL cannot be read,
    /// or the data is invalid.
    #[instrument(skip_all, err)]
    pub async fn new(src: &DataSource) -> Result<Self> {
        // Read the raw landscape data from the source
        let Some(raw) = src.read_raw().await? else {
            bail!("data file or url not provided");
        };

        // Parse and validate the landscape data
        let landscape_data =
            LandscapeData::new_from_yaml(&raw)?.into_value_logging_warnings(SourceKind::Data);

        Ok(landscape_data)
    }

    /// Enrich the landscape data with the information from the settings and
    /// the data collected from external services.
    ///
    /// This is the single enrichment entry point shared by the build and the
    /// overlay. The steps run in a fixed order: the websites and descriptions
    /// are resolved last because they depend on the Crunchbase and GitHub data
    /// added in the first steps. Running it again leaves the data unchanged.
    #[instrument(skip_all)]
    pub fn enrich(
        &mut self,
        settings: &LandscapeSettings,
        crunchbase_data: &CrunchbaseData,
        github_data: &GithubData,
    ) {
        // Add the data collected from external services and the settings
        self.add_crunchbase_data(crunchbase_data);
        self.add_featured_items_data(settings);
        self.add_github_data(github_data);
        self.add_member_subcategory(settings.members_category.as_deref());
        self.add_tags(settings);
        self.set_enduser_flag(settings);

        // Resolve the websites and descriptions once the Crunchbase and GitHub
        // data are available
        self.set_websites();
        self.resolve_items_description();
    }

    /// Create a new landscape data instance from the raw legacy data provided,
    /// reporting unknown keys and non-fatal validation issues as warnings.
    ///
    /// # Errors
    /// Returns an error if the data is not valid YAML or does not pass the
    /// validation.
    pub fn new_from_yaml(raw: &str) -> Result<Parsed<Self>> {
        LandscapeData::parse(raw).with_context(|| SourceKind::Data.invalid_file_context())
    }

    /// Add items Crunchbase data.
    #[instrument(skip_all)]
    fn add_crunchbase_data(&mut self, crunchbase_data: &CrunchbaseData) {
        for item in &mut self.items {
            if let Some(crunchbase_url) = item.crunchbase_url.as_ref()
                && let Some(org_crunchbase_data) = crunchbase_data.get(crunchbase_url)
            {
                item.crunchbase_data = Some(org_crunchbase_data.clone());
            }
        }
    }

    /// Add featured items information to the landscape data based on the
    /// settings provided (i.e. graduated and incubating projects must be
    /// featured and the former displayed first).
    ///
    /// Rules are applied in order, so the last rule matching an item wins.
    /// Subcategory rules are matched against the item's primary subcategory.
    #[instrument(skip_all)]
    fn add_featured_items_data(&mut self, settings: &LandscapeSettings) {
        let Some(rules) = &settings.featured_items else {
            return;
        };

        for rule in rules {
            match rule.field {
                FeaturedItemField::Maturity => {
                    for item in &mut self.items {
                        if let Some(item_maturity) = item.maturity.as_ref()
                            && let Some(option) = rule.options.iter().find(|o| o.value == *item_maturity)
                        {
                            item.featured = Some(ItemFeatured::new(rule, option));
                        }
                    }
                }
                FeaturedItemField::Subcategory => {
                    for item in &mut self.items {
                        if let Some(option) = rule.options.iter().find(|o| o.value == item.subcategory) {
                            item.featured = Some(ItemFeatured::new(rule, option));
                        }
                    }
                }
            }
        }
    }

    /// Add items repositories GitHub data.
    #[instrument(skip_all)]
    fn add_github_data(&mut self, github_data: &GithubData) {
        for item in &mut self.items {
            // Add GH data to each of the items repositories
            if let Some(repos) = &mut item.repositories {
                for repo in repos {
                    if let Some(repo_github_data) = github_data.get(&repo.url) {
                        repo.github_data = Some(repo_github_data.clone());
                    }
                }
            }

            // Set item's oss field
            if let Some(repo) = item.primary_repository()
                && (repo.license.is_some()
                    || repo.github_data.as_ref().is_some_and(|gh| gh.license.is_some()))
            {
                item.oss = Some(true);
            }
        }
    }

    /// Add items member subcategory.
    #[instrument(skip_all)]
    fn add_member_subcategory(&mut self, members_category: Option<&str>) {
        let Some(members_category) = members_category else {
            return;
        };

        // Create a map with the member subcategory for each Crunchbase url
        let mut members_subcategories: HashMap<String, String> = HashMap::new();
        for item in self.items.iter().filter(|i| i.category == members_category) {
            if let Some(crunchbase_url) = &item.crunchbase_url {
                members_subcategories.insert(crunchbase_url.clone(), item.subcategory.clone());
            }
        }

        // Set item's member subcategory using the item's Crunchbase url to match
        for item in &mut self.items {
            if let Some(crunchbase_url) = &item.crunchbase_url
                && let Some(member_subcategory) = members_subcategories.get(crunchbase_url)
            {
                item.member_subcategory = Some(member_subcategory.clone());
            }
        }
    }

    /// Add projects items TAG based on the TAGs settings.
    #[instrument(skip_all)]
    fn add_tags(&mut self, settings: &LandscapeSettings) {
        let Some(tags) = &settings.tags else {
            return;
        };

        // Helper closure to find the first TAG (in name order) with a rule
        // matching the item
        let find_tag = |item: &Item| {
            tags.iter()
                .find(|(_, rules)| rules.iter().any(|rule| rule.matches(&item.category, &item.subcategory)))
                .map(|(tag, _)| tag.clone())
        };

        // Iterate over items and set TAG when found
        for item in &mut self.items {
            // Only projects should be associated to a TAG
            if item.maturity.is_none() {
                continue;
            }

            // TAGs already set at the item level have precedence
            if item.tag.is_some() {
                continue;
            }

            // Try to find the appropriate TAG based on the settings
            if let Some(tag) = find_tag(item) {
                item.tag = Some(vec![tag]);
            }
        }
    }

    /// Parse and validate the raw legacy data provided, converting it to the
    /// new format.
    fn parse(raw: &str) -> Result<Parsed<Self>> {
        // Parse the raw legacy data, collecting the unknown keys warnings
        let Parsed {
            value: legacy_data,
            mut warnings,
        } = parse_yaml::<legacy::LandscapeData>(raw)?;

        // Validate the legacy data and convert it to the new format
        warnings.extend(legacy_data.validate()?);
        let landscape_data = LandscapeData::from(legacy_data);

        Ok(Parsed {
            value: landscape_data,
            warnings,
        })
    }

    /// Set items description to the resolved one, so that every generated
    /// output carries the same value. See [`Item::description`] for the rules.
    #[instrument(skip_all)]
    fn resolve_items_description(&mut self) {
        for item in &mut self.items {
            item.description = item.description();
        }
    }

    /// Set items `enduser` flag based on the settings provided.
    #[instrument(skip_all)]
    fn set_enduser_flag(&mut self, settings: &LandscapeSettings) {
        let Some(enduser) = &settings.enduser else {
            return;
        };

        // Iterate over items and set enduser flag when applicable
        for item in &mut self.items {
            // `enduser` values set at the item level have precedence
            if item.enduser.is_some() {
                continue;
            }

            // Set `enduser` flag when the category/subcategory matches any rule
            if enduser.iter().any(|rule| rule.matches(&item.category, &item.subcategory)) {
                item.enduser = Some(true);
            }
        }
    }

    /// Set items website, falling back to the Crunchbase homepage when the
    /// item's homepage is its primary repository.
    #[instrument(skip_all)]
    fn set_websites(&mut self) {
        for item in &mut self.items {
            item.set_website();
        }
    }
}

impl From<legacy::LandscapeData> for LandscapeData {
    #[expect(clippy::too_many_lines)]
    fn from(legacy_data: legacy::LandscapeData) -> Self {
        let mut data = LandscapeData::default();

        // Categories
        for legacy_category in legacy_data.landscape {
            let category_norm = normalize_name(&legacy_category.name);
            let mut category = Category {
                name: legacy_category.name,
                normalized_name: category_norm,
                subcategories: vec![],
            };

            // Subcategories
            for legacy_subcategory in legacy_category.subcategories {
                let subcategory_norm = normalize_name(&legacy_subcategory.name);
                let subcategory = Subcategory {
                    name: legacy_subcategory.name,
                    normalized_name: subcategory_norm,
                };

                // Items
                for legacy_item in legacy_subcategory.items {
                    // Base item information
                    let mut item = Item {
                        category: category.name.clone(),
                        homepage_url: legacy_item.homepage_url,
                        logo: legacy_item.logo,
                        name: legacy_item.name,
                        subcategory: subcategory.name.clone(),
                        crunchbase_url: legacy_item.crunchbase,
                        description: legacy_item.description,
                        enduser: legacy_item.enduser,
                        joined_at: legacy_item.joined,
                        maturity: legacy_item.project,
                        openssf_best_practices_url: legacy_item.url_for_bestpractices,
                        twitter_url: legacy_item.twitter,
                        unnamed_organization: legacy_item.unnamed_organization,
                        ..Default::default()
                    };

                    // Additional categories
                    if let Some(second_path) = legacy_item.second_path {
                        // The entries were checked by the validation
                        let additional_categories: Vec<AdditionalCategory> = second_path
                            .iter()
                            .filter_map(|entry| parse_second_path(entry))
                            .map(|(category, subcategory)| AdditionalCategory {
                                category: category.to_string(),
                                subcategory: subcategory.to_string(),
                            })
                            .collect();
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
                            license: legacy_item.license,
                            primary: Some(true),
                        });
                    }
                    if let Some(additional_repos) = legacy_item.additional_repos {
                        for entry in additional_repos {
                            repositories.push(Repository {
                                url: entry.repo_url,
                                branch: entry.branch,
                                github_data: None,
                                license: entry.license,
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
                        item.annotations = extra.annotations;
                        item.archived_at = extra.archived;
                        item.artwork_url = extra.artwork_url;
                        item.audits = extra.audits;
                        item.blog_url = extra.blog_url;
                        item.bluesky_url = extra.bluesky_url;
                        item.chat_channel = extra.chat_channel;
                        item.clomonitor_name = extra.clomonitor_name;
                        item.devstats_url = extra.dev_stats_url;
                        item.discord_url = extra.discord_url;
                        item.docker_url = extra.docker_url;
                        item.documentation_url = extra.documentation_url;
                        item.facebook_url = extra.facebook_url;
                        item.funding_url = extra.funding_url;
                        item.github_discussions_url = extra.github_discussions_url;
                        item.gitter_url = extra.gitter_url;
                        item.graduated_at = extra.graduated;
                        item.incubating_at = extra.incubating;
                        item.latest_annual_review_at = extra.annual_review_date;
                        item.latest_annual_review_url = extra.annual_review_url;
                        item.lfx_slug = extra.lfx_slug;
                        item.linkedin_url = extra.linkedin_url;
                        item.mailing_list_url = extra.mailing_list_url;
                        item.other_links = extra.other_links;
                        item.package_manager_url = extra.package_manager_url;
                        item.parent_project = extra.parent_project;
                        item.pinterest_url = extra.pinterest_url;
                        item.reddit_url = extra.reddit_url;
                        item.slack_url = extra.slack_url;
                        item.specification = extra.specification;
                        item.stack_overflow_url = extra.stack_overflow_url;
                        item.tag = extra.tag;
                        item.training_certifications = extra.training_certifications;
                        item.training_type = extra.training_type;
                        item.youtube_url = extra.youtube_url;

                        // Summary information
                        let summary = ItemSummary {
                            business_use_case: extra.summary_business_use_case,
                            integration: extra.summary_integration,
                            integrations: extra.summary_integrations,
                            intro_url: extra
                                .summary_intro_url
                                .as_deref()
                                .and_then(split_list)
                                .map(|urls| urls.join(", ")),
                            personas: extra.summary_personas.as_deref().and_then(split_list),
                            release_rate: extra.summary_release_rate,
                            tags: extra.summary_tags.as_deref().and_then(split_list),
                            use_case: extra.summary_use_case,
                        };
                        if summary != ItemSummary::default() {
                            item.summary = Some(summary);
                        }
                    }

                    item.set_id(&category.normalized_name, &subcategory.normalized_name);
                    item.website.clone_from(&item.homepage_url);
                    data.items.push(item);
                }

                category.subcategories.push(subcategory);
            }

            data.categories.push(category);
        }

        data
    }
}

/// Landscape category.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct Category {
    /// Name of the category.
    pub name: CategoryName,
    /// Normalized name of the category, used in ids and urls.
    pub normalized_name: CategoryName,
    /// Subcategories in the category, in the order they were defined.
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
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct Subcategory {
    /// Name of the subcategory.
    pub name: SubcategoryName,
    /// Normalized name of the subcategory, used in ids and urls.
    pub normalized_name: SubcategoryName,
}

/// Landscape item (project, product, member, etc).
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    derive(ts_rs::TS),
    ts(export_to = "core/", optional_fields, rename = "FullItem")
)]
pub struct Item {
    /// Name of the category the item belongs to.
    pub category: String,
    /// Homepage url.
    pub homepage_url: String,
    /// Item identifier, built from its category, subcategory and name normalized names.
    pub id: String,
    /// File name of the logo, relative to the landscape logos path.
    pub logo: String,
    /// Name of the item.
    pub name: String,
    /// Name of the subcategory the item belongs to.
    pub subcategory: String,
    /// Website url: the homepage url, or the Crunchbase homepage (when
    /// available) if the homepage is the primary repository url.
    pub website: String,

    /// Date at which the project was accepted in the foundation.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accepted_at: Option<NaiveDate>,

    /// Additional categories and subcategories the item is listed in (`second_path`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub additional_categories: Option<Vec<AdditionalCategory>>,

    /// User-defined annotations, not used by the landscape itself (exposed through the API, not
    /// serialized in the datasets).
    #[serde(default, skip_serializing)]
    #[cfg_attr(feature = "ts", ts(skip))]
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

    /// Channel to discuss topics related to this item (exposed through the API, not
    /// serialized in the datasets).
    #[serde(default, skip_serializing)]
    #[cfg_attr(feature = "ts", ts(skip))]
    pub chat_channel: Option<String>,

    /// Name of the project in CLOMonitor matching this item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clomonitor_name: Option<String>,

    /// Path of the CLOMonitor report summary, set by the build when available.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clomonitor_report_summary: Option<String>,

    /// Crunchbase data of the organization the item belongs to (not serialized).
    #[serde(skip_serializing)]
    #[cfg_attr(feature = "ts", ts(skip))]
    pub crunchbase_data: Option<Organization>,

    /// Crunchbase url of the organization the item belongs to.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crunchbase_url: Option<String>,

    /// Description of the item, replaced with the resolved one by
    /// [`LandscapeData::enrich`].
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

    /// Featured information, set from the settings featured item rules.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub featured: Option<ItemFeatured>,

    /// Url to external financial details, shown instead of the funding rounds.
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

    /// Date of the last annual review presented by this project (exposed through the API, not
    /// serialized in the datasets).
    #[serde(default, skip_serializing)]
    #[cfg_attr(feature = "ts", ts(skip))]
    pub latest_annual_review_at: Option<NaiveDate>,

    /// Url of the last annual review presented by this project (exposed through the API, not
    /// serialized in the datasets).
    #[serde(default, skip_serializing)]
    #[cfg_attr(feature = "ts", ts(skip))]
    pub latest_annual_review_url: Option<String>,

    /// Slug used by LFX to reference the project (exposed through the API, not
    /// serialized in the datasets).
    #[serde(default, skip_serializing)]
    #[cfg_attr(feature = "ts", ts(skip))]
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

    /// Links to feature in the item's details view.
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

    /// Repositories of the item, starting with the primary one.
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

    /// Training certifications offered (exposed through the API, not
    /// serialized in the datasets).
    #[serde(default, skip_serializing)]
    #[cfg_attr(feature = "ts", ts(skip))]
    pub training_certifications: Option<String>,

    /// Training type offered (exposed through the API, not
    /// serialized in the datasets).
    #[serde(default, skip_serializing)]
    #[cfg_attr(feature = "ts", ts(skip))]
    pub training_type: Option<String>,

    /// Twitter url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub twitter_url: Option<String>,

    /// Whether the organization the item belongs to is unnamed (exposed through the API, not
    /// serialized in the datasets).
    #[serde(default, skip_serializing)]
    #[cfg_attr(feature = "ts", ts(skip))]
    pub unnamed_organization: Option<bool>,

    /// YouTube url.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub youtube_url: Option<String>,
}

impl Item {
    /// Get primary repository if available.
    #[must_use]
    pub fn primary_repository(&self) -> Option<&Repository> {
        self.repositories
            .as_ref()
            .and_then(|repos| repos.iter().find(|r| r.primary.unwrap_or_default()))
    }

    /// Get item's resolved description.
    ///
    /// The item's own description is preferred and kept verbatim, followed by
    /// the primary repository GitHub description and the Crunchbase
    /// description. GitHub emoji shortcodes are stripped from these fallback
    /// values, which are then trimmed. Empty values are skipped, so `None` is
    /// returned when all are empty.
    fn description(&self) -> Option<String> {
        // Prefer the item's own description
        if let Some(description) = self.description.as_ref().filter(|d| !d.is_empty()) {
            return Some(description.clone());
        }

        // Fall back to the first cleaned GitHub or Crunchbase description
        let github_description = self
            .primary_repository()
            .and_then(|r| r.github_data.as_ref())
            .map(|gh| gh.description.as_str());
        let crunchbase_description = self.crunchbase_data.as_ref().and_then(|cb| cb.description.as_deref());
        [github_description, crunchbase_description]
            .into_iter()
            .flatten()
            .map(strip_github_shortcodes)
            .find(|d| !d.is_empty())
    }

    /// Generate and set the item's id from its category and subcategory
    /// normalized names.
    fn set_id(&mut self, category_norm: &str, subcategory_norm: &str) {
        self.id = item_id(category_norm, subcategory_norm, &self.name);
    }

    /// Set item's website.
    ///
    /// The homepage URL is the preferred source for the website. However, when
    /// it matches the primary repository URL, we'll fallback to the homepage
    /// URL defined in the Crunchbase data -when available-.
    fn set_website(&mut self) {
        if let Some(primary_repository) = self.primary_repository()
            && self.homepage_url == primary_repository.url
            && let Some(crunchbase_data) = &self.crunchbase_data
            && let Some(cb_homepage_url) = &crunchbase_data.homepage_url
        {
            self.website.clone_from(cb_homepage_url);
            return;
        }

        self.website.clone_from(&self.homepage_url);
    }
}

/// Crunchbase acquisition details.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct Acquisition {
    /// Crunchbase permalink of the acquired organization.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub acquiree_cb_permalink: Option<String>,

    /// Name of the acquired organization.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub acquiree_name: Option<String>,

    /// Date the acquisition was announced on.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub announced_on: Option<NaiveDate>,

    /// Acquisition price, in USD.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price: Option<u64>,
}

/// Additional category/subcategory an item can belong to.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct AdditionalCategory {
    /// Name of the additional category.
    pub category: CategoryName,
    /// Name of the additional subcategory.
    pub subcategory: SubcategoryName,
}

/// Classification option (an item maturity or TAG value).
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct ClassificationOption {
    /// Name of the option.
    pub name: String,
    /// Normalized name of the option, used in embed keys and anchors.
    pub normalized_name: String,
}

impl ClassificationOption {
    /// Create a new classification option from its name.
    #[must_use]
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            normalized_name: normalize_name(name),
        }
    }
}

/// Commit information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct Commit {
    /// Commit url.
    pub url: String,

    /// Commit timestamp.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ts: Option<DateTime<Utc>>,
}

/// Contributors information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct Contributors {
    /// Number of contributors.
    pub count: usize,
    /// Url of the repository contributors page.
    pub url: String,
}

/// Crunchbase funding round details.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct FundingRound {
    /// Money raised in the funding round, in USD.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub amount: Option<u64>,

    /// Date the funding round was announced on.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub announced_on: Option<NaiveDate>,

    /// Kind of funding round (e.g. `series_a`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,
}

/// Landscape item audit information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct ItemAudit {
    /// Date of the audit.
    pub date: NaiveDate,
    /// Audit type (`type` in the data file).
    #[serde(rename = "type")]
    pub kind: String,
    /// Url of the audit report.
    pub url: String,
    /// Name of the vendor who did the audit.
    pub vendor: String,
}

/// Landscape item featured information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct ItemFeatured {
    /// Normalized names of the groups where the featured highlight is hidden
    /// (the same values as the groups `normalized_name`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub excluded_groups: Option<Vec<String>>,

    /// Label displayed on the featured item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,

    /// Order of the featured item (lower values are displayed first).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub order: Option<usize>,
}

impl ItemFeatured {
    /// Create a new featured information instance from the featured item rule
    /// and the option matching the item.
    fn new(rule: &FeaturedItemRule, option: &FeaturedItemRuleOption) -> Self {
        let excluded_groups = rule
            .exclude
            .as_ref()
            .and_then(|exclude| exclude.groups.as_ref())
            .filter(|groups| !groups.is_empty())
            .map(|groups| groups.iter().map(|group| normalize_name(group)).collect());

        Self {
            excluded_groups,
            label: option.label.clone(),
            order: option.order,
        }
    }
}

/// Landscape item link.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct ItemLink {
    /// Name of the link.
    pub name: String,
    /// Url of the link (`https://...` or `mailto:...`).
    pub url: String,
}

/// Landscape item summary.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct ItemSummary {
    /// Description of the business use case.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub business_use_case: Option<String>,

    /// Comma separated list of other projects this item integrates with.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub integration: Option<String>,

    /// Alternative field for `integration`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub integrations: Option<String>,

    /// Video urls of the item's pitch, separated by a comma and a space.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intro_url: Option<String>,

    /// Target users this item is intended for.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub personas: Option<Vec<String>>,

    /// How often a new version of the item is released.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release_rate: Option<String>,

    /// Keywords that describe the item.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,

    /// Description of the technical problem this item solves.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub use_case: Option<String>,
}

/// Organization information collected from Crunchbase.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct Organization {
    /// Time the information was collected at.
    pub generated_at: DateTime<Utc>,

    /// Acquisitions made by the organization.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub acquisitions: Option<Vec<Acquisition>>,

    /// Crunchbase categories of the organization.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<String>>,

    /// City where the organization is headquartered.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub city: Option<String>,

    /// Company type (e.g. `for_profit`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub company_type: Option<String>,

    /// Country where the organization is headquartered.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub country: Option<String>,

    /// Description of the organization.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Total funding raised by the organization, in USD.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub funding: Option<i64>,

    /// Funding rounds of the organization.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub funding_rounds: Option<Vec<FundingRound>>,

    /// Homepage url of the organization.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub homepage_url: Option<String>,

    /// Kind of organization (e.g. `company`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,

    /// LinkedIn url of the organization.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub linkedin_url: Option<String>,

    /// Name of the organization.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Maximum number of employees.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_employees_max: Option<i64>,

    /// Minimum number of employees.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_employees_min: Option<i64>,

    /// Region where the organization is headquartered.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub region: Option<String>,

    /// Stock exchange where the organization is listed.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stock_exchange: Option<String>,

    /// Stock ticker of the organization.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ticker: Option<String>,

    /// Twitter url of the organization.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub twitter_url: Option<String>,
}

/// Release information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct Release {
    /// Release url.
    pub url: String,

    /// Release timestamp.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ts: Option<DateTime<Utc>>,
}

/// Repository information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    derive(ts_rs::TS),
    ts(export_to = "core/", optional_fields, rename = "FullRepository")
)]
pub struct Repository {
    /// Repository url.
    pub url: String,

    /// Branch to use when collecting information for the repository.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,

    /// Information collected from GitHub (not serialized).
    #[serde(skip_serializing)]
    #[cfg_attr(feature = "ts", ts(skip))]
    pub github_data: Option<RepositoryGithubData>,

    /// Repository license (SPDX identifier), overriding the one in GitHub.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,

    /// Whether this is the item's primary repository.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub primary: Option<bool>,
}

/// Repository information collected from GitHub.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct RepositoryGithubData {
    /// Contributors information.
    pub contributors: Contributors,
    /// Repository description.
    pub description: String,
    /// Time the information was collected at.
    pub generated_at: DateTime<Utc>,
    /// Latest commit information.
    pub latest_commit: Commit,
    /// Number of commits per week over the last year (most recent week last).
    pub participation_stats: Vec<i64>,
    /// Number of stars.
    pub stars: i64,
    /// Repository url.
    pub url: String,

    /// First commit information.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_commit: Option<Commit>,

    /// Source code bytes written on each language.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub languages: Option<BTreeMap<String, i64>>,

    /// Latest release information.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_release: Option<Release>,

    /// Repository license, as named by GitHub (for example "Apache License
    /// 2.0", or "Other" when GitHub cannot identify it).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,

    /// Repository topics.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub topics: Vec<String>,
}

/// Build an item id from its category and subcategory normalized names and
/// its raw name.
///
/// Ids are used in URLs, embed file names and API paths, so the validation
/// uses this same function to reject the items whose ids would collide.
pub(crate) fn item_id(category_norm: &str, subcategory_norm: &str, name: &str) -> String {
    format!("{category_norm}--{subcategory_norm}--{}", normalize_name(name))
}

/// Parse a legacy `second_path` entry (`category / subcategory`), returning
/// its trimmed category and subcategory names.
///
/// Returns `None` unless the entry has exactly one ` / ` separator with two
/// non-empty sides.
pub(crate) fn parse_second_path(entry: &str) -> Option<(&str, &str)> {
    let mut parts = entry.split(" / ");
    let (Some(category), Some(subcategory), None) = (parts.next(), parts.next(), parts.next()) else {
        return None;
    };
    let (category, subcategory) = (category.trim(), subcategory.trim());
    if category.is_empty() || subcategory.is_empty() {
        return None;
    }
    Some((category, subcategory))
}

/// Split a comma separated list, trimming its entries and dropping the empty
/// ones. Returns `None` when no entries are left.
fn split_list(value: &str) -> Option<Vec<String>> {
    let entries: Vec<String> = value
        .split(',')
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
        .map(ToString::to_string)
        .collect();
    (!entries.is_empty()).then_some(entries)
}

/// Strip the GitHub emoji shortcodes from the value provided and trim it.
fn strip_github_shortcodes(value: &str) -> String {
    GITHUB_SHORTCODE.replace_all(value, "").trim().to_string()
}

#[cfg(test)]
mod tests;

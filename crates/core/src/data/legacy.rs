//! This module defines some types used to parse the landscape data file in
//! legacy format and convert it to the new one.

use std::{
    collections::{BTreeMap, HashMap, HashSet, hash_map::Entry},
    path::{Component, Path},
    sync::LazyLock,
};

use anyhow::{Context, Result, bail, format_err};
use chrono::NaiveDate;
use regex::Regex;
use serde::{Deserialize, de::IgnoredAny};

use crate::util::{RESERVED_CLASSIFICATION_VALUE, TAG_NAME, normalize_name, validate_url};

use super::{ItemAudit, ItemLink, item_id, parse_second_path};

/// CLOMonitor project name regular expression.
static CLOMONITOR_NAME: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^[A-Za-z0-9][A-Za-z0-9._-]*$").expect("exprs in CLOMONITOR_NAME to be valid")
});

/// Landscape data (legacy format).
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
pub(super) struct LandscapeData {
    /// Categories in the landscape (it can also be named `categories`).
    #[serde(alias = "categories")]
    pub landscape: Vec<Category>,
}

impl LandscapeData {
    /// Validate landscape data.
    ///
    /// Category, subcategory and item names are checked through their
    /// normalized form, as that is what ids, embed keys and API paths use.
    pub fn validate(&self) -> Result<()> {
        // Index the categories and subcategories second paths can point to
        let mut categories_index: CategoriesIndex<'_> = HashMap::new();
        for category in &self.landscape {
            categories_index
                .entry(category.name.as_str())
                .or_default()
                .extend(category.subcategories.iter().map(|sc| sc.name.as_str()));
        }

        // Check every category, tracking the values that must be unique
        let mut state = ValidationState::default();
        let mut categories_seen = HashMap::new();
        for (category_index, category) in self.landscape.iter().enumerate() {
            // Check category name
            if category.name.trim().is_empty() {
                bail!("category [{category_index}] name is required");
            }
            let category_ctx = || format!("category [{}] is not valid", category.name);
            let category_norm = normalize_name(&category.name);
            if category_norm.is_empty() {
                return Err(format_err!("name must contain at least one letter or digit"))
                    .with_context(category_ctx);
            }

            let mut subcategories_seen = HashMap::new();
            for (subcategory_index, subcategory) in category.subcategories.iter().enumerate() {
                // Check subcategory name
                if subcategory.name.trim().is_empty() {
                    bail!(
                        "subcategory [{subcategory_index}] name is required (category: [{}])",
                        category.name
                    );
                }
                let subcategory_ctx = || {
                    format!(
                        "subcategory [{}] is not valid (category: [{}])",
                        subcategory.name, category.name
                    )
                };
                let subcategory_norm = normalize_name(&subcategory.name);
                if subcategory_norm.is_empty() {
                    return Err(format_err!("name must contain at least one letter or digit"))
                        .with_context(subcategory_ctx);
                }

                // Check items
                for (item_index, item) in subcategory.items.iter().enumerate() {
                    let item_ctx = || {
                        let item_name = if item.name.trim().is_empty() {
                            item_index.to_string()
                        } else {
                            item.name.clone()
                        };
                        format!(
                            "item [{item_name}] is not valid (category: [{}] | subcategory: [{}])",
                            category.name, subcategory.name
                        )
                    };
                    item.validate(&category_norm, &subcategory_norm, &categories_index, &mut state)
                        .with_context(item_ctx)?;
                }

                // Check the subcategory name is unique within its category. It
                // is checked after the items so that the more specific item id
                // collisions are reported first
                track_unique_name(
                    &mut subcategories_seen,
                    subcategory_norm,
                    &subcategory.name,
                    "subcategory",
                )
                .with_context(subcategory_ctx)?;
            }

            // Check the category name is unique across the file, once its
            // subcategories and items have been checked
            track_unique_name(&mut categories_seen, category_norm, &category.name, "category")
                .with_context(category_ctx)?;
        }

        Ok(())
    }
}

/// Landscape category.
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
pub(super) struct Category {
    /// Name of the category.
    pub name: String,
    /// Subcategories in the category.
    pub subcategories: Vec<SubCategory>,

    /// Null `category` key marking the start of a category entry.
    #[expect(clippy::struct_field_names)]
    #[serde(default, rename = "category")]
    pub category_marker: Option<IgnoredAny>,
}

/// Landscape subcategory.
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
pub(super) struct SubCategory {
    /// Items in the subcategory.
    pub items: Vec<Item>,
    /// Name of the subcategory.
    pub name: String,

    /// Null `subcategory` key marking the start of a subcategory entry.
    #[serde(default, rename = "subcategory")]
    pub subcategory_marker: Option<IgnoredAny>,
}

/// Landscape item (project, product, member, etc).
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
pub(super) struct Item {
    /// Homepage url.
    pub homepage_url: String,
    /// File name of the logo, relative to the landscape logos path.
    pub logo: String,
    /// Name of the item.
    pub name: String,

    /// Additional repositories.
    pub additional_repos: Option<Vec<Repository>>,
    /// Branch to use when collecting information for the primary repository.
    pub branch: Option<String>,
    /// Crunchbase url of the organization this item belongs to.
    pub crunchbase: Option<String>,
    /// Description of the item.
    pub description: Option<String>,
    /// Whether the item corresponds to an end user.
    pub enduser: Option<bool>,
    /// Extra information about the item.
    pub extra: Option<ItemExtra>,
    /// Null `item` key marking the start of an item entry.
    #[expect(clippy::struct_field_names)]
    #[serde(default, rename = "item")]
    pub item_marker: Option<IgnoredAny>,
    /// Date at which the member joined the foundation.
    pub joined: Option<NaiveDate>,
    /// Primary repository license, overriding the one in GitHub.
    pub license: Option<String>,
    /// Maturity of the project.
    pub project: Option<String>,
    /// Url of the primary repository.
    pub repo_url: Option<String>,
    /// Alternative `category / subcategory` entries where the item is listed.
    pub second_path: Option<Vec<String>>,
    /// Twitter url.
    pub twitter: Option<String>,
    /// Whether the organization the item belongs to is unnamed.
    pub unnamed_organization: Option<bool>,
    /// OpenSSF best practices url.
    pub url_for_bestpractices: Option<String>,
}

impl Item {
    /// Validate the item, tracking the values that must be unique across the
    /// whole file in the validation state provided.
    fn validate(
        &self,
        category_norm: &str,
        subcategory_norm: &str,
        categories_index: &CategoriesIndex<'_>,
        state: &mut ValidationState,
    ) -> Result<()> {
        // Check name and id
        if self.name.trim().is_empty() {
            bail!("item name is required");
        }
        if normalize_name(&self.name).is_empty() {
            bail!("item name must contain at least one letter or digit");
        }
        match state.item_ids.entry(item_id(category_norm, subcategory_norm, &self.name)) {
            Entry::Occupied(entry) => {
                bail!(
                    "duplicate item id {} (also used by item [{}])",
                    entry.key(),
                    entry.get()
                )
            }
            Entry::Vacant(entry) => {
                entry.insert(self.name.clone());
            }
        }

        // Check homepage
        if self.homepage_url.trim().is_empty() {
            bail!("homepage url is required");
        }

        // Check logo
        validate_logo(&self.logo)?;

        // Check maturity
        if let Some(maturity) = &self.project {
            track_classification_value(&mut state.maturities, maturity, "maturity")?;
        }

        // Check some values in extra
        if let Some(extra) = &self.extra {
            // Check other links
            if let Some(other_links) = &extra.other_links {
                for link in other_links {
                    if link.name.trim().is_empty() {
                        bail!("link name is required");
                    }
                    if link.url.trim().is_empty() {
                        bail!("link url is required");
                    }
                }
            }

            // Check TAGs names
            if let Some(tags) = &extra.tag {
                for tag in tags {
                    if !TAG_NAME.is_match(tag) {
                        bail!("invalid tag (must use only lowercase letters, digits and hyphens)");
                    }
                    track_classification_value(&mut state.tags, tag, "tag")?;
                }
            }

            // Check CLOMonitor name, as it ends up in file names and urls
            if let Some(clomonitor_name) = &extra.clomonitor_name
                && (!CLOMONITOR_NAME.is_match(clomonitor_name) || clomonitor_name.contains(".."))
            {
                bail!(
                    "invalid clomonitor_name (must start with a letter or digit and use only letters, digits, dots, underscores and hyphens, without ..)"
                );
            }
        }

        // Check second path entries
        if let Some(second_path) = &self.second_path {
            for entry in second_path {
                validate_second_path(entry, categories_index)?;
            }
        }

        // Check urls
        validate_urls(self)
    }
}

/// Extra information for a landscape item.
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
pub(super) struct ItemExtra {
    /// Date at which the project was accepted in the foundation.
    pub accepted: Option<NaiveDate>,
    /// User-defined annotations.
    pub annotations: Option<BTreeMap<String, String>>,
    /// Date of the last annual review presented by this project.
    pub annual_review_date: Option<NaiveDate>,
    /// Url of the last annual review presented by this project.
    pub annual_review_url: Option<String>,
    /// Date at which the project was archived.
    pub archived: Option<NaiveDate>,
    /// Artwork url.
    pub artwork_url: Option<String>,
    /// Security audits the project has undergone.
    pub audits: Option<Vec<ItemAudit>>,
    /// Blog url.
    pub blog_url: Option<String>,
    /// Bluesky url.
    pub bluesky_url: Option<String>,
    /// Channel to discuss topics related to this item.
    pub chat_channel: Option<String>,
    /// Name of the project in CLOMonitor matching this item.
    pub clomonitor_name: Option<String>,
    /// Dev stats url.
    pub dev_stats_url: Option<String>,
    /// Discord url.
    pub discord_url: Option<String>,
    /// Docker url.
    pub docker_url: Option<String>,
    /// Documentation url.
    pub documentation_url: Option<String>,
    /// Facebook url.
    pub facebook_url: Option<String>,
    /// Url to external financial details.
    pub funding_url: Option<String>,
    /// GitHub discussions url.
    pub github_discussions_url: Option<String>,
    /// Gitter url.
    pub gitter_url: Option<String>,
    /// Date at which the project moved to graduated.
    pub graduated: Option<NaiveDate>,
    /// Date at which the project moved to incubating.
    pub incubating: Option<NaiveDate>,
    /// Slug used by LFX to reference the project.
    pub lfx_slug: Option<String>,
    /// LinkedIn url.
    pub linkedin_url: Option<String>,
    /// Mailing list url.
    pub mailing_list_url: Option<String>,
    /// Links to feature in the item's details view.
    pub other_links: Option<Vec<ItemLink>>,
    /// Package manager url where the item is available.
    pub package_manager_url: Option<String>,
    /// Name of the parent project.
    pub parent_project: Option<String>,
    /// Pinterest url.
    pub pinterest_url: Option<String>,
    /// Reddit url.
    pub reddit_url: Option<String>,
    /// Slack url.
    pub slack_url: Option<String>,
    /// Whether the item is a specification.
    pub specification: Option<bool>,
    /// Stack Overflow url.
    pub stack_overflow_url: Option<String>,
    /// Description of the business use case.
    pub summary_business_use_case: Option<String>,
    /// Comma separated list of other projects this item integrates with.
    pub summary_integration: Option<String>,
    /// Alternative field for `summary_integration`.
    pub summary_integrations: Option<String>,
    /// Video url of the item's pitch.
    pub summary_intro_url: Option<String>,
    /// Comma separated list of target users this item is intended for.
    pub summary_personas: Option<String>,
    /// How often a new version of the item is released.
    pub summary_release_rate: Option<String>,
    /// Comma separated keywords that describe the item.
    pub summary_tags: Option<String>,
    /// Description of the technical problem this item solves.
    pub summary_use_case: Option<String>,
    /// Technical Advisory Groups (TAG) the item is associated to.
    pub tag: Option<Vec<String>>,
    /// Training certifications offered.
    pub training_certifications: Option<String>,
    /// Training type offered.
    pub training_type: Option<String>,
    /// YouTube url.
    pub youtube_url: Option<String>,
}

/// Landscape item repository.
#[derive(Debug, Clone, Default, PartialEq, Deserialize)]
pub(super) struct Repository {
    /// Url of the repository.
    pub repo_url: String,

    /// Branch to use when collecting information for the repository.
    pub branch: Option<String>,
    /// Repository license, overriding the one in GitHub.
    pub license: Option<String>,
}

/// Category names mapped to the names of their subcategories.
type CategoriesIndex<'a> = HashMap<&'a str, HashSet<&'a str>>;

/// Values tracked while validating the landscape data that must be unique
/// across the whole file.
#[derive(Debug, Default)]
struct ValidationState {
    /// Item ids mapped to the name of the item using them.
    item_ids: HashMap<String, String>,
    /// Normalized maturity values mapped to their raw value.
    maturities: HashMap<String, String>,
    /// Normalized TAG values mapped to their raw value.
    tags: HashMap<String, String>,
}

/// Track the maturity or TAG value provided, failing when it normalizes to an
/// empty or reserved value, or like a different raw value.
fn track_classification_value(seen: &mut HashMap<String, String>, value: &str, kind: &str) -> Result<()> {
    // Check the normalized value is usable as an option key
    let normalized_value = normalize_name(value);
    if normalized_value.is_empty() {
        bail!("{kind} [{value}] must contain at least one letter or digit");
    }
    if normalized_value == RESERVED_CLASSIFICATION_VALUE {
        bail!("{kind} [{value}] is reserved (normalizes to {RESERVED_CLASSIFICATION_VALUE})");
    }

    // Check no other raw value normalizes alike
    match seen.entry(normalized_value) {
        Entry::Occupied(entry) if entry.get() != value => {
            bail!(
                "{kind} [{value}] collides with {kind} [{}] (both normalize to {})",
                entry.get(),
                entry.key()
            )
        }
        Entry::Occupied(_) => {}
        Entry::Vacant(entry) => {
            entry.insert(value.to_string());
        }
    }

    Ok(())
}

/// Track the normalized category or subcategory name provided, failing when
/// another entry already uses it.
fn track_unique_name<'a>(
    seen: &mut HashMap<String, &'a str>,
    normalized_name: String,
    name: &'a str,
    kind: &str,
) -> Result<()> {
    match seen.entry(normalized_name) {
        Entry::Occupied(entry) => bail!(
            "duplicate name (normalizes to {}, also used by {kind} [{}])",
            entry.key(),
            entry.get()
        ),
        Entry::Vacant(entry) => {
            entry.insert(name);
            Ok(())
        }
    }
}

/// Validate the logo provided is a relative path that stays inside the logos
/// directory.
fn validate_logo(logo: &str) -> Result<()> {
    if logo.trim().is_empty() {
        bail!("logo is required");
    }
    let stays_inside_logos_dir = !logo.contains('\\')
        && Path::new(logo).components().all(|component| matches!(component, Component::Normal(_)));
    if !stays_inside_logos_dir {
        bail!(
            "logo must be a relative path inside the logos directory (no absolute paths, .. components or backslashes)"
        );
    }
    Ok(())
}

/// Validate the second path entry provided, checking it points to an existing
/// category and subcategory.
fn validate_second_path(entry: &str, categories_index: &CategoriesIndex<'_>) -> Result<()> {
    let Some((category, subcategory)) = parse_second_path(entry) else {
        bail!("invalid second path entry [{entry}] (expected: category / subcategory)");
    };
    let Some(subcategories) = categories_index.get(category) else {
        bail!("second path entry [{entry}] references unknown category [{category}]");
    };
    if !subcategories.contains(subcategory) {
        bail!(
            "second path entry [{entry}] references unknown subcategory [{subcategory}] in category [{category}]"
        );
    }
    Ok(())
}

/// Validate the urls of the item provided.
fn validate_urls(item: &Item) -> Result<()> {
    // Check urls in item
    let urls = [
        ("best_practices", item.url_for_bestpractices.as_deref()),
        ("crunchbase", item.crunchbase.as_deref()),
        ("homepage", Some(item.homepage_url.as_str())),
        ("repository", item.repo_url.as_deref()),
        ("twitter", item.twitter.as_deref()),
    ];
    for (name, url) in urls {
        validate_url(name, url)?;
    }

    // Check additional repositories
    if let Some(additional_repos) = &item.additional_repos {
        for r in additional_repos {
            validate_url("additional_repository", Some(r.repo_url.as_str()))?;
        }
    }

    // Check urls in item extra
    if let Some(extra) = &item.extra {
        let urls = [
            ("annual_review", &extra.annual_review_url),
            ("artwork", &extra.artwork_url),
            ("blog", &extra.blog_url),
            ("bluesky", &extra.bluesky_url),
            ("dev_stats", &extra.dev_stats_url),
            ("discord", &extra.discord_url),
            ("docker", &extra.docker_url),
            ("documentation", &extra.documentation_url),
            ("facebook", &extra.facebook_url),
            ("funding", &extra.funding_url),
            ("github_discussions", &extra.github_discussions_url),
            ("gitter", &extra.gitter_url),
            ("linkedin", &extra.linkedin_url),
            ("mailing_list", &extra.mailing_list_url),
            ("package_manager", &extra.package_manager_url),
            ("pinterest", &extra.pinterest_url),
            ("reddit", &extra.reddit_url),
            ("slack", &extra.slack_url),
            ("stack_overflow", &extra.stack_overflow_url),
            ("summary_intro", &extra.summary_intro_url),
            ("youtube", &extra.youtube_url),
        ];
        for (name, url) in urls {
            validate_url(name, url.as_deref())?;
        }

        // Check audits urls
        if let Some(audits) = &extra.audits {
            for a in audits {
                validate_url("audit", Some(a.url.as_str()))?;
            }
        }

        // Other links
        if let Some(other_links) = &extra.other_links {
            for link in other_links {
                validate_url("other_link", Some(link.url.as_str()))?;
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests;

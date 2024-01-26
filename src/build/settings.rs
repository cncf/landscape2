//! This module defines the types used to represent the landscape settings that
//! are usually provided from a YAML file (settings.yml). These settings allow
//! customizing some aspects of the landscape, like the groups that will appear
//! in the web application, the categories that will belong to each of them, or
//! the criteria used to highlight items.
//!
//! NOTE: the landscape settings file uses a new format that is not backwards
//! compatible with the legacy settings file used by existing landscapes.

use super::data::{normalize_name, validate_url, CategoryName, SubCategoryName};
use crate::SettingsSource;
use anyhow::{format_err, Context, Result};
use chrono::NaiveDate;
use lazy_static::lazy_static;
use regex::Regex;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::Path};
use tracing::{debug, instrument};

/// Landscape settings.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct LandscapeSettings {
    pub foundation: String,
    pub images: Images,
    pub url: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub analytics: Option<Analytics>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<Category>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub colors: Option<Colors>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub featured_items: Option<Vec<FeaturedItemRule>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub grid_items_size: Option<GridItemsSize>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub groups: Option<Vec<Group>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub members_category: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub screenshot_width: Option<u32>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub social_networks: Option<SocialNetworks>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<HashMap<TagName, Vec<TagRule>>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub upcoming_event: Option<UpcomingEvent>,
}

impl LandscapeSettings {
    /// Create a new landscape settings instance from the source provided.
    #[instrument(skip_all, err)]
    pub(crate) async fn new(src: &SettingsSource) -> Result<Self> {
        // Try from file
        if let Some(file) = &src.settings_file {
            debug!(?file, "getting landscape settings from file");
            return LandscapeSettings::new_from_file(file);
        };

        // Try from url
        if let Some(url) = &src.settings_url {
            debug!(?url, "getting landscape settings from url");
            return LandscapeSettings::new_from_url(url).await;
        };

        Err(format_err!("settings file or url not provided"))
    }

    /// Create a new landscape settings instance from the file provided.
    fn new_from_file(file: &Path) -> Result<Self> {
        let raw_data = fs::read_to_string(file)?;
        let settings = LandscapeSettings::new_from_raw_data(&raw_data)?;

        Ok(settings)
    }

    /// Create a new landscape settings instance from the url provided.
    async fn new_from_url(url: &str) -> Result<Self> {
        let resp = reqwest::get(url).await?;
        if resp.status() != StatusCode::OK {
            return Err(format_err!(
                "unexpected status code getting landscape settings file: {}",
                resp.status()
            ));
        }
        let raw_data = resp.text().await?;
        let settings = LandscapeSettings::new_from_raw_data(&raw_data)?;

        Ok(settings)
    }

    /// Create a new landscape settings instance from the raw data provided.
    fn new_from_raw_data(raw_data: &str) -> Result<Self> {
        let mut settings: LandscapeSettings = serde_yaml::from_str(raw_data)?;
        settings.validate().context("the landscape settings file provided is not valid")?;
        settings.set_groups_normalized_name();

        Ok(settings)
    }

    /// Set the normalized name field of the provided groups.
    fn set_groups_normalized_name(&mut self) {
        if let Some(groups) = self.groups.as_mut() {
            for group in groups {
                group.normalized_name = Some(normalize_name(&group.name));
            }
        }
    }

    /// Validate landscape settings.
    fn validate(&self) -> Result<()> {
        // Check foundation is not empty
        if self.foundation.is_empty() {
            return Err(format_err!("foundation cannot be empty"));
        }

        // Check url is not empty
        if self.url.is_empty() {
            return Err(format_err!("url cannot be empty"));
        }

        // Check members category is not empty
        if let Some(members_category) = &self.members_category {
            if members_category.is_empty() {
                return Err(format_err!("members category cannot be empty"));
            }
        }

        // Check screenshot width is valid
        if let Some(screenshot_width) = &self.screenshot_width {
            if *screenshot_width <= 1000 {
                return Err(format_err!("screenshot width must be greater than 1000"));
            }
        }

        self.validate_categories()?;
        self.validate_colors()?;
        self.validate_featured_items()?;
        self.validate_groups()?;
        self.validate_images()?;
        self.validate_social_networks()?;
        self.validate_tags()?;

        Ok(())
    }

    /// Check categories are valid.
    fn validate_categories(&self) -> Result<()> {
        if let Some(categories) = &self.categories {
            for (i, category) in categories.iter().enumerate() {
                let category_id = if category.name.is_empty() {
                    format!("{i}")
                } else {
                    category.name.clone()
                };

                // Name
                if category.name.is_empty() {
                    return Err(format_err!("category [{category_id}] name cannot be empty"));
                }

                // Subcategories
                for (subcategory_index, subcategory) in category.subcategories.iter().enumerate() {
                    if subcategory.is_empty() {
                        return Err(format_err!(
                            "category [{category_id}]: subcategory [{subcategory_index}] cannot be empty"
                        ));
                    }
                }
            }
        }

        Ok(())
    }

    /// Check colors format.
    fn validate_colors(&self) -> Result<()> {
        if let Some(colors) = &self.colors {
            let colors = [
                ("color1", &colors.color1),
                ("color2", &colors.color2),
                ("color3", &colors.color3),
                ("color4", &colors.color4),
                ("color5", &colors.color5),
                ("color6", &colors.color6),
            ];

            for (name, value) in colors {
                if !RGBA.is_match(value) {
                    return Err(format_err!(
                        r#"{name} is not valid (expected format: "rgba(0, 107, 204, 1)")"#
                    ));
                }
            }
        }

        Ok(())
    }

    /// Check featured item rules are valid.
    fn validate_featured_items(&self) -> Result<()> {
        if let Some(featured_items) = &self.featured_items {
            for (i, rule) in featured_items.iter().enumerate() {
                let rule_id = if rule.field.is_empty() {
                    format!("{i}")
                } else {
                    rule.field.clone()
                };
                let ctx = format!("featured item rule [{rule_id}] is not valid");

                // Field
                if rule.field.is_empty() {
                    return Err(format_err!("field cannot be empty")).context(ctx);
                }

                // Options
                if rule.options.is_empty() {
                    return Err(format_err!("options cannot be empty")).context(ctx);
                }
                for option in &rule.options {
                    // Value
                    if option.value.is_empty() {
                        return Err(format_err!("option value cannot be empty")).context(ctx);
                    }

                    // Label
                    if let Some(label) = &option.label {
                        if label.is_empty() {
                            return Err(format_err!("option label cannot be empty")).context(ctx);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Check groups are valid.
    fn validate_groups(&self) -> Result<()> {
        if let Some(groups) = &self.groups {
            for (i, group) in groups.iter().enumerate() {
                let group_id = if group.name.is_empty() {
                    format!("{i}")
                } else {
                    group.name.clone()
                };

                // Name
                if group.name.is_empty() {
                    return Err(format_err!("group [{group_id}] name cannot be empty"));
                }

                // Categories
                for (category_index, category) in group.categories.iter().enumerate() {
                    if category.is_empty() {
                        return Err(format_err!(
                            "group [{group_id}]: category [{category_index}] cannot be empty"
                        ));
                    }
                }
            }
        }

        Ok(())
    }

    /// Check images are valid.
    fn validate_images(&self) -> Result<()> {
        let urls = [
            ("favicon", &self.images.favicon),
            ("footer_logo", &self.images.footer_logo),
            ("header_logo", &self.images.header_logo),
            ("open_graph", &self.images.open_graph),
        ];
        for (name, url) in urls {
            validate_url(name, url)?;
        }

        Ok(())
    }

    /// Check social networks are valid.
    fn validate_social_networks(&self) -> Result<()> {
        if let Some(social_networks) = &self.social_networks {
            let urls = [
                ("facebook", &social_networks.facebook),
                ("flickr", &social_networks.flickr),
                ("github", &social_networks.github),
                ("instagram", &social_networks.instagram),
                ("linkedin", &social_networks.linkedin),
                ("slack", &social_networks.slack),
                ("twitch", &social_networks.twitch),
                ("twitter", &social_networks.twitter),
                ("wechat", &social_networks.wechat),
                ("youtube", &social_networks.youtube),
            ];
            for (name, url) in urls {
                validate_url(name, url)?;
            }
        }

        Ok(())
    }

    /// Check tags are valid.
    fn validate_tags(&self) -> Result<()> {
        if let Some(tags) = &self.tags {
            for (i, tag_rules) in tags {
                for rule in tag_rules {
                    // Category
                    if rule.category.is_empty() {
                        return Err(format_err!("tag [{i}] category cannot be empty"));
                    }

                    // Subcategories
                    if let Some(subcategories) = &rule.subcategories {
                        if subcategories.is_empty() {
                            return Err(format_err!("tag [{i}] subcategories cannot be empty"));
                        }
                    }
                }
            }
        }

        Ok(())
    }
}

/// Landscape analytics providers.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Analytics {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gtm: Option<GoogleTagManager>,
}

/// Landscape category.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Category {
    pub name: CategoryName,
    pub subcategories: Vec<SubCategoryName>,
}

lazy_static! {
    /// RGBA regular expression.
    pub(crate) static ref RGBA: Regex =
        Regex::new(r"rgba?\(((25[0-5]|2[0-4]\d|1\d{1,2}|\d\d?)\s*,\s*?){2}(25[0-5]|2[0-4]\d|1\d{1,2}|\d\d?)\s*,?\s*([01]\.?\d*?)\)")
            .expect("exprs in RGBA to be valid");
}

/// Colors used across the landscape UI.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Colors {
    pub color1: String,
    pub color2: String,
    pub color3: String,
    pub color4: String,
    pub color5: String,
    pub color6: String,
}

/// Featured item rule information. A featured item is specially highlighted in
/// the web application, usually making it larger with some special styling.
/// These rules are used to decide which items should be featured.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct FeaturedItemRule {
    pub field: String,
    pub options: Vec<FeaturedItemRuleOption>,
}

/// Featured item rule option.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct FeaturedItemRuleOption {
    pub value: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub order: Option<usize>,
}

/// Google Tag Manager configuration.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct GoogleTagManager {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub container_id: Option<String>,
}

/// Grid items size.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum GridItemsSize {
    Small,
    Medium,
    Large,
}

/// Landscape group. A group provides a mechanism to organize sets of
/// categories in the web application.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Group {
    pub name: String,
    pub normalized_name: Option<String>,
    pub categories: Vec<CategoryName>,
}

/// Images urls.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Images {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favicon: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub footer_logo: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub header_logo: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub open_graph: Option<String>,
}

/// Social networks urls.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct SocialNetworks {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub facebook: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub flickr: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub github: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub instagram: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub linkedin: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub slack: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub twitch: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub twitter: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub wechat: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub youtube: Option<String>,
}

/// Type alias to represent a TAG name.
pub(crate) type TagName = String;

/// TAG rule used to set the TAG that owns a project automatically.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct TagRule {
    pub category: CategoryName,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub subcategories: Option<Vec<SubCategoryName>>,
}

/// Upcoming event details.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct UpcomingEvent {
    pub name: String,
    pub start: NaiveDate,
    pub end: NaiveDate,
    pub banner_url: String,
    pub details_url: String,
}

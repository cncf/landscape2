//! This module defines the types used to represent the landscape settings that
//! are usually provided from a YAML file (settings.yml). These settings allow
//! customizing some aspects of the landscape, like the groups that will appear
//! in the web application, the categories that will belong to each of them, or
//! the criteria used to highlight items.
//!
//! NOTE: the landscape settings file uses a new format that is not backwards
//! compatible with the legacy settings file used by existing landscapes.

use super::data::{Category, CategoryName};
use crate::SettingsSource;
use anyhow::{format_err, Result};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};
use tracing::{debug, instrument};

/// Landscape settings.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct LandscapeSettings {
    pub foundation: String,
    pub images: Images,

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
    pub social_networks: Option<SocialNetworks>,
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
        let settings: LandscapeSettings = serde_yaml::from_str(&raw_data)?;

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
        let settings: LandscapeSettings = serde_yaml::from_str(&raw_data)?;

        Ok(settings)
    }
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

//! This module defines the types used to represent the landscape settings that
//! are usually provided from a YAML file (settings.yml). These settings allow
//! customizing some aspects of the landscape, like the groups that will appear
//! in the web application, the categories that will belong to each of them, or
//! the criteria used to highlight items.
//!
//! NOTE: the landscape settings file uses a new format that is not backwards
//! compatible with the legacy settings file used by existing landscapes.

use crate::data::{Category, CategoryName};
use anyhow::{format_err, Result};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

/// Landscape settings.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Settings {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub groups: Option<Vec<Group>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<Category>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub featured_items: Option<Vec<FeaturedItemRule>>,
}

/// Landscape group. A group provides a mechanism to organize sets of
/// categories in the web application.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Group {
    pub name: String,
    pub categories: Vec<CategoryName>,
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
    pub order: Option<usize>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

impl Settings {
    /// Create a new landscape settings instance from the file provided.
    pub(crate) fn new_from_file(file: &Path) -> Result<Self> {
        let raw_data = fs::read_to_string(file)?;
        let settings: Settings = serde_yaml::from_str(&raw_data)?;

        Ok(settings)
    }

    /// Create a new landscape settings instance from the url provided.
    pub(crate) async fn new_from_url(url: &str) -> Result<Self> {
        let resp = reqwest::get(url).await?;
        if resp.status() != StatusCode::OK {
            return Err(format_err!(
                "unexpected status code getting landscape settings file: {}",
                resp.status()
            ));
        }
        let raw_data = resp.text().await?;
        let settings: Settings = serde_yaml::from_str(&raw_data)?;

        Ok(settings)
    }
}

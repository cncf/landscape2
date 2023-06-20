use crate::data::{Category, CategoryName};
use anyhow::{format_err, Result};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

/// Landscape settings.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Settings {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tabs: Option<Vec<Tab>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<Category>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub featured_items: Option<Vec<FeaturedItemRule>>,
}

/// Landscape tab.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Tab {
    pub name: String,
    pub categories: Vec<CategoryName>,
}

/// Featured item rule information.
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
        let data = fs::read_to_string(file)?;
        let settings: Settings = serde_yaml::from_str(&data)?;

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
        let data = resp.text().await?;
        let settings: Settings = serde_yaml::from_str(&data)?;

        Ok(settings)
    }
}

use crate::data::{Category, CategoryName};
use anyhow::{format_err, Result};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

/// Landscape settings.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Settings {
    pub tabs: Vec<Tab>,
    pub categories: Vec<Category>,
}

/// Landscape tab.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Tab {
    pub name: String,
    pub categories: Vec<CategoryName>,
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

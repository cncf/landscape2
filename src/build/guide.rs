//! This module defines the types used to represent the landscape guide content
//! that must be provided from a YAML file (guide.yml).

use crate::GuideSource;
use anyhow::{format_err, Result};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};
use tracing::{debug, instrument};

/// Landscape guide content.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct LandscapeGuide {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<Category>>,
}

impl LandscapeGuide {
    /// Create a new landscape guide instance from the source provided.
    #[instrument(skip_all, err)]
    pub(crate) async fn new(src: &GuideSource) -> Result<Option<Self>> {
        // Try from file
        if let Some(file) = &src.guide_file {
            debug!(?file, "getting landscape guide from file");
            return Ok(Some(LandscapeGuide::new_from_file(file)?));
        };

        // Try from url
        if let Some(url) = &src.guide_url {
            debug!(?url, "getting landscape guide from url");
            return Ok(Some(LandscapeGuide::new_from_url(url).await?));
        };

        Ok(None)
    }

    /// Create a new landscape guide instance from the file provided.
    fn new_from_file(file: &Path) -> Result<Self> {
        let raw_data = fs::read_to_string(file)?;
        let guide = LandscapeGuide::new_from_yaml(&raw_data)?;

        Ok(guide)
    }

    /// Create a new landscape guide instance from the url provided.
    async fn new_from_url(url: &str) -> Result<Self> {
        let resp = reqwest::get(url).await?;
        if resp.status() != StatusCode::OK {
            return Err(format_err!(
                "unexpected status code getting landscape guide file: {}",
                resp.status()
            ));
        }
        let raw_data = resp.text().await?;
        let guide = LandscapeGuide::new_from_yaml(&raw_data)?;

        Ok(guide)
    }

    /// Create a new landscape guide instance from the YAML string provided.
    fn new_from_yaml(s: &str) -> Result<Self> {
        // Parse YAML string
        let mut guide: LandscapeGuide = serde_yaml::from_str(s)?;

        // Convert content fields from markdown to HTML
        let options = markdown::Options::default();
        if let Some(categories) = guide.categories.as_mut() {
            for c in &mut *categories {
                c.content = markdown::to_html_with_options(&c.content, &options)
                    .map_err(|err| format_err!("{err}"))?;

                if let Some(subcategories) = c.subcategories.as_mut() {
                    for sc in &mut *subcategories {
                        sc.content = markdown::to_html_with_options(&sc.content, &options)
                            .map_err(|err| format_err!("{err}"))?;
                    }
                }
            }
        }

        Ok(guide)
    }
}

/// Guide category.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Category {
    pub category: String,
    pub content: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub keywords: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub subcategories: Option<Vec<Subcategory>>,
}

/// Guide subcategory.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Subcategory {
    pub subcategory: String,
    pub content: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub keywords: Option<Vec<String>>,
}

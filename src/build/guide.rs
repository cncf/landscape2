//! This module defines the types used to represent the landscape guide content
//! that must be provided from a YAML file (guide.yml).

use crate::GuideSource;
use anyhow::{format_err, Context, Result};
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
        guide.validate().context("the landscape guide file provided is not valid")?;

        // Convert content fields from markdown to HTML
        let options = markdown::Options::default();
        if let Some(categories) = guide.categories.as_mut() {
            for c in &mut *categories {
                if let Some(content) = &c.content {
                    let html = markdown::to_html_with_options(content, &options)
                        .map_err(|err| format_err!("{err}"))?;
                    c.content = Some(html);
                }

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

    /// Validate landscape guide.
    fn validate(&self) -> Result<()> {
        if let Some(categories) = &self.categories {
            for (i, categories) in categories.iter().enumerate() {
                let category_id = if categories.category.is_empty() {
                    format!("{i}")
                } else {
                    categories.category.clone()
                };
                let mut ctx = format!("category [{category_id}] is not valid");

                // Category
                if categories.category.is_empty() {
                    return Err(format_err!("category cannot be empty")).context(ctx);
                }

                // Content
                if let Some(content) = &categories.content {
                    if content.is_empty() {
                        return Err(format_err!("content cannot be empty")).context(ctx);
                    }
                }

                // Keywords
                if let Some(keywords) = &categories.keywords {
                    for (i, keyword) in keywords.iter().enumerate() {
                        let keyword_id = format!("{i}");

                        if keyword.is_empty() {
                            return Err(format_err!("keyword [{keyword_id}] cannot be empty")).context(ctx);
                        }
                    }
                }

                // Subcategories
                if let Some(subcategories) = &categories.subcategories {
                    for (i, subcategory) in subcategories.iter().enumerate() {
                        let subcategory_id = if subcategory.subcategory.is_empty() {
                            format!("{i}")
                        } else {
                            subcategory.subcategory.clone()
                        };
                        ctx = format!("subcategory [{subcategory_id}] in {ctx}");

                        // Subcategory
                        if subcategory.subcategory.is_empty() {
                            return Err(format_err!("subcategory cannot be empty")).context(ctx);
                        }

                        // Content
                        if subcategory.content.is_empty() {
                            return Err(format_err!("content cannot be empty")).context(ctx);
                        }

                        // Keywords
                        if let Some(keywords) = &subcategory.keywords {
                            for (i, keyword) in keywords.iter().enumerate() {
                                let keyword_id = format!("{i}");

                                if keyword.is_empty() {
                                    return Err(format_err!("keyword [{keyword_id}] cannot be empty"))
                                        .context(ctx);
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }
}

/// Guide category.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Category {
    pub category: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,

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

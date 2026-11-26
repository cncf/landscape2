//! This module defines the types used to represent the landscape guide content
//! that must be provided from a YAML file (guide.yml).

use std::{collections::HashSet, path::PathBuf};

use anyhow::{Context, Result, format_err};
use clap::Args;
use serde::{Deserialize, Serialize};
use tracing::instrument;

use crate::{
    source::{self, Parsed, SourceKind, parse_yaml},
    util::{markdown_to_html, normalize_name},
};

/// Landscape guide source.
#[derive(Args, Default, Debug, Clone, PartialEq)]
#[group(required = false, multiple = false)]
pub struct GuideSource {
    /// Landscape guide file local path.
    #[arg(long)]
    pub guide_file: Option<PathBuf>,

    /// Landscape guide file url.
    #[arg(long)]
    pub guide_url: Option<String>,
}

impl GuideSource {
    /// Create a new guide source from the url provided.
    #[must_use]
    pub fn new_from_url(url: String) -> Self {
        Self {
            guide_file: None,
            guide_url: Some(url),
        }
    }

    /// Read the raw landscape guide from the file or url provided, preferring
    /// the file. Returns `None` when neither is set.
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or the url cannot be fetched.
    pub async fn read_raw(&self) -> Result<Option<String>> {
        source::read_raw(
            SourceKind::Guide,
            self.guide_file.as_deref(),
            self.guide_url.as_deref(),
        )
        .await
    }
}

/// Landscape guide content.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    derive(ts_rs::TS),
    ts(export_to = "core/", optional_fields, rename = "Guide")
)]
pub struct LandscapeGuide {
    /// Guide categories.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<Category>>,
}

impl LandscapeGuide {
    /// Create a new landscape guide instance from the source provided, logging
    /// the warnings found while parsing it. Returns `None` when no source is
    /// set.
    ///
    /// # Errors
    /// Returns an error if the file or URL cannot be read, or the data is
    /// invalid.
    #[instrument(skip_all, err)]
    pub async fn new(src: &GuideSource) -> Result<Option<Self>> {
        // Read the raw landscape guide from the source
        let Some(raw) = src.read_raw().await? else {
            return Ok(None);
        };

        // Parse and validate the landscape guide
        let guide = LandscapeGuide::new_from_yaml(&raw)?.into_value_logging_warnings(SourceKind::Guide);

        Ok(Some(guide))
    }

    /// Create a new landscape guide instance from the raw data provided,
    /// reporting the unknown keys found as warnings.
    ///
    /// # Errors
    /// Returns an error if the data is not valid YAML or does not pass the
    /// validation.
    pub fn new_from_yaml(raw: &str) -> Result<Parsed<Self>> {
        LandscapeGuide::parse(raw).with_context(|| SourceKind::Guide.invalid_file_context())
    }

    /// Return a warning for each category with keywords, as they are not
    /// displayed.
    fn categories_keywords_warnings(&self) -> Vec<String> {
        self.categories
            .iter()
            .flatten()
            .filter(|category| category.keywords.as_ref().is_some_and(|keywords| !keywords.is_empty()))
            .map(|category| {
                format!(
                    "category [{}]: category keywords are not displayed; set them on subcategories",
                    category.category
                )
            })
            .collect()
    }

    /// Parse and validate the raw guide provided, converting its content from
    /// markdown to HTML and setting the normalized names.
    fn parse(raw: &str) -> Result<Parsed<Self>> {
        // Parse the raw guide, collecting the unknown keys warnings
        let Parsed {
            value: mut guide,
            mut warnings,
        } = parse_yaml::<LandscapeGuide>(raw)?;

        // Validate the guide, warning about the keywords that are not displayed
        guide.validate()?;
        warnings.extend(guide.categories_keywords_warnings());

        // Prepare the guide content and normalized names
        guide.render_markdown();
        guide.set_normalized_names();

        Ok(Parsed {
            value: guide,
            warnings,
        })
    }

    /// Convert the categories and subcategories content from markdown to HTML.
    fn render_markdown(&mut self) {
        let Some(categories) = self.categories.as_mut() else {
            return;
        };

        for category in categories {
            if let Some(content) = category.content.as_mut() {
                *content = markdown_to_html(content);
            }
            for subcategory in category.subcategories.iter_mut().flatten() {
                subcategory.content = markdown_to_html(&subcategory.content);
            }
        }
    }

    /// Set the categories and subcategories normalized names.
    fn set_normalized_names(&mut self) {
        for category in self.categories.iter_mut().flatten() {
            category.normalized_name = normalize_name(&category.category);
            for subcategory in category.subcategories.iter_mut().flatten() {
                subcategory.normalized_name = normalize_name(&subcategory.subcategory);
            }
        }
    }

    /// Validate landscape guide.
    fn validate(&self) -> Result<()> {
        let Some(categories) = &self.categories else {
            return Ok(());
        };

        // Normalized names of the categories already validated
        let mut categories_seen = HashSet::new();

        for (i, category) in categories.iter().enumerate() {
            let ctx = || {
                let category_id = if category.category.trim().is_empty() {
                    i.to_string()
                } else {
                    category.category.clone()
                };
                format!("category [{category_id}] is not valid")
            };

            // Category, which must be unique by its normalized name
            if category.category.trim().is_empty() {
                return Err(format_err!("category cannot be empty")).with_context(ctx);
            }
            if !categories_seen.insert(normalize_name(&category.category)) {
                return Err(format_err!("duplicate category name")).with_context(ctx);
            }

            // Content
            if let Some(content) = &category.content
                && content.trim().is_empty()
            {
                return Err(format_err!("content cannot be empty")).with_context(ctx);
            }

            // Keywords
            if let Some(keywords) = &category.keywords
                && keywords.iter().any(|keyword| keyword.trim().is_empty())
            {
                return Err(format_err!("keywords cannot be empty")).with_context(ctx);
            }

            // Subcategories, which must be unique by their normalized name
            // within the category
            let mut subcategories_seen = HashSet::new();
            for (subcategory_index, subcategory) in category.subcategories.iter().flatten().enumerate() {
                let subcategory_ctx = || {
                    let subcategory_id = if subcategory.subcategory.trim().is_empty() {
                        subcategory_index.to_string()
                    } else {
                        subcategory.subcategory.clone()
                    };
                    format!("subcategory [{subcategory_id}] in {}", ctx())
                };

                // Subcategory
                if subcategory.subcategory.trim().is_empty() {
                    return Err(format_err!("subcategory cannot be empty")).with_context(subcategory_ctx);
                }
                if !subcategories_seen.insert(normalize_name(&subcategory.subcategory)) {
                    return Err(format_err!("duplicate subcategory name")).with_context(subcategory_ctx);
                }

                // Content
                if subcategory.content.trim().is_empty() {
                    return Err(format_err!("content cannot be empty")).with_context(subcategory_ctx);
                }

                // Keywords
                if let Some(keywords) = &subcategory.keywords
                    && keywords.iter().any(|keyword| keyword.trim().is_empty())
                {
                    return Err(format_err!("keywords cannot be empty")).with_context(subcategory_ctx);
                }
            }
        }

        Ok(())
    }
}

/// Guide category.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    derive(ts_rs::TS),
    ts(export_to = "core/", optional_fields, rename = "GuideCategory")
)]
pub struct Category {
    /// Name of the category.
    pub category: String,
    /// Normalized name of the category, used in anchors (set while parsing).
    #[serde(skip_deserializing)]
    pub normalized_name: String,

    /// Category content, converted from markdown to HTML.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,

    /// Keywords of the category (deprecated and not serialized, as they are
    /// not displayed).
    #[serde(skip_serializing)]
    #[cfg_attr(feature = "ts", ts(skip))]
    pub keywords: Option<Vec<String>>,

    /// Subcategories of the category.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subcategories: Option<Vec<Subcategory>>,
}

/// Guide subcategory.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(
    feature = "ts",
    derive(ts_rs::TS),
    ts(export_to = "core/", optional_fields, rename = "GuideSubcategory")
)]
pub struct Subcategory {
    /// Subcategory content, converted from markdown to HTML.
    pub content: String,
    /// Normalized name of the subcategory, used in anchors (set while
    /// parsing).
    #[serde(skip_deserializing)]
    pub normalized_name: String,
    /// Name of the subcategory.
    pub subcategory: String,

    /// Keywords of the subcategory.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keywords: Option<Vec<String>>,
}

#[cfg(test)]
mod tests;

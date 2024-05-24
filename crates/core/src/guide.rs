//! This module defines the types used to represent the landscape guide content
//! that must be provided from a YAML file (guide.yml).

use anyhow::{bail, format_err, Context, Result};
use clap::Args;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};
use tracing::{debug, instrument};

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
}

/// Landscape guide content.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct LandscapeGuide {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<Category>>,
}

impl LandscapeGuide {
    /// Create a new landscape guide instance from the source provided.
    #[instrument(skip_all, err)]
    pub async fn new(src: &GuideSource) -> Result<Option<Self>> {
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
            bail!(
                "unexpected status code getting landscape guide file: {}",
                resp.status()
            );
        }
        let raw_data = resp.text().await?;
        let guide = LandscapeGuide::new_from_yaml(&raw_data)?;

        Ok(guide)
    }

    /// Create a new landscape guide instance from the YAML string provided.
    fn new_from_yaml(s: &str) -> Result<Self> {
        // Parse YAML string and validate guide
        let mut guide: LandscapeGuide = serde_yaml::from_str(s).context("invalid yaml file")?;
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
                    for keyword in keywords {
                        if keyword.is_empty() {
                            return Err(format_err!("keywords cannot be empty")).context(ctx);
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
                            for keyword in keywords {
                                if keyword.is_empty() {
                                    return Err(format_err!("keywords cannot be empty")).context(ctx);
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
pub struct Category {
    #[allow(clippy::struct_field_names)]
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
pub struct Subcategory {
    #[allow(clippy::struct_field_names)]
    pub subcategory: String,

    pub content: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub keywords: Option<Vec<String>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    const GUIDE_FILE: &str = "guide.yml";
    const TESTS_GUIDE_FILE: &str = "src/testdata/guide.yml";

    #[test]
    fn guidesource_new_from_url() {
        let url = "https://example.url/guide.yml";
        let src = GuideSource::new_from_url(url.to_string());
        assert_eq!(
            src,
            GuideSource {
                guide_file: None,
                guide_url: Some(url.to_string()),
            }
        );
    }

    #[tokio::test]
    async fn guide_new_using_file() {
        let src = GuideSource {
            guide_file: Some(PathBuf::from(TESTS_GUIDE_FILE)),
            guide_url: None,
        };
        let _ = LandscapeGuide::new(&src).await.unwrap();
    }

    #[tokio::test]
    async fn guide_new_using_url() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", format!("/{GUIDE_FILE}").as_str())
            .with_status(200)
            .with_body_from_file(TESTS_GUIDE_FILE)
            .create_async()
            .await;

        let src = GuideSource::new_from_url(format!("{}/{GUIDE_FILE}", server.url()));
        let _ = LandscapeGuide::new(&src).await.unwrap();
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn guide_new_no_file_or_url_provided() {
        let src = GuideSource::default();
        assert!(LandscapeGuide::new(&src).await.unwrap().is_none());
    }

    #[test]
    fn guide_new_from_file() {
        let file = Path::new(TESTS_GUIDE_FILE);
        let _ = LandscapeGuide::new_from_file(file).unwrap();
    }

    #[tokio::test]
    async fn guide_new_from_url() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", format!("/{GUIDE_FILE}").as_str())
            .with_status(200)
            .with_body_from_file(TESTS_GUIDE_FILE)
            .create_async()
            .await;

        let url = format!("{}/{GUIDE_FILE}", server.url());
        let _ = LandscapeGuide::new_from_url(&url).await.unwrap();
        mock.assert_async().await;
    }

    #[tokio::test]
    #[should_panic(expected = "unexpected status code getting landscape guide file: 404")]
    async fn guide_new_from_url_not_found() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", format!("/{GUIDE_FILE}").as_str())
            .with_status(404)
            .create_async()
            .await;

        let url = format!("{}/{GUIDE_FILE}", server.url());
        let _ = LandscapeGuide::new_from_url(&url).await.unwrap();
        mock.assert_async().await;
    }

    #[test]
    fn guide_new_from_yaml() {
        let raw_data = fs::read_to_string(TESTS_GUIDE_FILE).unwrap();
        let _ = LandscapeGuide::new_from_yaml(&raw_data).unwrap();
    }

    #[test]
    fn guide_validate_success() {
        let guide = LandscapeGuide {
            categories: Some(vec![Category {
                category: "category".to_string(),
                content: Some("content".to_string()),
                keywords: Some(vec!["keyword".to_string()]),
                subcategories: Some(vec![Subcategory {
                    subcategory: "subcategory".to_string(),
                    content: "content".to_string(),
                    keywords: Some(vec!["keyword".to_string()]),
                }]),
            }]),
        };

        guide.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "category cannot be empty")]
    fn guide_validate_empty_category() {
        let guide = LandscapeGuide {
            categories: Some(vec![Category {
                category: String::new(),
                ..Default::default()
            }]),
        };

        guide.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "content cannot be empty")]
    fn guide_validate_empty_category_content() {
        let guide = LandscapeGuide {
            categories: Some(vec![Category {
                category: "category".to_string(),
                content: Some(String::new()),
                ..Default::default()
            }]),
        };

        guide.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "keywords cannot be empty")]
    fn guide_validate_empty_category_keywords() {
        let guide = LandscapeGuide {
            categories: Some(vec![Category {
                category: "category".to_string(),
                keywords: Some(vec![String::new()]),
                ..Default::default()
            }]),
        };

        guide.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "subcategory cannot be empty")]
    fn guide_validate_empty_subcategory() {
        let guide = LandscapeGuide {
            categories: Some(vec![Category {
                category: "category".to_string(),
                subcategories: Some(vec![Subcategory {
                    subcategory: String::new(),
                    ..Default::default()
                }]),
                ..Default::default()
            }]),
        };

        guide.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "content cannot be empty")]
    fn guide_validate_empty_subcategory_content() {
        let guide = LandscapeGuide {
            categories: Some(vec![Category {
                category: "category".to_string(),
                subcategories: Some(vec![Subcategory {
                    subcategory: "subcategory".to_string(),
                    content: String::new(),
                    ..Default::default()
                }]),
                ..Default::default()
            }]),
        };

        guide.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "keywords cannot be empty")]
    fn guide_validate_empty_subcategory_keywords() {
        let guide = LandscapeGuide {
            categories: Some(vec![Category {
                category: "category".to_string(),
                subcategories: Some(vec![Subcategory {
                    subcategory: "subcategory".to_string(),
                    content: "content".to_string(),
                    keywords: Some(vec![String::new()]),
                }]),
                ..Default::default()
            }]),
        };

        guide.validate().unwrap();
    }
}

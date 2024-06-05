//! This module defines the types used to represent the landscape settings that
//! are usually provided from a YAML file (settings.yml). These settings allow
//! customizing some aspects of the landscape, like the groups that will appear
//! in the web application, the categories that will belong to each of them, or
//! the criteria used to highlight items.
//!
//! NOTE: the landscape settings file uses a new format that is not backwards
//! compatible with the legacy settings file used by existing landscapes.

use super::data::{CategoryName, SubcategoryName};
use crate::util::{normalize_name, validate_url};
use anyhow::{bail, format_err, Context, Result};
use chrono::NaiveDate;
use clap::Args;
use lazy_static::lazy_static;
use regex::Regex;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};
use tracing::{debug, instrument};

/// Landscape settings location.
#[derive(Args, Default, Debug, Clone, PartialEq)]
#[group(required = true, multiple = false)]
pub struct SettingsSource {
    /// Landscape settings file local path.
    #[arg(long)]
    pub settings_file: Option<PathBuf>,

    /// Landscape settings file url.
    #[arg(long)]
    pub settings_url: Option<String>,
}

impl SettingsSource {
    /// Create a new settings source from the url provided.
    #[must_use]
    pub fn new_from_url(url: String) -> Self {
        Self {
            settings_file: None,
            settings_url: Some(url),
        }
    }
}

/// Landscape settings.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct LandscapeSettings {
    pub foundation: String,
    pub url: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub analytics: Option<Analytics>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_path: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<Category>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub colors: Option<Colors>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub enduser: Option<Vec<EndUserRule>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub featured_items: Option<Vec<FeaturedItemRule>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub footer: Option<Footer>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub header: Option<Header>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub grid_items_size: Option<GridItemsSize>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub groups: Option<Vec<Group>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Images>,

    #[serde(default)]
    pub logos_viewbox: LogosViewbox,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub osano: Option<Osano>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub members_category: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub screenshot_width: Option<u32>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<BTreeMap<TagName, Vec<TagRule>>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub upcoming_event: Option<UpcomingEvent>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub view_mode: Option<ViewMode>,
}

impl LandscapeSettings {
    /// Create a new landscape settings instance from the source provided.
    #[instrument(skip_all, err)]
    pub async fn new(src: &SettingsSource) -> Result<Self> {
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

        bail!("settings file or url not provided");
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
            bail!(
                "unexpected status code getting landscape settings file: {}",
                resp.status()
            );
        }
        let raw_data = resp.text().await?;
        let settings = LandscapeSettings::new_from_raw_data(&raw_data)?;

        Ok(settings)
    }

    /// Create a new landscape settings instance from the raw data provided.
    fn new_from_raw_data(raw_data: &str) -> Result<Self> {
        let mut settings: LandscapeSettings = serde_yaml::from_str(raw_data).context("invalid yaml file")?;

        settings.validate().context("the landscape settings file provided is not valid")?;
        settings.footer_text_to_html().context("error converting footer md text to html")?;
        settings.remove_base_path_trailing_slash();
        settings.set_groups_normalized_name();

        Ok(settings)
    }

    /// Convert the provided footer text in markdown format to HTML.
    fn footer_text_to_html(&mut self) -> Result<()> {
        if let Some(footer) = &mut self.footer {
            if let Some(text) = &mut footer.text {
                let options = markdown::Options::default();
                *text = markdown::to_html_with_options(text, &options).map_err(|err| format_err!("{err}"))?;
            }
        }

        Ok(())
    }

    /// Remove base_path trailing slash if present.
    fn remove_base_path_trailing_slash(&mut self) {
        if let Some(base_path) = &mut self.base_path {
            if let Some(base_path_updated) = base_path.strip_suffix('/') {
                *base_path = base_path_updated.to_string();
            }
        }
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
            bail!("foundation cannot be empty");
        }

        // Check url is valid
        validate_url("landscape", &Some(self.url.clone()))?;

        self.validate_base_path()?;
        self.validate_categories()?;
        self.validate_colors()?;
        self.validate_featured_items()?;
        self.validate_footer()?;
        self.validate_groups()?;
        self.validate_header()?;
        self.validate_images()?;
        self.validate_members_category()?;
        self.validate_osano()?;
        self.validate_screenshot_width()?;
        self.validate_tags()?;

        Ok(())
    }

    /// Check base path is valid.
    fn validate_base_path(&self) -> Result<()> {
        let Some(base_path) = &self.base_path else {
            return Ok(());
        };

        // Check base path is not empty
        if base_path.is_empty() {
            bail!("base_path cannot be empty");
        }

        // Check base path starts with a slash
        if !base_path.starts_with('/') {
            bail!("base_path must start with a slash");
        }

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
                    bail!("category [{category_id}] name cannot be empty");
                }

                // Subcategories
                for (subcategory_index, subcategory) in category.subcategories.iter().enumerate() {
                    if subcategory.is_empty() {
                        bail!("category [{category_id}]: subcategory [{subcategory_index}] cannot be empty");
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
                ("color7", &colors.color7),
            ];

            for (name, value) in colors {
                if !RGBA.is_match(value) {
                    bail!(r#"{name} is not valid (expected format: "rgba(0, 107, 204, 1)")"#);
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

    /// Check footer is valid.
    fn validate_footer(&self) -> Result<()> {
        let Some(footer) = &self.footer else { return Ok(()) };

        // Links
        if let Some(links) = &footer.links {
            let urls = [
                ("facebook", &links.facebook),
                ("flickr", &links.flickr),
                ("github", &links.github),
                ("homepage", &links.homepage),
                ("instagram", &links.instagram),
                ("linkedin", &links.linkedin),
                ("slack", &links.slack),
                ("twitch", &links.twitch),
                ("twitter", &links.twitter),
                ("wechat", &links.wechat),
                ("youtube", &links.youtube),
            ];
            for (name, url) in urls {
                validate_url(name, url)?;
            }
        }

        // Logo
        validate_url("footer logo", &footer.logo)?;

        // Text
        if let Some(text) = &footer.text {
            if text.is_empty() {
                bail!("footer text cannot be empty");
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
                    bail!("group [{group_id}] name cannot be empty");
                }

                // Categories
                for (category_index, category) in group.categories.iter().enumerate() {
                    if category.is_empty() {
                        bail!("group [{group_id}]: category [{category_index}] cannot be empty");
                    }
                }
            }
        }

        Ok(())
    }

    /// Check header is valid.
    fn validate_header(&self) -> Result<()> {
        let Some(header) = &self.header else { return Ok(()) };

        // Links
        if let Some(links) = &header.links {
            let urls = [("github", &links.github)];
            for (name, url) in urls {
                validate_url(name, url)?;
            }
        }

        // Logo
        validate_url("header logo", &header.logo)?;

        Ok(())
    }

    /// Check images are valid.
    fn validate_images(&self) -> Result<()> {
        let Some(images) = &self.images else { return Ok(()) };

        let urls = [("favicon", &images.favicon), ("open_graph", &images.open_graph)];
        for (name, url) in urls {
            validate_url(name, url)?;
        }

        Ok(())
    }

    /// Check members category is valid.
    fn validate_members_category(&self) -> Result<()> {
        let Some(members_category) = &self.members_category else {
            return Ok(());
        };

        // Check members category is not empty
        if members_category.is_empty() {
            bail!("members category cannot be empty");
        }

        Ok(())
    }

    /// Check Osano configuration is valid.
    fn validate_osano(&self) -> Result<()> {
        let Some(osano) = &self.osano else { return Ok(()) };

        // Check customer id and customer configuration id are not empty
        if osano.customer_id.is_empty() {
            bail!("osano customer id cannot be empty");
        }
        if osano.customer_configuration_id.is_empty() {
            bail!("osano customer configuration id cannot be empty");
        }

        Ok(())
    }

    /// Check screenshot width is valid.
    fn validate_screenshot_width(&self) -> Result<()> {
        let Some(screenshot_width) = &self.screenshot_width else {
            return Ok(());
        };

        if *screenshot_width <= 1000 {
            bail!("screenshot width must be greater than 1000");
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
                        bail!("tag [{i}] category cannot be empty");
                    }

                    // Subcategories
                    if let Some(subcategories) = &rule.subcategories {
                        if subcategories.is_empty() {
                            bail!("tag [{i}] subcategories cannot be empty");
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
pub struct Analytics {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gtm: Option<GoogleTagManager>,
}

/// Landscape category.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Category {
    pub name: CategoryName,
    pub subcategories: Vec<SubcategoryName>,
}

lazy_static! {
    /// RGBA regular expression.
    static ref RGBA: Regex =
        Regex::new(r"rgba?\(((25[0-5]|2[0-4]\d|1\d{1,2}|\d\d?)\s*,\s*?){2}(25[0-5]|2[0-4]\d|1\d{1,2}|\d\d?)\s*,?\s*([01]\.?\d*?)\)")
            .expect("exprs in RGBA to be valid");
}

/// Colors used across the landscape UI.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Colors {
    pub color1: String,
    pub color2: String,
    pub color3: String,
    pub color4: String,
    pub color5: String,
    pub color6: String,
    pub color7: String,
}

/// Rule to automatically set the `enduser` flag on the items that belong to
/// the category (and optionally subcategories) defined.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct EndUserRule {
    pub category: CategoryName,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub subcategories: Option<Vec<SubcategoryName>>,
}

/// Featured item rule information. A featured item is specially highlighted in
/// the web application, usually making it larger with some special styling.
/// These rules are used to decide which items should be featured.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct FeaturedItemRule {
    pub field: String,
    pub options: Vec<FeaturedItemRuleOption>,
}

/// Featured item rule option.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct FeaturedItemRuleOption {
    pub value: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub order: Option<usize>,
}

/// Footer configuration.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Footer {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub links: Option<FooterLinks>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}

/// Footer links.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct FooterLinks {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub facebook: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub flickr: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub github: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub homepage: Option<String>,

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

/// Google Tag Manager configuration.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct GoogleTagManager {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub container_id: Option<String>,
}

/// Grid items size.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum GridItemsSize {
    Small,
    Medium,
    Large,
}

/// Landscape group. A group provides a mechanism to organize sets of
/// categories in the web application.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Group {
    pub name: String,
    pub normalized_name: Option<String>,
    pub categories: Vec<CategoryName>,
}

/// Header configuration.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Header {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub links: Option<HeaderLinks>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo: Option<String>,
}

/// Header links.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct HeaderLinks {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub github: Option<String>,
}

/// Images urls.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Images {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favicon: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub open_graph: Option<String>,
}

/// Logos viewbox configuration.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LogosViewbox {
    pub adjust: bool,
    pub exclude: Vec<String>,
}

impl Default for LogosViewbox {
    fn default() -> Self {
        LogosViewbox {
            adjust: true,
            exclude: vec![],
        }
    }
}

/// Osano configuration.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Osano {
    pub customer_id: String,
    pub customer_configuration_id: String,
}

/// Type alias to represent a TAG name.
pub type TagName = String;

/// TAG rule used to set the TAG that owns a project automatically.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct TagRule {
    pub category: CategoryName,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub subcategories: Option<Vec<SubcategoryName>>,
}

/// Upcoming event details.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct UpcomingEvent {
    pub name: String,
    pub start: NaiveDate,
    pub end: NaiveDate,
    pub banner_url: String,
    pub details_url: String,
}

/// Default view mode used in the web application.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ViewMode {
    Grid,
    Card,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::SettingsSource;

    const SETTINGS_FILE: &str = "settings.yml";
    const TESTS_SETTINGS_FILE: &str = "src/testdata/settings.yml";

    #[test]
    fn settings_source_new_from_url() {
        let url = "https://example.url/settings.yml";
        let src = SettingsSource::new_from_url(url.to_string());
        assert_eq!(
            src,
            SettingsSource {
                settings_file: None,
                settings_url: Some(url.to_string()),
            }
        );
    }

    #[tokio::test]
    async fn settings_new_using_file() {
        let src = SettingsSource {
            settings_file: Some(PathBuf::from(TESTS_SETTINGS_FILE)),
            settings_url: None,
        };
        let _ = LandscapeSettings::new(&src).await.unwrap();
    }

    #[tokio::test]
    async fn settings_new_using_url() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", format!("/{SETTINGS_FILE}").as_str())
            .with_status(200)
            .with_body_from_file(TESTS_SETTINGS_FILE)
            .create_async()
            .await;

        let src = SettingsSource::new_from_url(format!("{}/{SETTINGS_FILE}", server.url()));
        let _ = LandscapeSettings::new(&src).await.unwrap();
        mock.assert_async().await;
    }

    #[tokio::test]
    #[should_panic(expected = "settings file or url not provided")]
    async fn settings_new_no_file_or_url_provided() {
        let src = SettingsSource::default();
        let _ = LandscapeSettings::new(&src).await.unwrap();
    }

    #[test]
    fn settings_new_from_file() {
        let file = Path::new(TESTS_SETTINGS_FILE);
        let _ = LandscapeSettings::new_from_file(file).unwrap();
    }

    #[tokio::test]
    async fn settings_new_from_url() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", format!("/{SETTINGS_FILE}").as_str())
            .with_status(200)
            .with_body_from_file(TESTS_SETTINGS_FILE)
            .create_async()
            .await;

        let url = format!("{}/{SETTINGS_FILE}", server.url());
        let _ = LandscapeSettings::new_from_url(&url).await.unwrap();
        mock.assert_async().await;
    }

    #[tokio::test]
    #[should_panic(expected = "unexpected status code getting landscape settings file: 404")]
    async fn landscape_data_new_from_url_not_found() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", format!("/{SETTINGS_FILE}").as_str())
            .with_status(404)
            .create_async()
            .await;

        let url = format!("{}/{SETTINGS_FILE}", server.url());
        let _ = LandscapeSettings::new_from_url(&url).await.unwrap();
        mock.assert_async().await;
    }

    #[test]
    fn settings_new_from_raw_data() {
        let raw_data = fs::read_to_string(TESTS_SETTINGS_FILE).unwrap();
        let _ = LandscapeSettings::new_from_raw_data(&raw_data).unwrap();
    }

    #[test]
    fn settings_footer_text_to_html_works() {
        let mut settings = LandscapeSettings {
            footer: Some(Footer {
                text: Some("# Footer text".to_string()),
                ..Default::default()
            }),
            ..Default::default()
        };

        settings.footer_text_to_html().unwrap();
        assert_eq!(settings.footer.unwrap().text.unwrap(), "<h1>Footer text</h1>");
    }

    #[test]
    fn settings_remove_base_path_trailing_slash_works() {
        let mut settings = LandscapeSettings {
            base_path: Some("/base_path/".to_string()),
            ..Default::default()
        };

        settings.remove_base_path_trailing_slash();
        assert_eq!(settings.base_path.unwrap(), "/base_path");
    }

    #[test]
    fn settings_set_groups_normalized_name_works() {
        let mut settings = LandscapeSettings {
            groups: Some(vec![Group {
                name: "Group 1".to_string(),
                ..Default::default()
            }]),
            ..Default::default()
        };

        settings.set_groups_normalized_name();
        assert_eq!(
            settings.groups.unwrap().first().unwrap().normalized_name.as_ref().unwrap(),
            "group-1"
        );
    }

    #[test]
    fn settings_validate_succeeds() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "foundation cannot be empty")]
    fn settings_validate_empty_foundation() {
        let settings = LandscapeSettings {
            foundation: String::new(),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "invalid landscape url")]
    fn settings_validate_invalid_url() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "invalid-url".to_string(),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    fn settings_validate_base_path_succeeds() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            base_path: Some("/base_path".to_string()),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "base_path cannot be empty")]
    fn settings_validate_base_path_empty() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            base_path: Some(String::new()),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "base_path must start with a slash")]
    fn settings_validate_base_path_no_slash() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            base_path: Some("base_path".to_string()),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    fn settings_validate_categories_succeeds() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            categories: Some(vec![Category {
                name: "Category".to_string(),
                subcategories: vec!["Subcategory".to_string()],
            }]),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "category [0] name cannot be empty")]
    fn settings_validate_categories_empty_name() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            categories: Some(vec![Category {
                name: String::new(),
                subcategories: vec![],
            }]),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "category [Category]: subcategory [0] cannot be empty")]
    fn settings_validate_categories_empty_subcategory() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            categories: Some(vec![Category {
                name: "Category".to_string(),
                subcategories: vec![String::new()],
            }]),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    fn settings_validate_colors_succeeds() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            colors: Some(Colors {
                color1: "rgba(0, 107, 204, 1)".to_string(),
                color2: "rgba(0, 107, 204, 1)".to_string(),
                color3: "rgba(0, 107, 204, 1)".to_string(),
                color4: "rgba(0, 107, 204, 1)".to_string(),
                color5: "rgba(0, 107, 204, 1)".to_string(),
                color6: "rgba(0, 107, 204, 1)".to_string(),
                color7: "rgba(0, 107, 204, 1)".to_string(),
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "color1 is not valid (expected format: \"rgba(0, 107, 204, 1)\")")]
    fn settings_validate_colors_invalid_format() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            colors: Some(Colors {
                color1: "invalid-color".to_string(),
                color2: "rgba(0, 107, 204, 1)".to_string(),
                color3: "rgba(0, 107, 204, 1)".to_string(),
                color4: "rgba(0, 107, 204, 1)".to_string(),
                color5: "rgba(0, 107, 204, 1)".to_string(),
                color6: "rgba(0, 107, 204, 1)".to_string(),
                color7: "rgba(0, 107, 204, 1)".to_string(),
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    fn settings_validate_featured_items_succeeds() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            featured_items: Some(vec![FeaturedItemRule {
                field: "Field".to_string(),
                options: vec![FeaturedItemRuleOption {
                    value: "Value".to_string(),
                    label: Some("Label".to_string()),
                    order: Some(1),
                }],
            }]),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "field cannot be empty")]
    fn settings_validate_featured_items_empty_field() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            featured_items: Some(vec![FeaturedItemRule {
                field: String::new(),
                options: vec![],
            }]),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "options cannot be empty")]
    fn settings_validate_featured_items_empty_options() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            featured_items: Some(vec![FeaturedItemRule {
                field: "Field".to_string(),
                options: vec![],
            }]),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "option value cannot be empty")]
    fn settings_validate_featured_items_empty_option_value() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            featured_items: Some(vec![FeaturedItemRule {
                field: "Field".to_string(),
                options: vec![FeaturedItemRuleOption {
                    value: String::new(),
                    ..Default::default()
                }],
            }]),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "option label cannot be empty")]
    fn settings_validate_featured_items_empty_option_label() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            featured_items: Some(vec![FeaturedItemRule {
                field: "Field".to_string(),
                options: vec![FeaturedItemRuleOption {
                    value: "Value".to_string(),
                    label: Some(String::new()),
                    ..Default::default()
                }],
            }]),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    fn settings_validate_footer_succeeds() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            footer: Some(Footer {
                links: Some(FooterLinks {
                    github: Some("https://github.com".to_string()),
                    ..Default::default()
                }),
                logo: Some("https://logo.url".to_string()),
                text: Some("Footer text".to_string()),
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "invalid github url")]
    fn settings_validate_footer_invalid_github_url() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            footer: Some(Footer {
                links: Some(FooterLinks {
                    github: Some("invalid-url".to_string()),
                    ..Default::default()
                }),
                ..Default::default()
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "invalid footer logo url")]
    fn settings_validate_footer_invalid_logo_url() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            footer: Some(Footer {
                logo: Some("invalid-url".to_string()),
                ..Default::default()
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "footer text cannot be empty")]
    fn settings_validate_footer_empty_text() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            footer: Some(Footer {
                text: Some(String::new()),
                ..Default::default()
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    fn settings_validate_groups_succeeds() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            groups: Some(vec![Group {
                name: "Group 1".to_string(),
                categories: vec!["Category".to_string()],
                ..Default::default()
            }]),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "group [0] name cannot be empty")]
    fn settings_validate_groups_empty_name() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            groups: Some(vec![Group {
                name: String::new(),
                categories: vec![],
                ..Default::default()
            }]),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "group [Group 1]: category [0] cannot be empty")]
    fn settings_validate_groups_empty_category() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            groups: Some(vec![Group {
                name: "Group 1".to_string(),
                categories: vec![String::new()],
                ..Default::default()
            }]),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    fn settings_validate_header_succeeds() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            header: Some(Header {
                links: Some(HeaderLinks {
                    github: Some("https://github.com".to_string()),
                }),
                logo: Some("https://logo.url".to_string()),
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "invalid github url")]
    fn settings_validate_header_invalid_github_url() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            header: Some(Header {
                links: Some(HeaderLinks {
                    github: Some("invalid-url".to_string()),
                }),
                ..Default::default()
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "invalid header logo url")]
    fn settings_validate_header_invalid_logo_url() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            header: Some(Header {
                logo: Some("invalid-url".to_string()),
                ..Default::default()
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    fn settings_validate_images_succeeds() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            images: Some(Images {
                favicon: Some("https://favicon.url".to_string()),
                open_graph: Some("https://open-graph.url".to_string()),
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "invalid favicon url")]
    fn settings_validate_images_invalid_favicon_url() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            images: Some(Images {
                favicon: Some("invalid-url".to_string()),
                ..Default::default()
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    fn settings_validate_members_category_succeeds() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            members_category: Some("Members".to_string()),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "members category cannot be empty")]
    fn settings_validate_members_category_empty() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            members_category: Some(String::new()),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    fn settings_validate_osano_succeeds() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            osano: Some(Osano {
                customer_id: "customer_id".to_string(),
                customer_configuration_id: "customer_configuration_id".to_string(),
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "osano customer id cannot be empty")]
    fn settings_validate_osano_empty_customer_id() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            osano: Some(Osano {
                customer_id: String::new(),
                ..Default::default()
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "osano customer configuration id cannot be empty")]
    fn settings_validate_osano_empty_customer_configuration_id() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            osano: Some(Osano {
                customer_id: "customer_id".to_string(),
                customer_configuration_id: String::new(),
            }),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    fn settings_validate_screenshot_width_succeeds() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            screenshot_width: Some(2000),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "screenshot width must be greater than 1000")]
    fn settings_validate_screenshot_width_invalid() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            screenshot_width: Some(1000),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    fn settings_validate_tags_succeeds() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            tags: Some(BTreeMap::from_iter(vec![(
                "tag1".to_string(),
                vec![TagRule {
                    category: "Category".to_string(),
                    subcategories: Some(vec!["Subcategory".to_string()]),
                }],
            )])),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "tag [tag1] category cannot be empty")]
    fn settings_validate_tags_empty_category() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            tags: Some(BTreeMap::from_iter(vec![(
                "tag1".to_string(),
                vec![TagRule {
                    category: String::new(),
                    subcategories: None,
                }],
            )])),
            ..Default::default()
        };

        settings.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "tag [tag1] subcategories cannot be empty")]
    fn settings_validate_tags_empty_subcategories() {
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            url: "https://example.url".to_string(),
            tags: Some(BTreeMap::from_iter(vec![(
                "tag1".to_string(),
                vec![TagRule {
                    category: "Category".to_string(),
                    subcategories: Some(vec![]),
                }],
            )])),
            ..Default::default()
        };

        settings.validate().unwrap();
    }
}

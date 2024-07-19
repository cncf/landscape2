//! This module defines some types used to parse the landscape data file in
//! legacy format and convert it to the new one.

use super::{ItemAudit, ItemLink};
use crate::util::validate_url;
use anyhow::{bail, format_err, Context, Result};
use chrono::NaiveDate;
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};

lazy_static! {
    /// TAG name regular expression.
    static ref TAG_NAME: Regex = Regex::new(r"^[a-z\-]+$").expect("exprs in TAG_NAME to be valid");
}

/// Landscape data (legacy format).
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(super) struct LandscapeData {
    #[serde(alias = "categories")]
    pub landscape: Vec<Category>,
}

impl LandscapeData {
    /// Validate landscape data.
    pub fn validate(&self) -> Result<()> {
        for (category_index, category) in self.landscape.iter().enumerate() {
            // Check category name
            if category.name.is_empty() {
                bail!("category [{category_index}] name is required");
            }

            for (subcategory_index, subcategory) in category.subcategories.iter().enumerate() {
                // Used to check for duplicate items within this subcategory
                let mut items_seen = Vec::new();

                // Check subcategory name
                if subcategory.name.is_empty() {
                    bail!(
                        "subcategory [{subcategory_index}] name is required (category: [{}]) ",
                        category.name
                    );
                }

                for (item_index, item) in subcategory.items.iter().enumerate() {
                    // Prepare context for errors
                    let item_id = if item.name.is_empty() {
                        format!("{item_index}")
                    } else {
                        item.name.clone()
                    };
                    let ctx = format!(
                        "item [{}] is not valid (category: [{}] | subcategory: [{}])",
                        item_id, category.name, subcategory.name
                    );

                    // Check name
                    if item.name.is_empty() {
                        return Err(format_err!("item name is required")).context(ctx);
                    }
                    if items_seen.contains(&item.name) {
                        return Err(format_err!("duplicate item name")).context(ctx);
                    }
                    items_seen.push(item.name.clone());

                    // Check homepage
                    if item.homepage_url.is_empty() {
                        return Err(format_err!("homepage url is required")).context(ctx);
                    }

                    // Check logo
                    if item.logo.is_empty() {
                        return Err(format_err!("logo is required")).context(ctx);
                    }

                    // Check some values in extra
                    if let Some(extra) = &item.extra {
                        // Check other links
                        if let Some(other_links) = &extra.other_links {
                            for link in other_links {
                                if link.name.is_empty() {
                                    return Err(format_err!("link name is required")).context(ctx);
                                }
                                if link.url.is_empty() {
                                    return Err(format_err!("link url is required")).context(ctx);
                                }
                            }
                        }

                        // Check tag name
                        if let Some(tag) = &extra.tag {
                            if !TAG_NAME.is_match(tag) {
                                return Err(format_err!(
                                    "invalid tag (must use only lowercase letters and hyphens)"
                                ))
                                .context(ctx);
                            }
                        }
                    }

                    // Check urls
                    validate_urls(item).context(ctx)?;
                }
            }
        }

        Ok(())
    }
}

/// Landscape category.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(super) struct Category {
    pub name: String,
    pub subcategories: Vec<SubCategory>,
}

/// Landscape subcategory.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(super) struct SubCategory {
    pub name: String,
    pub items: Vec<Item>,
}

/// Landscape item (project, product, member, etc).
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(super) struct Item {
    pub name: String,
    pub homepage_url: String,
    pub logo: String,
    pub additional_repos: Option<Vec<Repository>>,
    pub branch: Option<String>,
    pub crunchbase: Option<String>,
    pub description: Option<String>,
    pub enduser: Option<bool>,
    pub extra: Option<ItemExtra>,
    pub joined: Option<NaiveDate>,
    pub project: Option<String>,
    pub repo_url: Option<String>,
    pub second_path: Option<Vec<String>>,
    pub twitter: Option<String>,
    pub url_for_bestpractices: Option<String>,
    pub unnamed_organization: Option<bool>,
}

/// Extra information for a landscape item.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(super) struct ItemExtra {
    pub accepted: Option<NaiveDate>,
    pub archived: Option<NaiveDate>,
    pub audits: Option<Vec<ItemAudit>>,
    pub annual_review_date: Option<NaiveDate>,
    pub annual_review_url: Option<String>,
    pub artwork_url: Option<String>,
    pub blog_url: Option<String>,
    pub chat_channel: Option<String>,
    pub clomonitor_name: Option<String>,
    pub dev_stats_url: Option<String>,
    pub discord_url: Option<String>,
    pub docker_url: Option<String>,
    pub documentation_url: Option<String>,
    pub github_discussions_url: Option<String>,
    pub gitter_url: Option<String>,
    pub graduated: Option<NaiveDate>,
    pub incubating: Option<NaiveDate>,
    pub linkedin_url: Option<String>,
    pub mailing_list_url: Option<String>,
    pub other_links: Option<Vec<ItemLink>>,
    pub package_manager_url: Option<String>,
    pub parent_project: Option<String>,
    pub slack_url: Option<String>,
    pub specification: Option<bool>,
    pub stack_overflow_url: Option<String>,
    pub summary_business_use_case: Option<String>,
    pub summary_integration: Option<String>,
    pub summary_integrations: Option<String>,
    pub summary_intro_url: Option<String>,
    pub summary_personas: Option<String>,
    pub summary_release_rate: Option<String>,
    pub summary_tags: Option<String>,
    pub summary_use_case: Option<String>,
    pub tag: Option<String>,
    pub training_certifications: Option<String>,
    pub training_type: Option<String>,
    pub youtube_url: Option<String>,
}

/// Landscape item repository.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(super) struct Repository {
    pub repo_url: String,
    pub branch: Option<String>,
}

/// Validate the urls of the item provided.
fn validate_urls(item: &Item) -> Result<()> {
    // Check urls in item
    let homepage_url = Some(item.homepage_url.clone());
    let urls = [
        ("best_practices", &item.url_for_bestpractices),
        ("crunchbase", &item.crunchbase),
        ("homepage", &homepage_url),
        ("repository", &item.repo_url),
        ("twitter", &item.twitter),
    ];
    for (name, url) in urls {
        validate_url(name, url)?;
    }

    // Check additional repositories
    if let Some(additional_repos) = &item.additional_repos {
        for r in additional_repos {
            let repo_url = Some(r.repo_url.clone());
            validate_url("additional_repository", &repo_url)?;
        }
    }

    // Check urls in item extra
    if let Some(extra) = &item.extra {
        let urls = [
            ("annual_review", &extra.annual_review_url),
            ("artwork", &extra.artwork_url),
            ("blog", &extra.blog_url),
            ("dev_stats", &extra.dev_stats_url),
            ("discord", &extra.discord_url),
            ("docker", &extra.docker_url),
            ("documentation", &extra.documentation_url),
            ("github_discussions", &extra.github_discussions_url),
            ("gitter", &extra.gitter_url),
            ("linkedin", &extra.linkedin_url),
            ("package_manager", &extra.package_manager_url),
            ("mailing_list", &extra.mailing_list_url),
            ("slack", &extra.slack_url),
            ("stack_overflow", &extra.stack_overflow_url),
            ("youtube", &extra.youtube_url),
        ];
        for (name, url) in urls {
            validate_url(name, url)?;
        }

        // Check audits urls
        if let Some(audits) = &extra.audits {
            for a in audits {
                let audit_url = Some(a.url.clone());
                validate_url("audit", &audit_url)?;
            }
        }

        // Other links
        if let Some(other_links) = &extra.other_links {
            for link in other_links {
                let link_url = Some(link.url.clone());
                validate_url("other_link", &link_url)?;
            }
        }
    };

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn landscape_data_validate_succeeds() {
        let mut landscape = LandscapeData::default();
        landscape.landscape.push(Category {
            name: "Category".to_string(),
            subcategories: vec![SubCategory {
                name: "Subcategory".to_string(),
                items: vec![Item {
                    name: "Item".to_string(),
                    homepage_url: "https://example.com".to_string(),
                    logo: "logo".to_string(),
                    additional_repos: Some(vec![Repository {
                        repo_url: "https://repo.url".to_string(),
                        ..Default::default()
                    }]),
                    extra: Some(ItemExtra {
                        audits: Some(vec![ItemAudit {
                            url: "https://audit.url".to_string(),
                            ..Default::default()
                        }]),
                        blog_url: Some("https://blog.url".to_string()),
                        other_links: Some(vec![ItemLink {
                            name: "link".to_string(),
                            url: "https://link.url".to_string(),
                        }]),
                        ..Default::default()
                    }),
                    ..Default::default()
                }],
            }],
        });

        landscape.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "category [0] name is required")]
    fn landscape_data_validate_empty_category_name() {
        let mut landscape = LandscapeData::default();
        landscape.landscape.push(Category {
            name: String::new(),
            subcategories: vec![],
        });

        landscape.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "subcategory [0] name is required")]
    fn landscape_data_validate_empty_subcategory_name() {
        let mut landscape = LandscapeData::default();
        landscape.landscape.push(Category {
            name: "Category".to_string(),
            subcategories: vec![SubCategory {
                name: String::new(),
                items: vec![],
            }],
        });

        landscape.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "item name is required")]
    fn landscape_data_validate_empty_item_name() {
        let mut landscape = LandscapeData::default();
        landscape.landscape.push(Category {
            name: "Category".to_string(),
            subcategories: vec![SubCategory {
                name: "Subcategory".to_string(),
                items: vec![Item {
                    name: String::new(),
                    ..Default::default()
                }],
            }],
        });

        landscape.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "duplicate item name")]
    fn landscape_data_validate_duplicate_item_name() {
        let mut landscape = LandscapeData::default();
        let item = Item {
            name: "Item".to_string(),
            homepage_url: "https://example.com".to_string(),
            logo: "logo".to_string(),
            ..Default::default()
        };
        landscape.landscape.push(Category {
            name: "Category".to_string(),
            subcategories: vec![SubCategory {
                name: "Subcategory".to_string(),
                items: vec![item.clone(), item],
            }],
        });

        landscape.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "homepage url is required")]
    fn landscape_data_validate_empty_homepage_url() {
        let mut landscape = LandscapeData::default();
        landscape.landscape.push(Category {
            name: "Category".to_string(),
            subcategories: vec![SubCategory {
                name: "Subcategory".to_string(),
                items: vec![Item {
                    name: "Item".to_string(),
                    ..Default::default()
                }],
            }],
        });

        landscape.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "logo is required")]
    fn landscape_data_validate_empty_logo() {
        let mut landscape = LandscapeData::default();
        landscape.landscape.push(Category {
            name: "Category".to_string(),
            subcategories: vec![SubCategory {
                name: "Subcategory".to_string(),
                items: vec![Item {
                    name: "Item".to_string(),
                    homepage_url: "https://example.com".to_string(),
                    ..Default::default()
                }],
            }],
        });

        landscape.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "link name is required")]
    fn landscape_data_validate_empty_link_name() {
        let mut landscape = LandscapeData::default();
        landscape.landscape.push(Category {
            name: "Category".to_string(),
            subcategories: vec![SubCategory {
                name: "Subcategory".to_string(),
                items: vec![Item {
                    name: "Item".to_string(),
                    homepage_url: "https://example.com".to_string(),
                    logo: "logo".to_string(),
                    extra: Some(ItemExtra {
                        other_links: Some(vec![ItemLink {
                            name: String::new(),
                            url: "https://link.url".to_string(),
                        }]),
                        ..Default::default()
                    }),
                    ..Default::default()
                }],
            }],
        });

        landscape.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "link url is required")]
    fn landscape_data_validate_empty_link_url() {
        let mut landscape = LandscapeData::default();
        landscape.landscape.push(Category {
            name: "Category".to_string(),
            subcategories: vec![SubCategory {
                name: "Subcategory".to_string(),
                items: vec![Item {
                    name: "Item".to_string(),
                    homepage_url: "https://example.com".to_string(),
                    logo: "logo".to_string(),
                    extra: Some(ItemExtra {
                        other_links: Some(vec![ItemLink {
                            name: "name".to_string(),
                            url: String::new(),
                        }]),
                        ..Default::default()
                    }),
                    ..Default::default()
                }],
            }],
        });

        landscape.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "invalid tag")]
    fn landscape_data_validate_invalid_tag() {
        let mut landscape = LandscapeData::default();
        landscape.landscape.push(Category {
            name: "Category".to_string(),
            subcategories: vec![SubCategory {
                name: "Subcategory".to_string(),
                items: vec![Item {
                    name: "Item".to_string(),
                    homepage_url: "https://example.com".to_string(),
                    logo: "logo".to_string(),
                    extra: Some(ItemExtra {
                        tag: Some("Invalid Tag".to_string()),
                        ..Default::default()
                    }),
                    ..Default::default()
                }],
            }],
        });

        landscape.validate().unwrap();
    }

    #[test]
    #[should_panic(expected = "invalid homepage url")]
    fn landscape_data_validate_invalid_url() {
        let mut landscape = LandscapeData::default();
        landscape.landscape.push(Category {
            name: "Category".to_string(),
            subcategories: vec![SubCategory {
                name: "Subcategory".to_string(),
                items: vec![Item {
                    name: "Item".to_string(),
                    homepage_url: "homepage_url".to_string(),
                    logo: "logo".to_string(),
                    ..Default::default()
                }],
            }],
        });

        landscape.validate().unwrap();
    }
}

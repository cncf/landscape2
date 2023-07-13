//! This module defines some datasets that will be used to power the web
//! application. They are built from the landscape settings and data, as well
//! as from data collected from other external sources like GitHub. Some of
//! these datasets may be embedded in the index document (or used while
//! rendering it), whereas others will be written to the output directory so
//! that they can be fetched when needed.

use self::{base::Base, full::Full};
use crate::{data::LandscapeData, settings::Settings};
use anyhow::{Ok, Result};

/// Datasets collection.
#[derive(Debug, Clone)]
pub(crate) struct Datasets {
    /// #[base]
    pub base: Base,

    /// #[full]
    pub full: Full,
}

impl Datasets {
    /// Create a new datasets instance.
    pub(crate) fn new(settings: &Settings, landscape_data: &LandscapeData) -> Result<Self> {
        let datasets = Datasets {
            base: Base::new(settings, landscape_data),
            full: Full::new(landscape_data.clone()),
        };

        Ok(datasets)
    }
}

/// Base dataset.
///
/// This dataset contains the minimal data the web application needs to render
/// the initial page and power the features available on it.
mod base {
    use crate::{
        data::{Category, CategoryName, ItemFeatured, LandscapeData},
        settings::{Group, Settings},
    };
    use serde::{Deserialize, Serialize};
    use uuid::Uuid;

    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Base {
        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub categories: Vec<Category>,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub categories_overridden: Vec<CategoryName>,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub groups: Vec<Group>,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub items: Vec<Item>,
    }

    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Item {
        pub category: String,
        pub has_repositories: bool,
        pub id: Uuid,
        pub name: String,
        pub logo: String,
        pub subcategory: String,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub featured: Option<ItemFeatured>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub project: Option<String>,
    }

    impl Base {
        /// Create a new Base instance from the settings and data provided.
        pub(crate) fn new(settings: &Settings, landscape_data: &LandscapeData) -> Self {
            let mut base = Base {
                groups: settings.groups.clone().unwrap_or(vec![]),
                categories: landscape_data.categories.clone(),
                ..Default::default()
            };

            // Update categories overridden in settings
            if let Some(categories) = &settings.categories {
                for category in categories {
                    if let Some(index) = base.categories.iter().position(|c| c.name == category.name) {
                        base.categories[index] = category.clone();
                    }
                    base.categories_overridden.push(category.name.clone());
                }
            }

            // Prepare items from landscape data
            for item in &landscape_data.items {
                base.items.push(Item {
                    category: item.category.clone(),
                    featured: item.featured.clone(),
                    has_repositories: !item.repositories.as_ref().unwrap_or(&vec![]).is_empty(),
                    id: item.id,
                    name: item.name.clone(),
                    logo: item.logo.clone(),
                    project: item.project.clone(),
                    subcategory: item.subcategory.clone(),
                });
            }

            base
        }
    }
}

/// Full dataset.
///
/// This dataset contains all the information available for the landscape. This
/// information is used by the web application to power features that require
/// some extra data not available in the base dataset.
mod full {
    use crate::data::{Category, Item, LandscapeData};
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Full {
        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub categories: Vec<Category>,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub items: Vec<Item>,
    }

    impl Full {
        /// Create a new Full instance from the landscape data provided.
        pub(crate) fn new(data: LandscapeData) -> Self {
            Full {
                categories: data.categories,
                items: data.items,
            }
        }
    }
}

use self::{base::Base, logos::Logos};
use crate::{data::Data, settings::Settings};
use anyhow::{Ok, Result};

/// Datasets collection.
#[derive(Debug, Clone)]
pub(crate) struct Datasets {
    pub base: Base,
    pub logos: Logos,
}

impl Datasets {
    /// Create a new datasets instance from the settings and data provided.
    pub(crate) fn new(settings: &Settings, data: &Data) -> Result<Self> {
        let datasets = Datasets {
            base: Base::new(settings, data),
            logos: data.into(),
        };

        Ok(datasets)
    }
}

/// Base dataset.
mod base {
    use crate::{
        data::{Category, CategoryName, Data},
        settings::{Settings, Tab},
    };
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Base {
        pub tabs: Vec<Tab>,
        pub categories: Vec<Category>,
        pub categories_overridden: Vec<CategoryName>,
        pub items: Vec<Item>,
    }

    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Item {
        pub category: String,
        pub has_repositories: bool,
        pub name: String,
        pub logo: String,
        pub subcategory: String,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub project: Option<String>,
    }

    impl Base {
        /// Create a new Base instance from the settings and data provided.
        pub(crate) fn new(settings: &Settings, data: &Data) -> Self {
            let mut base = Base {
                tabs: settings.tabs.clone(),
                categories: data.categories.clone(),
                ..Default::default()
            };

            // Update categories overridden in settings
            for category in &settings.categories {
                if let Some(index) = base.categories.iter().position(|c| c.name == category.name) {
                    base.categories[index] = category.clone();
                }
                base.categories_overridden.push(category.name.clone());
            }

            // Prepare items from landscape data
            for item in &data.items {
                base.items.push(Item {
                    category: item.category.clone(),
                    has_repositories: !item.repositories.as_ref().unwrap_or(&vec![]).is_empty(),
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

/// Logos dataset.
mod logos {
    use crate::data::Data;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Logos {
        pub files: Vec<String>,
    }

    impl From<&Data> for Logos {
        fn from(data: &Data) -> Self {
            let mut logos = Logos::default();

            for item in &data.items {
                logos.files.push(item.logo.clone());
            }
            logos.files.sort();
            logos.files.dedup();

            logos
        }
    }
}

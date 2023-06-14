use self::{base::Base, logos::Logos};
use crate::landscape::Landscape;
use anyhow::{Ok, Result};

/// Datasets collection.
#[derive(Debug, Clone)]
pub(crate) struct Datasets {
    pub base: Base,
    pub logos: Logos,
}

impl Datasets {
    /// Create a new datasets instance from the landscape provided.
    pub(crate) fn new(landscape: &Landscape) -> Result<Self> {
        let datasets = Datasets {
            base: landscape.into(),
            logos: landscape.into(),
        };
        Ok(datasets)
    }
}

/// Base dataset.
mod base {
    use crate::landscape::Landscape;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Base {
        pub categories: Vec<Category>,
    }

    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Category {
        pub name: String,
        pub subcategories: Vec<SubCategory>,
    }

    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct SubCategory {
        pub name: String,
        pub items: Vec<Item>,
    }

    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Item {
        pub name: String,
        pub logo: String,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub project: Option<String>,
    }

    impl From<&Landscape> for Base {
        fn from(landscape: &Landscape) -> Self {
            let mut base = Base::default();

            for lc in &landscape.categories {
                let mut category = Category {
                    name: lc.name.clone(),
                    subcategories: vec![],
                };
                for lsc in &lc.subcategories {
                    let mut subcategory = SubCategory {
                        name: lsc.name.clone(),
                        items: vec![],
                    };
                    for li in &lsc.items {
                        let item = Item {
                            name: li.name.clone(),
                            logo: li.logo.clone(),
                            project: li.project.clone(),
                        };
                        subcategory.items.push(item);
                    }
                    category.subcategories.push(subcategory);
                }
                base.categories.push(category);
            }

            base
        }
    }
}

/// Logos dataset.
mod logos {
    use crate::landscape::Landscape;
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Logos {
        pub files: Vec<String>,
    }

    impl From<&Landscape> for Logos {
        fn from(landscape: &Landscape) -> Self {
            let mut logos = Logos::default();

            for category in &landscape.categories {
                for subcategory in &category.subcategories {
                    for item in &subcategory.items {
                        logos.files.push(item.logo.clone());
                    }
                }
            }

            logos
        }
    }
}

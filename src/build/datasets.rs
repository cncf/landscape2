//! This module defines some datasets that will be used to power the web
//! application. They are built from the landscape settings and data, as well
//! as from data collected from other external sources like GitHub. Some of
//! these datasets may be embedded in the index document (or used while
//! rendering it), whereas others will be written to the output directory so
//! that they can be fetched when needed.

use self::{base::Base, full::Full};
use super::{
    crunchbase::CrunchbaseData, github::GithubData, guide::LandscapeGuide, settings::LandscapeSettings,
    stats::Stats, LandscapeData,
};
use anyhow::{Ok, Result};

/// Datasets collection.
#[derive(Debug, Clone)]
pub(crate) struct Datasets {
    /// #[base]
    pub base: Base,

    /// #[full]
    pub full: Full,

    /// Stats dataset.
    pub stats: Stats,
}

impl Datasets {
    /// Create a new datasets instance.
    pub(crate) fn new(i: &NewDatasetsInput) -> Result<Self> {
        let datasets = Datasets {
            base: Base::new(i.landscape_data, i.settings, i.guide, i.qr_code),
            full: Full::new(i.crunchbase_data, i.github_data, i.landscape_data),
            stats: Stats::new(i.landscape_data, i.settings),
        };

        Ok(datasets)
    }
}

/// Input used to create a new Datasets instance.
#[derive(Debug, Clone)]
pub(crate) struct NewDatasetsInput<'a> {
    pub crunchbase_data: &'a CrunchbaseData,
    pub github_data: &'a GithubData,
    pub guide: &'a Option<LandscapeGuide>,
    pub landscape_data: &'a LandscapeData,
    pub qr_code: &'a Option<String>,
    pub settings: &'a LandscapeSettings,
}

/// Base dataset.
///
/// This dataset contains the minimal data the web application needs to render
/// the initial page and power the features available on it.
mod base {
    use crate::build::{
        data::{AdditionalCategory, Category, CategoryName, ItemFeatured, LandscapeData},
        guide::LandscapeGuide,
        settings::{Colors, GridItemsSize, Group, Images, LandscapeSettings, SocialNetworks},
    };
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;

    /// Base dataset information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Base {
        pub foundation: String,
        pub images: Images,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub categories: Vec<Category>,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub categories_overridden: Vec<CategoryName>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub colors: Option<Colors>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub grid_items_size: Option<GridItemsSize>,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub groups: Vec<Group>,

        #[serde(skip_serializing_if = "HashMap::is_empty")]
        pub guide_summary: GuideSummary,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub items: Vec<Item>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub qr_code: Option<String>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub social_networks: Option<SocialNetworks>,
    }

    impl Base {
        /// Create a new Base instance from the data and settings provided.
        pub(crate) fn new(
            landscape_data: &LandscapeData,
            settings: &LandscapeSettings,
            guide: &Option<LandscapeGuide>,
            qr_code: &Option<String>,
        ) -> Self {
            let mut base = Base {
                foundation: settings.foundation.clone(),
                images: settings.images.clone(),
                categories: landscape_data.categories.clone(),
                colors: settings.colors.clone(),
                grid_items_size: settings.grid_items_size.clone(),
                groups: settings.groups.clone().unwrap_or_default(),
                qr_code: qr_code.clone(),
                social_networks: settings.social_networks.clone(),
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
                    additional_categories: item.additional_categories.clone(),
                    category: item.category.clone(),
                    featured: item.featured.clone(),
                    id: item.id.clone(),
                    name: item.name.clone(),
                    logo: item.logo.clone(),
                    maturity: item.maturity.clone(),
                    subcategory: item.subcategory.clone(),
                    oss: item.oss,
                    tag: item.tag.clone(),
                });
            }

            // Prepare guide summary
            if let Some(guide) = guide {
                if let Some(categories) = &guide.categories {
                    for category in categories {
                        let subcategories = if let Some(subcategories) = &category.subcategories {
                            subcategories.iter().map(|s| s.subcategory.clone()).collect()
                        } else {
                            Vec::new()
                        };
                        base.guide_summary.insert(category.category.clone(), subcategories);
                    }
                }
            }

            base
        }
    }

    /// Base dataset item information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Item {
        pub category: String,
        pub id: String,
        pub name: String,
        pub logo: String,
        pub subcategory: String,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub additional_categories: Option<Vec<AdditionalCategory>>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub featured: Option<ItemFeatured>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub maturity: Option<String>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub oss: Option<bool>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub tag: Option<String>,
    }

    /// Type alias to represent the guide summary.
    type GuideSummary = HashMap<String, Vec<String>>;
}

/// Full dataset.
///
/// This dataset contains all the information available for the landscape. This
/// information is used by the web application to power features that require
/// some extra data not available in the base dataset.
mod full {
    use crate::build::{
        crunchbase::CrunchbaseData,
        data::{Item, LandscapeData},
        github::GithubData,
    };
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;

    /// Full dataset information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Full {
        #[serde(skip_serializing_if = "HashMap::is_empty")]
        pub crunchbase_data: CrunchbaseData,

        #[serde(skip_serializing_if = "HashMap::is_empty")]
        pub github_data: GithubData,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub items: Vec<Item>,
    }

    impl Full {
        /// Create a new Full instance from the landscape data provided.
        pub(crate) fn new(
            crunchbase_data: &CrunchbaseData,
            github_data: &GithubData,
            landscape_data: &LandscapeData,
        ) -> Self {
            Full {
                crunchbase_data: crunchbase_data.clone(),
                github_data: github_data.clone(),
                items: landscape_data.items.clone(),
            }
        }
    }
}

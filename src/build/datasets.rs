//! This module defines some datasets that will be used to power the web
//! application. They are built from the landscape settings and data, as well
//! as from data collected from other external sources like GitHub. Some of
//! these datasets may be embedded in the index document (or used while
//! rendering it), whereas others will be written to the output directory so
//! that they can be fetched when needed. These datasets are not meant to be
//! consumed by other applications, as they can change at any time.

use self::{base::Base, embed::Embed, full::Full};
use super::{
    crunchbase::CrunchbaseData, github::GithubData, github::GithubOrgData, guide::LandscapeGuide,
    settings::LandscapeSettings, stats::Stats, LandscapeData,
};
use anyhow::{Ok, Result};

/// Datasets collection.
#[derive(Debug, Clone)]
pub(crate) struct Datasets {
    /// #[base]
    pub base: Base,

    /// #[embed]
    pub embed: Embed,

    /// #[full]
    pub full: Full,

    /// #[crate::build::stats]
    pub stats: Stats,
}

impl Datasets {
    /// Create a new datasets instance.
    pub(crate) fn new(i: &NewDatasetsInput) -> Result<Self> {
        let datasets = Datasets {
            base: Base::new(i.landscape_data, i.settings, i.guide, i.qr_code),
            embed: Embed::new(i.landscape_data),
            full: Full::new(
                i.crunchbase_data,
                i.github_data,
                i.github_org_data,
                i.landscape_data,
            ),
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
    pub github_org_data: &'a GithubOrgData,
    pub guide: &'a Option<LandscapeGuide>,
    pub landscape_data: &'a LandscapeData,
    pub qr_code: &'a String,
    pub settings: &'a LandscapeSettings,
}

/// Base dataset.
///
/// This dataset contains the minimal data the web application needs to render
/// the initial page and power the features available on it.
mod base {
    use crate::build::{
        data::{self, AdditionalCategory, Category, CategoryName, ItemFeatured, LandscapeData},
        guide::LandscapeGuide,
        settings::{Colors, Footer, GridItemsSize, Group, Header, Images, LandscapeSettings, UpcomingEvent},
    };
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;

    /// Base dataset information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Base {
        pub finances_available: bool,
        pub foundation: String,
        pub qr_code: String,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub categories: Vec<Category>,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub categories_overridden: Vec<CategoryName>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub colors: Option<Colors>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub footer: Option<Footer>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub grid_items_size: Option<GridItemsSize>,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub groups: Vec<Group>,

        #[serde(skip_serializing_if = "HashMap::is_empty")]
        pub guide_summary: GuideSummary,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub header: Option<Header>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub images: Option<Images>,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub items: Vec<Item>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub members_category: Option<String>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub upcoming_event: Option<UpcomingEvent>,
    }

    impl Base {
        /// Create a new Base instance from the data and settings provided.
        pub(crate) fn new(
            landscape_data: &LandscapeData,
            settings: &LandscapeSettings,
            guide: &Option<LandscapeGuide>,
            qr_code: &str,
        ) -> Self {
            let mut base = Base {
                finances_available: false,
                foundation: settings.foundation.clone(),
                qr_code: qr_code.to_string(),
                images: settings.images.clone(),
                categories: landscape_data.categories.clone(),
                categories_overridden: vec![],
                colors: settings.colors.clone(),
                footer: settings.footer.clone(),
                grid_items_size: settings.grid_items_size.clone(),
                groups: settings.groups.clone().unwrap_or_default(),
                guide_summary: HashMap::new(),
                header: settings.header.clone(),
                items: vec![],
                members_category: settings.members_category.clone(),
                upcoming_event: settings.upcoming_event.clone(),
            };

            // Update categories overridden in settings
            if let Some(categories) = &settings.categories {
                for category in categories {
                    if let Some(index) = base.categories.iter().position(|c| c.name == category.name) {
                        base.categories[index] = category.into();
                    }
                    base.categories_overridden.push(category.name.clone());
                }
            }

            // Prepare items from landscape data
            for item in &landscape_data.items {
                base.items.push(item.into());
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

            // Check if finances data is available (funding rounds or acquisitions)
            if landscape_data.items.iter().any(|item| {
                if let Some(org) = &item.crunchbase_data {
                    if let Some(acquisitions) = &org.acquisitions {
                        if !acquisitions.is_empty() {
                            return true;
                        }
                    }
                    if let Some(funding_rounds) = &org.funding_rounds {
                        if !funding_rounds.is_empty() {
                            return true;
                        }
                    }
                }
                false
            }) {
                base.finances_available = true;
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

    impl From<&data::Item> for Item {
        fn from(data_item: &data::Item) -> Self {
            Item {
                additional_categories: data_item.additional_categories.clone(),
                category: data_item.category.clone(),
                featured: data_item.featured.clone(),
                id: data_item.id.clone(),
                name: data_item.name.clone(),
                logo: data_item.logo.clone(),
                maturity: data_item.maturity.clone(),
                subcategory: data_item.subcategory.clone(),
                oss: data_item.oss,
                tag: data_item.tag.clone(),
            }
        }
    }

    /// Type alias to represent the guide summary.
    type GuideSummary = HashMap<String, Vec<String>>;
}

/// Embed dataset.
///
/// This dataset contains some information about all the embeddable views that
/// can be generated from the information available in the landscape data.
mod embed {
    use super::base::Item;
    use crate::build::{data::Category, LandscapeData};
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;

    /// Embed dataset information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct Embed {
        #[serde(flatten, skip_serializing_if = "HashMap::is_empty")]
        pub views: HashMap<EmbedKey, EmbedView>,
    }

    impl Embed {
        /// Create a new Embed instance from the data provided.
        pub(crate) fn new(landscape_data: &LandscapeData) -> Self {
            let mut views = HashMap::new();

            for category in &landscape_data.categories {
                // Full category view
                let key = category.normalized_name.clone();
                let view = EmbedView {
                    category: category.clone(),
                    items: landscape_data
                        .items
                        .iter()
                        .filter(|i| i.category == category.name)
                        .map(Item::from)
                        .collect(),
                };
                views.insert(key, view);

                // Subcategories views
                for subcategory in &category.subcategories {
                    let key = format!("{}--{}", category.normalized_name, subcategory.normalized_name,);
                    let view = EmbedView {
                        category: Category {
                            name: category.name.clone(),
                            normalized_name: category.normalized_name.clone(),
                            subcategories: vec![subcategory.clone()],
                        },
                        items: landscape_data
                            .items
                            .iter()
                            .filter(|i| i.category == category.name && i.subcategory == *subcategory.name)
                            .map(Item::from)
                            .collect(),
                    };
                    views.insert(key, view);
                }
            }

            Self { views }
        }
    }

    /// Type alias to represent a embed key.
    pub(crate) type EmbedKey = String;

    /// Embed view information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub(crate) struct EmbedView {
        pub category: Category,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub items: Vec<Item>,
    }
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
        github::GithubOrgData,
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

        #[serde(skip_serializing_if = "HashMap::is_empty")]
        pub github_org_data: GithubOrgData,

        #[serde(skip_serializing_if = "Vec::is_empty")]
        pub items: Vec<Item>,
    }

    impl Full {
        /// Create a new Full instance from the landscape data provided.
        pub(crate) fn new(
            crunchbase_data: &CrunchbaseData,
            github_data: &GithubData,
            github_org_data: &GithubOrgData,
            landscape_data: &LandscapeData,
        ) -> Self {
            Full {
                crunchbase_data: crunchbase_data.clone(),
                github_data: github_data.clone(),
                github_org_data: github_org_data.clone(),
                items: landscape_data.items.clone(),
            }
        }
    }
}

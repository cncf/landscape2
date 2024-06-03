//! This module defines some datasets that will be used to power the web
//! application. They are built from the landscape settings and data, as well
//! as from data collected from other external sources like GitHub. Some of
//! these datasets may be embedded in the index document (or used while
//! rendering it), whereas others will be written to the output directory so
//! that they can be fetched when needed. These datasets are not meant to be
//! consumed by other applications, as they can change at any time.

use self::{base::Base, embed::Embed, full::Full};
use crate::{
    data::{CrunchbaseData, GithubData, LandscapeData},
    games::LandscapeGames,
    guide::LandscapeGuide,
    settings::LandscapeSettings,
    stats::Stats,
};

/// Input used to create a new Datasets instance.
#[derive(Debug, Clone)]
pub struct NewDatasetsInput<'a> {
    pub crunchbase_data: &'a CrunchbaseData,
    pub games: &'a Option<LandscapeGames>,
    pub github_data: &'a GithubData,
    pub guide: &'a Option<LandscapeGuide>,
    pub landscape_data: &'a LandscapeData,
    pub qr_code: &'a String,
    pub settings: &'a LandscapeSettings,
}

/// Datasets collection.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Datasets {
    /// #[base]
    pub base: Base,

    /// #[embed]
    pub embed: Embed,

    /// #[full]
    pub full: Full,

    /// #[crate::stats]
    pub stats: Stats,
}

impl Datasets {
    /// Create a new datasets instance.
    #[must_use]
    pub fn new(i: &NewDatasetsInput) -> Self {
        Datasets {
            base: Base::new(i.landscape_data, i.settings, i.guide, i.games, i.qr_code),
            embed: Embed::new(i.landscape_data, i.settings),
            full: Full::new(i.landscape_data, i.crunchbase_data, i.github_data),
            stats: Stats::new(i.landscape_data, i.settings),
        }
    }
}

/// Base dataset.
///
/// This dataset contains the minimal data the web application needs to render
/// the initial page and power the features available on it.
pub mod base {
    use crate::{
        data::{self, AdditionalCategory, Category, CategoryName, ItemFeatured, LandscapeData},
        games::LandscapeGames,
        guide::LandscapeGuide,
        settings::{
            Colors, Footer, GridItemsSize, Group, Header, Images, LandscapeSettings, UpcomingEvent, ViewMode,
        },
    };
    use serde::{Deserialize, Serialize};
    use std::collections::BTreeMap;

    /// Base dataset information.
    #[allow(clippy::struct_field_names)]
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub struct Base {
        pub finances_available: bool,
        pub foundation: String,
        pub qr_code: String,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub base_path: Option<String>,

        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        pub categories: Vec<Category>,

        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        pub categories_overridden: Vec<CategoryName>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub colors: Option<Colors>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub footer: Option<Footer>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub games_available: Option<Vec<String>>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub grid_items_size: Option<GridItemsSize>,

        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        pub groups: Vec<Group>,

        #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
        pub guide_summary: GuideSummary,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub header: Option<Header>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub images: Option<Images>,

        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        pub items: Vec<Item>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub members_category: Option<String>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub upcoming_event: Option<UpcomingEvent>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub view_mode: Option<ViewMode>,
    }

    impl Base {
        /// Create a new Base instance from the data and settings provided.
        #[must_use]
        pub fn new(
            landscape_data: &LandscapeData,
            settings: &LandscapeSettings,
            guide: &Option<LandscapeGuide>,
            games: &Option<LandscapeGames>,
            qr_code: &str,
        ) -> Self {
            let mut base = Base {
                finances_available: false,
                foundation: settings.foundation.clone(),
                qr_code: qr_code.to_string(),
                base_path: settings.base_path.clone(),
                categories: landscape_data.categories.clone(),
                categories_overridden: vec![],
                colors: settings.colors.clone(),
                footer: settings.footer.clone(),
                games_available: None,
                grid_items_size: settings.grid_items_size.clone(),
                groups: settings.groups.clone().unwrap_or_default(),
                guide_summary: BTreeMap::new(),
                header: settings.header.clone(),
                images: settings.images.clone(),
                items: vec![],
                members_category: settings.members_category.clone(),
                upcoming_event: settings.upcoming_event.clone(),
                view_mode: settings.view_mode.clone(),
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

            // Check what games will be available
            if let Some(games) = games {
                if games.quiz.is_some() {
                    base.games_available = Some(vec!["quiz".to_string()]);
                }
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
    pub struct Item {
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
    type GuideSummary = BTreeMap<String, Vec<String>>;
}

/// Embed dataset.
///
/// This dataset contains some information about all the embeddable views that
/// can be generated from the information available in the landscape data.
pub mod embed {
    use crate::{
        data::{self, AdditionalCategory, Category, LandscapeData},
        settings::LandscapeSettings,
    };
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;

    /// Embed dataset information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub struct Embed {
        #[serde(default, flatten, skip_serializing_if = "HashMap::is_empty")]
        pub views: HashMap<EmbedKey, EmbedView>,
    }

    impl Embed {
        /// Create a new Embed instance from the data provided.
        pub fn new(landscape_data: &LandscapeData, settings: &LandscapeSettings) -> Self {
            let mut views = HashMap::new();

            for category in &landscape_data.categories {
                // Full category view
                let key = category.normalized_name.clone();
                let view = EmbedView {
                    foundation: settings.foundation.clone(),
                    category: category.clone(),
                    items: landscape_data
                        .items
                        .iter()
                        .filter(|i| {
                            i.category == category.name
                                || i.additional_categories
                                    .as_ref()
                                    .map_or(false, |ac| ac.iter().any(|ac| ac.category == category.name))
                        })
                        .map(Item::from)
                        .collect(),
                };
                views.insert(key, view);

                // Subcategories views
                for subcategory in &category.subcategories {
                    let key = format!("{}--{}", category.normalized_name, subcategory.normalized_name,);
                    let view = EmbedView {
                        foundation: settings.foundation.clone(),
                        category: Category {
                            name: category.name.clone(),
                            normalized_name: category.normalized_name.clone(),
                            subcategories: vec![subcategory.clone()],
                        },
                        items: landscape_data
                            .items
                            .iter()
                            .filter(|i| {
                                (i.category == category.name && i.subcategory == *subcategory.name)
                                    || i.additional_categories.as_ref().map_or(false, |ac| {
                                        ac.iter().any(|ac| {
                                            ac.category == category.name
                                                && ac.subcategory == *subcategory.name
                                        })
                                    })
                            })
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
    pub type EmbedKey = String;

    /// Embed view information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub struct EmbedView {
        pub category: Category,
        pub foundation: String,

        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        pub items: Vec<Item>,
    }

    /// Embed dataset item information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub struct Item {
        pub category: String,
        pub id: String,
        pub name: String,
        pub logo: String,
        pub subcategory: String,
        pub website: String,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub additional_categories: Option<Vec<AdditionalCategory>>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub description: Option<String>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub maturity: Option<String>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub member_subcategory: Option<String>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub organization_name: Option<String>,

        #[serde(skip_serializing_if = "Option::is_none")]
        pub primary_repository_url: Option<String>,
    }

    impl From<&data::Item> for Item {
        fn from(data_item: &data::Item) -> Self {
            Item {
                additional_categories: data_item.additional_categories.clone(),
                category: data_item.category.clone(),
                description: data_item.description().cloned(),
                id: data_item.id.clone(),
                name: data_item.name.clone(),
                logo: data_item.logo.clone(),
                maturity: data_item.maturity.clone(),
                member_subcategory: data_item.member_subcategory.clone(),
                organization_name: data_item.crunchbase_data.as_ref().and_then(|org| org.name.clone()),
                primary_repository_url: data_item.primary_repository().map(|r| r.url.clone()),
                subcategory: data_item.subcategory.clone(),
                website: data_item.website.clone(),
            }
        }
    }
}

/// Full dataset.
///
/// This dataset contains all the information available for the landscape. This
/// information is used by the web application to power features that require
/// some extra data not available in the base dataset.
pub mod full {
    use crate::data::{CrunchbaseData, GithubData, Item, LandscapeData};
    use serde::{Deserialize, Serialize};
    use std::collections::BTreeMap;

    /// Full dataset information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
    pub struct Full {
        #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
        pub crunchbase_data: CrunchbaseData,

        #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
        pub github_data: GithubData,

        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        pub items: Vec<Item>,
    }

    impl Full {
        /// Create a new Full instance from the landscape data provided.
        #[must_use]
        pub fn new(
            landscape_data: &LandscapeData,
            crunchbase_data: &CrunchbaseData,
            github_data: &GithubData,
        ) -> Self {
            Full {
                crunchbase_data: crunchbase_data.clone(),
                github_data: github_data.clone(),
                items: landscape_data.items.clone(),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        data::{self, *},
        datasets::base,
        games::Quiz,
        guide::{self, LandscapeGuide},
        settings::{self, *},
    };
    use chrono::{NaiveDate, Utc};
    use tests::embed::EmbedView;

    #[test]
    fn datasets_new() {
        let input = NewDatasetsInput {
            crunchbase_data: &CrunchbaseData::default(),
            games: &None,
            github_data: &GithubData::default(),
            guide: &None,
            landscape_data: &LandscapeData::default(),
            qr_code: &String::default(),
            settings: &LandscapeSettings::default(),
        };

        let datasets = Datasets::new(&input);
        assert_eq!(datasets, Datasets::default());
    }

    #[test]
    #[allow(clippy::too_many_lines)]
    fn base_new() {
        // Landscape data
        let item = data::Item {
            category: "Category 1".to_string(),
            crunchbase_data: Some(Organization {
                generated_at: Utc::now(),
                acquisitions: Some(vec![]),
                funding_rounds: Some(vec![FundingRound {
                    amount: Some(1000),
                    ..Default::default()
                }]),
                ..Default::default()
            }),
            homepage_url: "https://homepage.url".to_string(),
            id: "id".to_string(),
            logo: "logo.svg".to_string(),
            name: "Item".to_string(),
            subcategory: "Subcategory 1".to_string(),
            ..Default::default()
        };
        let landscape_data = LandscapeData {
            categories: vec![data::Category {
                name: "Category 1".to_string(),
                normalized_name: "category-1".to_string(),
                subcategories: vec![
                    Subcategory {
                        name: "Subcategory 1".to_string(),
                        normalized_name: "subcategory-1".to_string(),
                    },
                    Subcategory {
                        name: "Subcategory 2".to_string(),
                        normalized_name: "subcategory-2".to_string(),
                    },
                ],
            }],
            items: vec![item.clone()],
        };

        // Settings
        let colors = Some(Colors {
            color1: "rgb(100, 100, 100)".to_string(),
            ..Default::default()
        });
        let footer = Some(Footer {
            text: Some("Footer text".to_string()),
            ..Default::default()
        });
        let groups = vec![Group {
            name: "Group 1".to_string(),
            normalized_name: Some("group-1".to_string()),
            categories: vec!["Category 1".to_string()],
        }];
        let header = Some(Header {
            logo: Some("https://logo.url".to_string()),
            ..Default::default()
        });
        let images = Some(Images {
            favicon: Some("https://favicon.url".to_string()),
            ..Default::default()
        });
        let upcoming_event = UpcomingEvent {
            name: "Event".to_string(),
            start: NaiveDate::from_ymd_opt(2024, 5, 2).unwrap(),
            end: NaiveDate::from_ymd_opt(2024, 5, 3).unwrap(),
            banner_url: "https://banner.url".to_string(),
            details_url: "https://details.url".to_string(),
        };
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            base_path: Some("/base/path".to_string()),
            categories: Some(vec![settings::Category {
                name: "Category 1".to_string(),
                subcategories: vec!["Subcategory 1".to_string()],
            }]),
            colors: colors.clone(),
            footer: footer.clone(),
            grid_items_size: Some(GridItemsSize::Small),
            groups: Some(groups.clone()),
            header: header.clone(),
            images: images.clone(),
            members_category: Some("Members".to_string()),
            upcoming_event: Some(upcoming_event.clone()),
            view_mode: Some(ViewMode::Grid),
            ..Default::default()
        };

        // Guide
        let guide = LandscapeGuide {
            categories: Some(vec![guide::Category {
                category: "Category 1".to_string(),
                subcategories: Some(vec![guide::Subcategory {
                    subcategory: "Subcategory 1".to_string(),
                    ..Default::default()
                }]),
                ..Default::default()
            }]),
        };

        // Games
        let games = LandscapeGames {
            quiz: Some(Quiz { questions: vec![] }),
        };

        // QR code
        let qr_code = "QR_CODE".to_string();

        let base = Base::new(&landscape_data, &settings, &Some(guide), &Some(games), &qr_code);
        let expected_base = Base {
            finances_available: true,
            foundation: "Foundation".to_string(),
            qr_code: "QR_CODE".to_string(),
            base_path: Some("/base/path".to_string()),
            categories: vec![data::Category {
                name: "Category 1".to_string(),
                normalized_name: "category-1".to_string(),
                subcategories: vec![Subcategory {
                    name: "Subcategory 1".to_string(),
                    normalized_name: "subcategory-1".to_string(),
                }],
            }],
            categories_overridden: vec!["Category 1".to_string()],
            colors,
            footer,
            games_available: Some(vec!["quiz".to_string()]),
            grid_items_size: Some(GridItemsSize::Small),
            groups,
            guide_summary: vec![("Category 1".to_string(), vec!["Subcategory 1".to_string()])]
                .into_iter()
                .collect(),
            header,
            images,
            items: vec![(&item).into()],
            members_category: Some("Members".to_string()),
            upcoming_event: Some(upcoming_event),
            view_mode: Some(ViewMode::Grid),
        };
        pretty_assertions::assert_eq!(base, expected_base);
    }

    #[test]
    fn base_item_from_data_item() {
        let data_item = data::Item {
            additional_categories: Some(vec![AdditionalCategory {
                category: "Category 2".to_string(),
                subcategory: "Subcategory 3".to_string(),
            }]),
            category: "Category 1".to_string(),
            featured: Some(ItemFeatured {
                label: Some("label".to_string()),
                order: Some(1),
            }),
            id: "id".to_string(),
            logo: "logo.svg".to_string(),
            maturity: Some("graduated".to_string()),
            name: "Item".to_string(),
            oss: Some(true),
            subcategory: "Subcategory 1".to_string(),
            tag: Some("tag1".to_string()),
            ..Default::default()
        };

        let item = base::Item::from(&data_item);
        let expected_item = base::Item {
            additional_categories: Some(vec![AdditionalCategory {
                category: "Category 2".to_string(),
                subcategory: "Subcategory 3".to_string(),
            }]),
            category: "Category 1".to_string(),
            featured: Some(ItemFeatured {
                label: Some("label".to_string()),
                order: Some(1),
            }),
            id: "id".to_string(),
            logo: "logo.svg".to_string(),
            maturity: Some("graduated".to_string()),
            name: "Item".to_string(),
            oss: Some(true),
            subcategory: "Subcategory 1".to_string(),
            tag: Some("tag1".to_string()),
        };
        pretty_assertions::assert_eq!(item, expected_item);
    }

    #[test]
    fn embed_new() {
        let item = data::Item {
            additional_categories: Some(vec![AdditionalCategory {
                category: "Category 2".to_string(),
                subcategory: "Subcategory 2".to_string(),
            }]),
            category: "Category 1".to_string(),
            homepage_url: "https://homepage.url".to_string(),
            id: "id".to_string(),
            logo: "logo.svg".to_string(),
            name: "Item".to_string(),
            subcategory: "Subcategory 1".to_string(),
            ..Default::default()
        };
        let landscape_data = LandscapeData {
            categories: vec![
                data::Category {
                    name: "Category 1".to_string(),
                    normalized_name: "category-1".to_string(),
                    subcategories: vec![Subcategory {
                        name: "Subcategory 1".to_string(),
                        normalized_name: "subcategory-1".to_string(),
                    }],
                },
                data::Category {
                    name: "Category 2".to_string(),
                    normalized_name: "category-2".to_string(),
                    subcategories: vec![Subcategory {
                        name: "Subcategory 2".to_string(),
                        normalized_name: "subcategory-2".to_string(),
                    }],
                },
            ],
            items: vec![item.clone()],
        };
        let settings = LandscapeSettings {
            foundation: "Foundation".to_string(),
            ..Default::default()
        };

        let embed = Embed::new(&landscape_data, &settings);
        let expected_embed_view_c1 = EmbedView {
            foundation: "Foundation".to_string(),
            category: data::Category {
                name: "Category 1".to_string(),
                normalized_name: "category-1".to_string(),
                subcategories: vec![Subcategory {
                    name: "Subcategory 1".to_string(),
                    normalized_name: "subcategory-1".to_string(),
                }],
            },
            items: vec![(&item).into()],
        };
        let expected_embed_view_c2 = EmbedView {
            foundation: "Foundation".to_string(),
            category: data::Category {
                name: "Category 2".to_string(),
                normalized_name: "category-2".to_string(),
                subcategories: vec![Subcategory {
                    name: "Subcategory 2".to_string(),
                    normalized_name: "subcategory-2".to_string(),
                }],
            },
            items: vec![(&item).into()],
        };
        let expected_embed = embed::Embed {
            views: vec![
                ("category-1".to_string(), expected_embed_view_c1.clone()),
                ("category-1--subcategory-1".to_string(), expected_embed_view_c1),
                ("category-2".to_string(), expected_embed_view_c2.clone()),
                ("category-2--subcategory-2".to_string(), expected_embed_view_c2),
            ]
            .into_iter()
            .collect(),
        };
        pretty_assertions::assert_eq!(embed, expected_embed);
    }

    #[test]
    fn embed_item_from_data_item() {
        let data_item = data::Item {
            additional_categories: Some(vec![AdditionalCategory {
                category: "Category 2".to_string(),
                subcategory: "Subcategory 3".to_string(),
            }]),
            category: "Category 1".to_string(),
            crunchbase_data: Some(Organization {
                name: Some("Organization".to_string()),
                ..Default::default()
            }),
            description: Some("Description".to_string()),
            id: "id".to_string(),
            logo: "logo.svg".to_string(),
            maturity: Some("graduated".to_string()),
            member_subcategory: Some("Member subcategory".to_string()),
            name: "Item".to_string(),
            repositories: Some(vec![Repository {
                url: "https://repository.url".to_string(),
                primary: Some(true),
                ..Default::default()
            }]),
            subcategory: "Subcategory 1".to_string(),
            website: "https://homepage.url".to_string(),
            ..Default::default()
        };

        let item = embed::Item::from(&data_item);
        let expected_item = embed::Item {
            additional_categories: Some(vec![AdditionalCategory {
                category: "Category 2".to_string(),
                subcategory: "Subcategory 3".to_string(),
            }]),
            category: "Category 1".to_string(),
            description: Some("Description".to_string()),
            id: "id".to_string(),
            logo: "logo.svg".to_string(),
            maturity: Some("graduated".to_string()),
            member_subcategory: Some("Member subcategory".to_string()),
            name: "Item".to_string(),
            organization_name: Some("Organization".to_string()),
            primary_repository_url: Some("https://repository.url".to_string()),
            subcategory: "Subcategory 1".to_string(),
            website: "https://homepage.url".to_string(),
        };
        pretty_assertions::assert_eq!(item, expected_item);
    }

    #[test]
    fn full_new() {
        let item = data::Item {
            category: "Category 1".to_string(),
            homepage_url: "https://homepage.url".to_string(),
            id: "id".to_string(),
            logo: "logo.svg".to_string(),
            name: "Item".to_string(),
            subcategory: "Subcategory 1".to_string(),
            ..Default::default()
        };
        let landscape_data = LandscapeData {
            categories: vec![],
            items: vec![item.clone()],
        };
        let mut crunchbase_data = CrunchbaseData::default();
        crunchbase_data.insert("https:://crunchbase.url".to_string(), Organization::default());
        let mut github_data = GithubData::default();
        github_data.insert("https:://github.url".to_string(), RepositoryGithubData::default());

        let full = Full::new(&landscape_data, &crunchbase_data, &github_data);
        let expected_full = Full {
            crunchbase_data,
            github_data,
            items: vec![item],
        };
        pretty_assertions::assert_eq!(full, expected_full);
    }
}

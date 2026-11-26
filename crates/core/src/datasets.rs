//! This module defines some datasets that will be used to power the web
//! application. They are built from the landscape settings and data, as well
//! as from data collected from other external sources like GitHub. Some of
//! these datasets may be embedded in the index document (or used while
//! rendering it), whereas others will be written to the output directory so
//! that they can be fetched when needed. These datasets are not meant to be
//! consumed by other applications, as they can change at any time.

use std::collections::BTreeMap;

use chrono::{DateTime, Utc};

use crate::{
    data::{self, Category, CategoryName, ClassificationOption, CrunchbaseData, GithubData, LandscapeData},
    games::LandscapeGames,
    guide::LandscapeGuide,
    settings::LandscapeSettings,
    stats::Stats,
};

use self::{base::Base, embed::Embed, full::Full};

/// Input used to create a new Datasets instance.
#[derive(Debug, Clone)]
pub struct NewDatasetsInput<'a> {
    /// Organizations data collected from Crunchbase.
    pub crunchbase_data: &'a CrunchbaseData,
    /// Repositories data collected from GitHub.
    pub github_data: &'a GithubData,
    /// Landscape data, already enriched.
    pub landscape_data: &'a LandscapeData,
    /// Reference time used to generate the datasets (e.g. stats windows).
    pub now: DateTime<Utc>,
    /// Landscape settings.
    pub settings: &'a LandscapeSettings,

    /// Landscape games, when provided.
    pub games: Option<&'a LandscapeGames>,
    /// Landscape guide, when provided.
    pub guide: Option<&'a LandscapeGuide>,
    /// Path of the QR code image (SVG) pointing to the landscape url, when
    /// one is available.
    pub qr_code: Option<&'a str>,
}

/// Datasets collection.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Datasets {
    /// Base dataset, see [`base`].
    pub base: Base,
    /// Embed dataset, see [`embed`].
    pub embed: Embed,
    /// Full dataset, see [`full`].
    pub full: Full,
    /// Stats dataset, see [`crate::stats`].
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
            stats: Stats::new(i.landscape_data, i.settings, i.now),
        }
    }
}

/// Base dataset.
///
/// This dataset contains the minimal data the web application needs to render
/// the initial page and power the features available on it.
pub mod base {
    use std::collections::BTreeMap;

    use serde::Serialize;

    use crate::{
        data::{
            self, AdditionalCategory, Category, CategoryName, ClassificationOption, ItemFeatured,
            LandscapeData,
        },
        games::LandscapeGames,
        guide::LandscapeGuide,
        settings::{
            Colors, Footer, GridItemsSize, Group, Header, Images, LandscapeSettings, UpcomingEvent, ViewMode,
        },
    };

    use super::{ClassificationField, apply_category_overrides, classification_options};

    /// Base dataset information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize)]
    #[cfg_attr(
        feature = "ts",
        derive(ts_rs::TS),
        ts(export_to = "core/", optional_fields, rename = "BaseData")
    )]
    pub struct Base {
        /// Colors used across the landscape UI.
        pub colors: Colors,
        /// Whether some finances data (funding rounds or acquisitions) is available.
        pub finances_available: bool,
        /// Name of the foundation.
        pub foundation: String,
        /// Url where the landscape is hosted.
        pub url: String,

        /// Base path where the landscape is hosted.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub base_path: Option<String>,

        /// Categories, with the settings overrides applied.
        #[serde(skip_serializing_if = "Vec::is_empty")]
        #[cfg_attr(feature = "ts", ts(optional = nullable))]
        pub categories: Vec<Category>,

        /// Names of the categories overridden in the settings.
        #[serde(skip_serializing_if = "Vec::is_empty")]
        #[cfg_attr(feature = "ts", ts(optional = nullable))]
        pub categories_overridden: Vec<CategoryName>,

        /// Text describing the landscape.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub description: Option<String>,

        /// Footer configuration.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub footer: Option<Footer>,

        /// Games that can be played (e.g. `quiz`).
        #[serde(skip_serializing_if = "Option::is_none")]
        pub games_available: Option<Vec<String>>,

        /// Preferred size of the landscape items in the grid mode.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub grid_items_size: Option<GridItemsSize>,

        /// Groups used to organize the categories.
        #[serde(skip_serializing_if = "Vec::is_empty")]
        #[cfg_attr(feature = "ts", ts(optional = nullable))]
        pub groups: Vec<Group>,

        /// Guide categories mapped to their subcategories.
        #[serde(skip_serializing_if = "BTreeMap::is_empty")]
        #[cfg_attr(feature = "ts", ts(optional = nullable))]
        pub guide_summary: GuideSummary,

        /// Header configuration.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub header: Option<Header>,

        /// Whether to hide the organization section in the projects items modal.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub hide_organization_section_in_projects: Option<bool>,

        /// Urls of some images used in the landscape UI.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub images: Option<Images>,

        /// Items in the landscape.
        #[serde(skip_serializing_if = "Vec::is_empty")]
        #[cfg_attr(feature = "ts", ts(optional = nullable))]
        pub items: Vec<Item>,

        /// Maturity options of the items, sorted by name.
        #[serde(skip_serializing_if = "Vec::is_empty")]
        #[cfg_attr(feature = "ts", ts(optional = nullable))]
        pub maturity_options: Vec<ClassificationOption>,

        /// Path of the QR code image (SVG) pointing to the landscape url. The
        /// overlay has none, as the settings it uses may change the url.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub qr_code: Option<String>,

        /// TAG options of the items, sorted by name.
        #[serde(skip_serializing_if = "Vec::is_empty")]
        #[cfg_attr(feature = "ts", ts(optional = nullable))]
        pub tag_options: Vec<ClassificationOption>,

        /// Upcoming event featured on the landscape web application.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub upcoming_event: Option<UpcomingEvent>,

        /// Default view mode of the landscape web application.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub view_mode: Option<ViewMode>,
    }

    impl Base {
        /// Create a new Base instance from the data and settings provided.
        #[must_use]
        pub fn new(
            landscape_data: &LandscapeData,
            settings: &LandscapeSettings,
            guide: Option<&LandscapeGuide>,
            games: Option<&LandscapeGames>,
            qr_code: Option<&str>,
        ) -> Self {
            // Apply the categories overridden in the settings
            let (categories, categories_overridden) =
                apply_category_overrides(&landscape_data.categories, settings);

            // Prepare the base dataset from the settings
            let mut base = Base {
                colors: settings.colors.clone(),
                finances_available: false,
                foundation: settings.foundation.clone(),
                url: settings.url.clone(),
                base_path: settings.base_path.clone(),
                categories,
                categories_overridden,
                description: settings.description.clone(),
                footer: settings.footer.clone(),
                games_available: None,
                grid_items_size: settings.grid_items_size.clone(),
                groups: settings.groups.clone().unwrap_or_default(),
                guide_summary: BTreeMap::new(),
                header: settings.header.clone(),
                hide_organization_section_in_projects: settings.hide_organization_section_in_projects,
                images: settings.images.clone(),
                items: vec![],
                maturity_options: classification_options(
                    &landscape_data.items,
                    ClassificationField::Maturity,
                ),
                qr_code: qr_code.map(ToString::to_string),
                tag_options: classification_options(&landscape_data.items, ClassificationField::Tag),
                upcoming_event: settings.upcoming_event.clone(),
                view_mode: settings.view_mode.clone(),
            };

            // Prepare items from landscape data
            for item in &landscape_data.items {
                base.items.push(item.into());
            }

            // Check what games will be available (a quiz needs some questions)
            if let Some(games) = games
                && games.quiz.as_ref().is_some_and(|quiz| !quiz.questions.is_empty())
            {
                base.games_available = Some(vec!["quiz".to_string()]);
            }

            // Prepare guide summary
            if let Some(guide) = guide
                && let Some(categories) = &guide.categories
            {
                for category in categories {
                    let subcategories = if let Some(subcategories) = &category.subcategories {
                        subcategories.iter().map(|s| s.subcategory.clone()).collect()
                    } else {
                        Vec::new()
                    };
                    base.guide_summary.insert(category.category.clone(), subcategories);
                }
            }

            // Check if finances data is available (funding rounds or acquisitions)
            if landscape_data.items.iter().any(|item| {
                if let Some(org) = &item.crunchbase_data {
                    if org.acquisitions.as_ref().is_some_and(|acquisitions| !acquisitions.is_empty()) {
                        return true;
                    }
                    if org.funding_rounds.as_ref().is_some_and(|funding_rounds| !funding_rounds.is_empty()) {
                        return true;
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
    #[derive(Debug, Clone, Default, PartialEq, Serialize)]
    #[cfg_attr(
        feature = "ts",
        derive(ts_rs::TS),
        ts(export_to = "core/", optional_fields, rename = "BaseItem")
    )]
    pub struct Item {
        /// Name of the category the item belongs to.
        pub category: String,
        /// Item identifier.
        pub id: String,
        /// File name of the logo.
        pub logo: String,
        /// Name of the item.
        pub name: String,
        /// Name of the subcategory the item belongs to.
        pub subcategory: String,

        /// Additional categories and subcategories the item is listed in.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub additional_categories: Option<Vec<AdditionalCategory>>,

        /// Featured information.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub featured: Option<ItemFeatured>,

        /// Maturity of the project.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub maturity: Option<String>,

        /// Whether the item is open source.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub oss: Option<bool>,

        /// Technical Advisory Groups (TAG) the item is associated to.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub tag: Option<Vec<String>>,
    }

    impl From<&data::Item> for Item {
        fn from(data_item: &data::Item) -> Self {
            Item {
                category: data_item.category.clone(),
                id: data_item.id.clone(),
                logo: data_item.logo.clone(),
                name: data_item.name.clone(),
                subcategory: data_item.subcategory.clone(),
                additional_categories: data_item.additional_categories.clone(),
                featured: data_item.featured.clone(),
                maturity: data_item.maturity.clone(),
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
    use std::{
        collections::{HashMap, HashSet},
        iter, ptr,
    };

    use serde::Serialize;

    use crate::{
        data::{self, AdditionalCategory, Category, ClassificationOption, LandscapeData},
        settings::LandscapeSettings,
    };

    use super::{ClassificationField, apply_category_overrides, items_by_classification};

    /// Embed dataset information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize)]
    pub struct Embed {
        /// Embeddable views, keyed by their embed key.
        #[serde(flatten, skip_serializing_if = "HashMap::is_empty")]
        pub views: HashMap<EmbedKey, EmbedView>,
    }

    impl Embed {
        /// Create a new Embed instance from the data provided.
        #[must_use]
        pub fn new(landscape_data: &LandscapeData, settings: &LandscapeSettings) -> Self {
            // Apply the categories overridden in the settings, as the base dataset does
            let (categories, _) = apply_category_overrides(&landscape_data.categories, settings);

            // Prepare the views of every classification
            let mut views = HashMap::new();
            views.extend(Self::prepare_category_views(
                &categories,
                &landscape_data.items,
                &settings.foundation,
            ));
            for field in [ClassificationField::Maturity, ClassificationField::Tag] {
                views.extend(Self::prepare_classification_views(
                    &landscape_data.items,
                    &settings.foundation,
                    field,
                ));
            }

            Self { views }
        }

        /// Index the items provided by category and subcategory, including
        /// their additional categories. Each list keeps the items order.
        fn index_items(items: &[data::Item]) -> HashMap<(&str, &str), Vec<&data::Item>> {
            let mut index: HashMap<(&str, &str), Vec<&data::Item>> = HashMap::new();

            for item in items {
                // Add the item to its category and additional categories lists
                let additional_categories = item
                    .additional_categories
                    .iter()
                    .flatten()
                    .map(|ac| (ac.category.as_str(), ac.subcategory.as_str()));
                for key in iter::once((item.category.as_str(), item.subcategory.as_str()))
                    .chain(additional_categories)
                {
                    // Skip the item when it was already added to this list
                    let key_items = index.entry(key).or_default();
                    if !key_items.last().is_some_and(|last| ptr::eq(*last, item)) {
                        key_items.push(item);
                    }
                }
            }

            index
        }

        /// Insert the view provided in the views map. Keys cannot collide once
        /// the data and settings have been validated, which is checked in debug
        /// builds.
        fn insert_view(views: &mut HashMap<EmbedKey, EmbedView>, key: EmbedKey, view: EmbedView) {
            debug_assert!(!views.contains_key(&key), "duplicate embed key {key}");
            views.insert(key, view);
        }

        /// Prepare views for the category classification.
        ///
        /// The category views list the items of their subcategories, grouped
        /// by subcategory in the categories order.
        fn prepare_category_views(
            categories: &[Category],
            items: &[data::Item],
            foundation: &str,
        ) -> HashMap<EmbedKey, EmbedView> {
            let mut views = HashMap::new();
            let key_prefix = "category";

            // Index the items once by category and subcategory
            let items_index = Self::index_items(items);

            for category in categories {
                let mut category_items: Vec<&data::Item> = vec![];
                let mut category_items_ids = HashSet::new();

                // Subcategories views, collecting the category items once each
                for subcategory in &category.subcategories {
                    let subcategory_items = items_index
                        .get(&(category.name.as_str(), subcategory.name.as_str()))
                        .map_or_default(Vec::as_slice);
                    category_items.extend(
                        subcategory_items.iter().filter(|item| category_items_ids.insert(item.id.as_str())),
                    );

                    let key = format!(
                        "{}_{}--{}",
                        key_prefix, category.normalized_name, subcategory.normalized_name,
                    );
                    let view = EmbedView {
                        classification: Classification::Category(Category {
                            name: category.name.clone(),
                            normalized_name: category.normalized_name.clone(),
                            subcategories: vec![subcategory.clone()],
                        }),
                        foundation: foundation.to_string(),
                        items: subcategory_items.iter().copied().map(Item::from).collect(),
                    };
                    Self::insert_view(&mut views, key, view);
                }

                // Category view (includes items from all subcategories)
                let key = format!("{}_{}", key_prefix, category.normalized_name);
                let view = EmbedView {
                    classification: Classification::Category(category.clone()),
                    foundation: foundation.to_string(),
                    items: category_items.into_iter().map(Item::from).collect(),
                };
                Self::insert_view(&mut views, key, view);
            }

            views
        }

        /// Prepare views for the classification field provided: one view per
        /// option, plus an all options view when any item is classified.
        fn prepare_classification_views(
            items: &[data::Item],
            foundation: &str,
            field: ClassificationField,
        ) -> HashMap<EmbedKey, EmbedView> {
            let mut views = HashMap::new();
            let (key_prefix, make): (&str, fn(Vec<ClassificationOption>) -> Classification) = match field {
                ClassificationField::Maturity => ("maturity", Classification::Maturity),
                ClassificationField::Tag => ("tag", Classification::Tag),
            };

            // Group the items by option, as the base dataset options do
            let grouped_items = items_by_classification(items, field);

            // Prepare view for each option, collecting all options items
            let mut all_options_items: Vec<&data::Item> = vec![];
            for (option_name, items) in &grouped_items {
                let option = ClassificationOption::new(option_name);
                let option_key = format!("{}_{}", key_prefix, option.normalized_name);
                let option_view = EmbedView {
                    classification: make(vec![option]),
                    foundation: foundation.to_string(),
                    items: items.iter().copied().map(Item::from).collect(),
                };
                Self::insert_view(&mut views, option_key, option_view);
                all_options_items.extend(items);
            }

            // Add the all options view to the views map if there are any items
            if !all_options_items.is_empty() {
                // Clean up duplicated items
                all_options_items.sort_by(|a, b| a.id.cmp(&b.id));
                all_options_items.dedup_by(|a, b| a.id == b.id);

                let all_options = grouped_items.keys().map(|name| ClassificationOption::new(name)).collect();
                let all_options_view = EmbedView {
                    classification: make(all_options),
                    foundation: foundation.to_string(),
                    items: all_options_items.into_iter().map(Item::from).collect(),
                };
                let all_options_key = format!("{key_prefix}_all");
                Self::insert_view(&mut views, all_options_key, all_options_view);
            }

            views
        }
    }

    /// Type alias to represent an embed key.
    pub type EmbedKey = String;

    /// Embed view information.
    #[derive(Debug, Clone, PartialEq, Serialize)]
    #[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
    pub struct EmbedView {
        /// Classification the view is built from.
        pub classification: Classification,
        /// Name of the foundation.
        pub foundation: String,
        /// Items in the view, always serialized (empty views list none).
        pub items: Vec<Item>,
    }

    /// Embed classification.
    #[derive(Debug, Clone, PartialEq, Serialize)]
    #[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/"))]
    #[serde(rename_all = "snake_case")]
    pub enum Classification {
        /// Category, with the subcategories included in the view.
        Category(Category),
        /// Maturity options included in the view.
        Maturity(Vec<ClassificationOption>),
        /// TAG options included in the view.
        Tag(Vec<ClassificationOption>),
    }

    /// Embed dataset item information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize)]
    #[cfg_attr(
        feature = "ts",
        derive(ts_rs::TS),
        ts(export_to = "core/", optional_fields, rename = "EmbedItem")
    )]
    pub struct Item {
        /// Name of the category the item belongs to.
        pub category: String,
        /// Item identifier.
        pub id: String,
        /// File name of the logo.
        pub logo: String,
        /// Name of the item.
        pub name: String,
        /// Name of the subcategory the item belongs to.
        pub subcategory: String,
        /// Website url.
        pub website: String,

        /// Additional categories and subcategories the item is listed in.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub additional_categories: Option<Vec<AdditionalCategory>>,

        /// Resolved description (see [`LandscapeData::enrich`]).
        #[serde(skip_serializing_if = "Option::is_none")]
        pub description: Option<String>,

        /// Maturity of the project.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub maturity: Option<String>,

        /// Members category subcategory of the organization the item belongs to.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub member_subcategory: Option<String>,

        /// Name of the organization the item belongs to, from Crunchbase.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub organization_name: Option<String>,

        /// Url of the primary repository.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub primary_repository_url: Option<String>,

        /// Technical Advisory Groups (TAG) the item is associated to.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub tag: Option<Vec<String>>,
    }

    impl From<&data::Item> for Item {
        fn from(data_item: &data::Item) -> Self {
            Item {
                category: data_item.category.clone(),
                id: data_item.id.clone(),
                logo: data_item.logo.clone(),
                name: data_item.name.clone(),
                subcategory: data_item.subcategory.clone(),
                website: data_item.website.clone(),
                additional_categories: data_item.additional_categories.clone(),
                description: data_item.description.clone(),
                maturity: data_item.maturity.clone(),
                member_subcategory: data_item.member_subcategory.clone(),
                organization_name: data_item.crunchbase_data.as_ref().and_then(|org| org.name.clone()),
                primary_repository_url: data_item.primary_repository().map(|r| r.url.clone()),
                tag: data_item.tag.clone(),
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
    use std::collections::BTreeMap;

    use serde::Serialize;

    use crate::data::{CrunchbaseData, GithubData, Item, LandscapeData};

    /// Full dataset information.
    #[derive(Debug, Clone, Default, PartialEq, Serialize)]
    #[cfg_attr(
        feature = "ts",
        derive(ts_rs::TS),
        ts(export_to = "core/", optional_fields, rename = "FullDataset")
    )]
    pub struct Full {
        /// Organizations data collected from Crunchbase.
        #[serde(skip_serializing_if = "BTreeMap::is_empty")]
        #[cfg_attr(feature = "ts", ts(optional = nullable))]
        pub crunchbase_data: CrunchbaseData,

        /// Repositories data collected from GitHub.
        #[serde(skip_serializing_if = "BTreeMap::is_empty")]
        #[cfg_attr(feature = "ts", ts(optional = nullable))]
        pub github_data: GithubData,

        /// Items in the landscape, with all their information.
        #[serde(skip_serializing_if = "Vec::is_empty")]
        #[cfg_attr(feature = "ts", ts(optional = nullable))]
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

/// Item field used to classify the items in options (maturity and TAG).
#[derive(Debug, Clone, Copy, PartialEq)]
enum ClassificationField {
    /// Item maturity.
    Maturity,
    /// Item TAGs.
    Tag,
}

impl ClassificationField {
    /// Return the values of this field in the item provided.
    fn values(self, item: &data::Item) -> &[String] {
        match self {
            ClassificationField::Maturity => item.maturity.as_slice(),
            ClassificationField::Tag => item.tag.as_deref().unwrap_or_default(),
        }
    }
}

/// Apply the categories overridden in the settings to the categories provided.
/// Returns the resulting categories and the names of the ones replaced. An
/// override for a category that does not exist in the data is ignored.
fn apply_category_overrides(
    categories: &[Category],
    settings: &LandscapeSettings,
) -> (Vec<Category>, Vec<CategoryName>) {
    let mut categories = categories.to_vec();
    let mut categories_overridden = vec![];

    for category_override in settings.categories.iter().flatten() {
        if let Some(category) = categories.iter_mut().find(|c| c.name == category_override.name) {
            *category = category_override.into();
            categories_overridden.push(category_override.name.clone());
        }
    }

    (categories, categories_overridden)
}

/// Return the classification options of the field provided, sorted by name
/// and deduplicated. The embed views are keyed by the same options.
fn classification_options(items: &[data::Item], field: ClassificationField) -> Vec<ClassificationOption> {
    items_by_classification(items, field).into_keys().map(ClassificationOption::new).collect()
}

/// Group the items provided by the values of the classification field given,
/// sorted by value. Each list keeps the items order.
fn items_by_classification(
    items: &[data::Item],
    field: ClassificationField,
) -> BTreeMap<&str, Vec<&data::Item>> {
    let mut grouped_items: BTreeMap<&str, Vec<&data::Item>> = BTreeMap::new();
    for item in items {
        for value in field.values(item) {
            grouped_items.entry(value.as_str()).or_default().push(item);
        }
    }
    grouped_items
}

#[cfg(test)]
mod tests;

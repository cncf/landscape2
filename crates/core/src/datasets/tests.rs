use chrono::{NaiveDate, TimeZone, Utc};
use serde::Deserialize;
use serde_json::json;

use crate::{
    data::{
        self, Acquisition, AdditionalCategory, ClassificationOption, FundingRound, ItemFeatured,
        Organization, Repository, RepositoryGithubData, Subcategory,
    },
    games::{Question, QuestionOption, Quiz},
    guide,
    settings::{self, Colors, Footer, GridItemsSize, Group, Header, Images, UpcomingEvent, ViewMode},
    util::normalize_name,
};

use super::embed::{Classification, EmbedView};
use super::*;

#[test]
fn test_datasets_new_builds_all_datasets() {
    // Setup landscape data with a graduated project funded once and a member
    let project = data::Item {
        crunchbase_data: Some(Organization {
            funding_rounds: Some(vec![FundingRound {
                amount: Some(1000),
                ..Default::default()
            }]),
            ..Default::default()
        }),
        maturity: Some("graduated".to_string()),
        ..item("project", "Category 1", "Subcategory 1")
    };
    let member = item("member", "Members", "Gold");
    let landscape_data = LandscapeData {
        categories: vec![
            category("Category 1", &["Subcategory 1", "Subcategory 2"]),
            category("Members", &["Gold"]),
        ],
        items: vec![project.clone(), member.clone()],
    };

    // Setup the external data, settings, guide, games and reference time
    let mut crunchbase_data = CrunchbaseData::default();
    crunchbase_data.insert(
        "https://www.crunchbase.com/organization/project".to_string(),
        Organization::default(),
    );
    let github_data = GithubData::default();
    let settings = valid_settings();
    let guide = LandscapeGuide {
        categories: Some(vec![guide::Category {
            category: "Category 1".to_string(),
            subcategories: None,
            ..Default::default()
        }]),
    };
    let games = games_with_one_question();
    let now = Utc.with_ymd_and_hms(2026, 6, 15, 0, 0, 0).unwrap();
    let input = NewDatasetsInput {
        crunchbase_data: &crunchbase_data,
        github_data: &github_data,
        landscape_data: &landscape_data,
        now,
        settings: &settings,
        games: Some(&games),
        guide: Some(&guide),
        qr_code: Some("QR_CODE"),
    };

    // Run the datasets generation
    let datasets = Datasets::new(&input);

    // Check the base dataset
    assert!(datasets.base.finances_available);
    assert_eq!(datasets.base.foundation, "Foundation");
    assert_eq!(datasets.base.url, "https://landscape.url");
    assert_eq!(datasets.base.categories, landscape_data.categories);
    assert_eq!(datasets.base.games_available, Some(vec!["quiz".to_string()]));
    assert_eq!(
        datasets.base.guide_summary,
        [("Category 1".to_string(), vec![])].into_iter().collect()
    );
    assert_eq!(datasets.base.items, vec![(&project).into(), (&member).into()]);
    assert_eq!(datasets.base.qr_code.as_deref(), Some("QR_CODE"));

    // Check the embed dataset
    assert_eq!(
        sorted_keys(&datasets.embed),
        vec![
            "category_category-1",
            "category_category-1--subcategory-1",
            "category_category-1--subcategory-2",
            "category_members",
            "category_members--gold",
            "maturity_all",
            "maturity_graduated",
        ]
    );
    assert_eq!(
        view_item_ids(&datasets.embed, "maturity_graduated"),
        vec!["project"]
    );

    // Check the full and stats datasets
    assert_eq!(datasets.full.crunchbase_data, crunchbase_data);
    assert_eq!(datasets.full.items, landscape_data.items);
    assert_eq!(datasets.stats.generated_at, now);
    assert_eq!(datasets.stats.projects.unwrap().projects, 1);
}

#[test]
fn test_base_classification_options_match_embed_view_keys() {
    // Setup items with maturity and TAG values that need normalization
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![
            data::Item {
                maturity: Some("Early Stage".to_string()),
                tag: Some(vec!["a--b".to_string(), "tag_x".to_string()]),
                ..item("item1", "Category 1", "Subcategory 1")
            },
            data::Item {
                maturity: Some("Graduated".to_string()),
                tag: Some(vec!["App Definition".to_string()]),
                ..item("item2", "Category 1", "Subcategory 1")
            },
        ],
    };

    // Run the base and embed datasets creation
    let base = Base::new(&landscape_data, &valid_settings(), None, None, None);
    let embed = Embed::new(&landscape_data, &valid_settings());

    // Check every option has a view, and every option view has an option
    let mut expected_keys: Vec<String> = base
        .maturity_options
        .iter()
        .map(|option| format!("maturity_{}", option.normalized_name))
        .chain(base.tag_options.iter().map(|option| format!("tag_{}", option.normalized_name)))
        .collect();
    expected_keys.extend(["maturity_all".to_string(), "tag_all".to_string()]);
    expected_keys.sort_unstable();
    assert_eq!(sorted_keys(&embed), expected_keys);
}

#[test]
#[expect(clippy::too_many_lines)]
fn test_base_new_builds_base_dataset() {
    // Setup landscape data with one item with funding rounds
    let item = data::Item {
        category: "Category 1".to_string(),
        homepage_url: "https://homepage.url".to_string(),
        id: "id".to_string(),
        logo: "logo.svg".to_string(),
        name: "Item".to_string(),
        subcategory: "Subcategory 1".to_string(),
        crunchbase_data: Some(Organization {
            generated_at: Utc::now(),
            acquisitions: Some(vec![]),
            funding_rounds: Some(vec![FundingRound {
                amount: Some(1000),
                ..Default::default()
            }]),
            ..Default::default()
        }),
        ..Default::default()
    };
    let landscape_data = LandscapeData {
        categories: vec![category("Category 1", &["Subcategory 1", "Subcategory 2"])],
        items: vec![item.clone()],
    };

    // Setup settings overriding the first category subcategories
    let colors = Colors {
        color1: "rgb(100, 100, 100)".to_string(),
        ..Default::default()
    };
    let footer = Some(Footer {
        text: Some("Footer text".to_string()),
        ..Default::default()
    });
    let groups = vec![Group {
        categories: vec!["Category 1".to_string()],
        name: "Group 1".to_string(),
        alias: Some("group-1".to_string()),
        normalized_name: Some("group-1".to_string()),
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
        banner_url: "https://banner.url".to_string(),
        details_url: "https://details.url".to_string(),
        end: NaiveDate::from_ymd_opt(2024, 5, 3).unwrap(),
        name: "Event".to_string(),
        start: NaiveDate::from_ymd_opt(2024, 5, 2).unwrap(),
    };
    let settings = LandscapeSettings {
        base_path: Some("/base/path".to_string()),
        categories: Some(vec![settings::Category {
            name: "Category 1".to_string(),
            subcategories: vec!["Subcategory 1".to_string()],
        }]),
        colors: colors.clone(),
        description: Some("Short landscape description.".to_string()),
        footer: footer.clone(),
        grid_items_size: Some(GridItemsSize::Small),
        groups: Some(groups.clone()),
        header: header.clone(),
        hide_organization_section_in_projects: Some(true),
        images: images.clone(),
        members_category: Some("Members".to_string()),
        upcoming_event: Some(upcoming_event.clone()),
        view_mode: Some(ViewMode::Grid),
        ..valid_settings()
    };

    // Setup guide and games
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
    let games = games_with_one_question();

    // Run the base dataset creation
    let base = Base::new(
        &landscape_data,
        &settings,
        Some(&guide),
        Some(&games),
        Some("QR_CODE"),
    );

    // Check the base dataset uses the overridden categories and the inputs provided
    let expected_base = Base {
        colors,
        finances_available: true,
        foundation: "Foundation".to_string(),
        url: "https://landscape.url".to_string(),
        base_path: Some("/base/path".to_string()),
        categories: vec![category("Category 1", &["Subcategory 1"])],
        categories_overridden: vec!["Category 1".to_string()],
        description: Some("Short landscape description.".to_string()),
        footer,
        games_available: Some(vec!["quiz".to_string()]),
        grid_items_size: Some(GridItemsSize::Small),
        groups,
        guide_summary: vec![("Category 1".to_string(), vec!["Subcategory 1".to_string()])]
            .into_iter()
            .collect(),
        header,
        hide_organization_section_in_projects: Some(true),
        images,
        items: vec![(&item).into()],
        maturity_options: vec![],
        qr_code: Some("QR_CODE".to_string()),
        tag_options: vec![],
        upcoming_event: Some(upcoming_event),
        view_mode: Some(ViewMode::Grid),
    };
    pretty_assertions::assert_eq!(base, expected_base);
}

#[test]
fn test_base_new_guide_category_without_subcategories() {
    // Setup a guide with a category without subcategories and another with one
    let guide = LandscapeGuide {
        categories: Some(vec![
            guide::Category {
                category: "Category 1".to_string(),
                subcategories: None,
                ..Default::default()
            },
            guide::Category {
                category: "Category 2".to_string(),
                subcategories: Some(vec![guide::Subcategory {
                    subcategory: "Subcategory 1".to_string(),
                    ..Default::default()
                }]),
                ..Default::default()
            },
        ]),
    };

    // Run the base dataset creation
    let base = Base::new(
        &LandscapeData::default(),
        &valid_settings(),
        Some(&guide),
        None,
        None,
    );

    // Check the category without subcategories is listed with none
    assert_eq!(
        base.guide_summary,
        [
            ("Category 1".to_string(), vec![]),
            ("Category 2".to_string(), vec!["Subcategory 1".to_string()]),
        ]
        .into_iter()
        .collect()
    );
}

#[test]
fn test_base_new_hides_games_without_questions() {
    // Setup games with a quiz without questions
    let games = LandscapeGames {
        quiz: Some(Quiz { questions: vec![] }),
    };

    // Run the base dataset creation and check no game is advertised
    let base = Base::new(
        &LandscapeData::default(),
        &valid_settings(),
        None,
        Some(&games),
        None,
    );
    assert_eq!(base.games_available, None);
}

#[test]
fn test_base_new_ignores_override_for_unknown_category() {
    // Setup settings overriding a category that exists and one that does not
    let landscape_data = LandscapeData {
        categories: vec![category("Category 1", &["Subcategory 1", "Subcategory 2"])],
        items: vec![],
    };
    let settings = LandscapeSettings {
        categories: Some(vec![
            settings::Category {
                name: "Category 1".to_string(),
                subcategories: vec!["Subcategory 2".to_string()],
            },
            settings::Category {
                name: "Unknown".to_string(),
                subcategories: vec!["Subcategory 1".to_string()],
            },
        ]),
        ..valid_settings()
    };

    // Run the base dataset creation
    let base = Base::new(&landscape_data, &settings, None, None, None);

    // Check only the existing category was overridden and recorded
    assert_eq!(base.categories, vec![category("Category 1", &["Subcategory 2"])]);
    assert_eq!(base.categories_overridden, vec!["Category 1".to_string()]);
}

#[test]
fn test_base_new_omits_qr_code_when_none() {
    // Run the base dataset creation without a QR code
    let base = Base::new(&LandscapeData::default(), &valid_settings(), None, None, None);

    // Run the base dataset serialization
    let value = serde_json::to_value(&base).unwrap();

    // Check the QR code is neither set nor serialized
    assert_eq!(base.qr_code, None);
    assert_eq!(value.get("qr_code"), None);
}

#[test]
fn test_base_new_sets_classification_options() {
    // Setup items sharing some maturity and TAG values, and one without them
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![
            data::Item {
                maturity: Some("early stage".to_string()),
                tag: Some(vec!["tag2".to_string(), "tag1".to_string()]),
                ..item("item1", "Category 1", "Subcategory 1")
            },
            data::Item {
                maturity: Some("Graduated".to_string()),
                tag: Some(vec!["tag1".to_string()]),
                ..item("item2", "Category 1", "Subcategory 1")
            },
            data::Item {
                maturity: Some("early stage".to_string()),
                ..item("item3", "Category 1", "Subcategory 1")
            },
            item("item4", "Category 1", "Subcategory 1"),
        ],
    };

    // Run the base dataset creation
    let base = Base::new(&landscape_data, &valid_settings(), None, None, None);

    // Check the options are sorted by name, deduplicated and normalized
    assert_eq!(
        base.maturity_options,
        vec![
            classification_option("Graduated", "graduated"),
            classification_option("early stage", "early-stage"),
        ]
    );
    assert_eq!(
        base.tag_options,
        vec![
            classification_option("tag1", "tag1"),
            classification_option("tag2", "tag2"),
        ]
    );
}

#[test]
fn test_base_new_sets_finances_available_with_acquisitions_only() {
    // Setup an item whose organization has acquisitions but no funding rounds
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![data::Item {
            crunchbase_data: Some(Organization {
                acquisitions: Some(vec![Acquisition {
                    acquiree_name: Some("Acquiree".to_string()),
                    ..Default::default()
                }]),
                funding_rounds: None,
                ..Default::default()
            }),
            ..item("item", "Category 1", "Subcategory 1")
        }],
    };

    // Run the base dataset creation and check finances are available
    let base = Base::new(&landscape_data, &valid_settings(), None, None, None);
    assert!(base.finances_available);
}

#[test]
fn test_base_new_sets_finances_unavailable_without_rounds() {
    // Setup items without Crunchbase data or with empty funding data
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![
            item("item1", "Category 1", "Subcategory 1"),
            data::Item {
                crunchbase_data: Some(Organization {
                    acquisitions: Some(vec![]),
                    funding_rounds: Some(vec![]),
                    ..Default::default()
                }),
                ..item("item2", "Category 1", "Subcategory 1")
            },
        ],
    };

    // Run the base dataset creation and check finances are not available
    let base = Base::new(&landscape_data, &valid_settings(), None, None, None);
    assert!(!base.finances_available);
}

#[test]
fn test_base_serialization_omits_removed_fields() {
    // Setup settings with a members category and featured items rules
    let settings = LandscapeSettings {
        featured_items: Some(vec![settings::FeaturedItemRule {
            field: settings::FeaturedItemField::Maturity,
            options: vec![settings::FeaturedItemRuleOption {
                value: "graduated".to_string(),
                ..Default::default()
            }],
            exclude: None,
        }]),
        members_category: Some("Members".to_string()),
        ..valid_settings()
    };
    let base = Base::new(&LandscapeData::default(), &settings, None, None, None);

    // Run the base dataset serialization
    let value = serde_json::to_value(&base).unwrap();

    // Check the removed fields are not serialized
    assert_eq!(value.get("featured_items"), None);
    assert_eq!(value.get("members_category"), None);
}

#[test]
fn test_base_item_from_copies_data_item_fields() {
    // Setup a data item with every field used by the base item
    let data_item = data::Item {
        category: "Category 1".to_string(),
        id: "id".to_string(),
        logo: "logo.svg".to_string(),
        name: "Item".to_string(),
        subcategory: "Subcategory 1".to_string(),
        additional_categories: Some(vec![AdditionalCategory {
            category: "Category 2".to_string(),
            subcategory: "Subcategory 3".to_string(),
        }]),
        featured: Some(ItemFeatured {
            excluded_groups: Some(vec!["group-1".to_string()]),
            label: Some("label".to_string()),
            order: Some(1),
        }),
        maturity: Some("graduated".to_string()),
        oss: Some(true),
        tag: Some(vec!["tag1".to_string()]),
        ..Default::default()
    };

    // Run the conversion
    let item = base::Item::from(&data_item);

    // Check the base item fields
    let expected_item = base::Item {
        category: "Category 1".to_string(),
        id: "id".to_string(),
        logo: "logo.svg".to_string(),
        name: "Item".to_string(),
        subcategory: "Subcategory 1".to_string(),
        additional_categories: Some(vec![AdditionalCategory {
            category: "Category 2".to_string(),
            subcategory: "Subcategory 3".to_string(),
        }]),
        featured: Some(ItemFeatured {
            excluded_groups: Some(vec!["group-1".to_string()]),
            label: Some("label".to_string()),
            order: Some(1),
        }),
        maturity: Some("graduated".to_string()),
        oss: Some(true),
        tag: Some(vec!["tag1".to_string()]),
    };
    pretty_assertions::assert_eq!(item, expected_item);
}

#[test]
fn test_embed_new_applies_category_overrides() {
    // Setup a category with three subcategories, each with one item
    let landscape_data = LandscapeData {
        categories: vec![category(
            "Category 1",
            &["Subcategory 1", "Subcategory 2", "Subcategory 3"],
        )],
        items: vec![
            item("item1", "Category 1", "Subcategory 1"),
            item("item2", "Category 1", "Subcategory 2"),
            item("item3", "Category 1", "Subcategory 3"),
        ],
    };

    // Setup settings reordering the subcategories and excluding the third one
    let settings = LandscapeSettings {
        categories: Some(vec![settings::Category {
            name: "Category 1".to_string(),
            subcategories: vec!["Subcategory 2".to_string(), "Subcategory 1".to_string()],
        }]),
        ..valid_settings()
    };

    // Run the embed dataset creation
    let embed = Embed::new(&landscape_data, &settings);

    // Check the excluded subcategory has no view
    assert_eq!(
        sorted_keys(&embed),
        vec![
            "category_category-1",
            "category_category-1--subcategory-1",
            "category_category-1--subcategory-2",
        ]
    );

    // Check the category view lists the subcategories in the overridden order
    assert_eq!(
        embed.views["category_category-1"].classification,
        Classification::Category(category("Category 1", &["Subcategory 2", "Subcategory 1"]))
    );
}

#[test]
fn test_embed_new_builds_maturity_and_tag_views() {
    // Setup items with maturity and two tags, one item having both tags
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![
            data::Item {
                maturity: Some("graduated".to_string()),
                tag: Some(vec!["tag1".to_string(), "tag2".to_string()]),
                ..item("item1", "Category 1", "Subcategory 1")
            },
            data::Item {
                maturity: Some("sandbox".to_string()),
                tag: Some(vec!["tag2".to_string()]),
                ..item("item2", "Category 1", "Subcategory 1")
            },
            item("item3", "Category 1", "Subcategory 1"),
        ],
    };

    // Run the embed dataset creation
    let embed = Embed::new(&landscape_data, &valid_settings());

    // Check the views keys
    assert_eq!(
        sorted_keys(&embed),
        vec![
            "maturity_all",
            "maturity_graduated",
            "maturity_sandbox",
            "tag_all",
            "tag_tag1",
            "tag_tag2",
        ]
    );

    // Check the maturity views items
    assert_eq!(view_item_ids(&embed, "maturity_all"), vec!["item1", "item2"]);
    assert_eq!(view_item_ids(&embed, "maturity_graduated"), vec!["item1"]);
    assert_eq!(view_item_ids(&embed, "maturity_sandbox"), vec!["item2"]);

    // Check the tag views items, with the shared item only once in tag_all
    assert_eq!(view_item_ids(&embed, "tag_all"), vec!["item1", "item2"]);
    assert_eq!(view_item_ids(&embed, "tag_tag1"), vec!["item1"]);
    assert_eq!(view_item_ids(&embed, "tag_tag2"), vec!["item1", "item2"]);

    // Check the classifications of the all and option views
    assert_eq!(
        embed.views["tag_all"].classification,
        Classification::Tag(vec![
            classification_option("tag1", "tag1"),
            classification_option("tag2", "tag2"),
        ])
    );
    assert_eq!(
        embed.views["maturity_graduated"].classification,
        Classification::Maturity(vec![classification_option("graduated", "graduated")])
    );
}

#[test]
fn test_embed_new_category_view_lists_items_once() {
    // Setup an item whose additional category is another subcategory of its
    // own category
    let additional_item = data::Item {
        additional_categories: Some(vec![AdditionalCategory {
            category: "Category 1".to_string(),
            subcategory: "Subcategory 2".to_string(),
        }]),
        ..item("item2", "Category 1", "Subcategory 1")
    };
    let landscape_data = LandscapeData {
        categories: vec![category("Category 1", &["Subcategory 1", "Subcategory 2"])],
        items: vec![item("item1", "Category 1", "Subcategory 2"), additional_item],
    };

    // Run the embed dataset creation
    let embed = Embed::new(&landscape_data, &valid_settings());

    // Check the item is in both subcategory views
    assert_eq!(
        view_item_ids(&embed, "category_category-1--subcategory-1"),
        vec!["item2"]
    );
    assert_eq!(
        view_item_ids(&embed, "category_category-1--subcategory-2"),
        vec!["item1", "item2"]
    );

    // Check the category view lists it once, grouped by subcategory
    assert_eq!(
        view_item_ids(&embed, "category_category-1"),
        vec!["item2", "item1"]
    );
}

#[test]
fn test_embed_new_normalizes_option_keys() {
    // Setup an item with maturity and tag values with spaces and capitals
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![data::Item {
            maturity: Some("Early Stage".to_string()),
            tag: Some(vec!["App Definition".to_string()]),
            ..item("item1", "Category 1", "Subcategory 1")
        }],
    };

    // Run the embed dataset creation
    let embed = Embed::new(&landscape_data, &valid_settings());

    // Check the keys use the normalized values
    assert_eq!(
        sorted_keys(&embed),
        vec![
            "maturity_all",
            "maturity_early-stage",
            "tag_all",
            "tag_app-definition"
        ]
    );

    // Check the options keep both their name and their normalized name
    assert_eq!(
        embed.views["maturity_early-stage"].classification,
        Classification::Maturity(vec![classification_option("Early Stage", "early-stage")])
    );
    assert_eq!(
        embed.views["tag_app-definition"].classification,
        Classification::Tag(vec![classification_option("App Definition", "app-definition")])
    );
}

#[test]
fn test_embed_new_separates_category_and_subcategory_views() {
    // Setup two categories with two subcategories each and one item in each
    // subcategory
    let landscape_data = LandscapeData {
        categories: vec![
            category("Category 1", &["Subcategory 1", "Subcategory 2"]),
            category("Category 2", &["Subcategory 3", "Subcategory 4"]),
        ],
        items: vec![
            item("item1", "Category 1", "Subcategory 1"),
            item("item2", "Category 1", "Subcategory 2"),
            item("item3", "Category 2", "Subcategory 3"),
            item("item4", "Category 2", "Subcategory 4"),
        ],
    };

    // Run the embed dataset creation
    let embed = Embed::new(&landscape_data, &valid_settings());

    // Check the category views include the items of all their subcategories
    let expected_category_1_view = EmbedView {
        classification: Classification::Category(category("Category 1", &["Subcategory 1", "Subcategory 2"])),
        foundation: "Foundation".to_string(),
        items: vec![
            (&landscape_data.items[0]).into(),
            (&landscape_data.items[1]).into(),
        ],
    };
    pretty_assertions::assert_eq!(embed.views["category_category-1"], expected_category_1_view);
    assert_eq!(
        view_item_ids(&embed, "category_category-2"),
        vec!["item3", "item4"]
    );

    // Check the subcategory views only include their own subcategory and items
    let expected_subcategory_2_view = EmbedView {
        classification: Classification::Category(category("Category 1", &["Subcategory 2"])),
        foundation: "Foundation".to_string(),
        items: vec![(&landscape_data.items[1]).into()],
    };
    pretty_assertions::assert_eq!(
        embed.views["category_category-1--subcategory-2"],
        expected_subcategory_2_view
    );
    for (key, expected_item_ids) in [
        ("category_category-1--subcategory-1", vec!["item1"]),
        ("category_category-2--subcategory-3", vec!["item3"]),
        ("category_category-2--subcategory-4", vec!["item4"]),
    ] {
        assert_eq!(view_item_ids(&embed, key), expected_item_ids, "key: {key}");
    }
    assert_eq!(embed.views.len(), 6);
}

#[test]
fn test_embed_new_skips_all_view_without_items() {
    // Setup an item without maturity or tags
    let landscape_data = LandscapeData {
        categories: vec![category("Category 1", &["Subcategory 1"])],
        items: vec![item("item1", "Category 1", "Subcategory 1")],
    };

    // Run the embed dataset creation and check only category views exist
    let embed = Embed::new(&landscape_data, &valid_settings());
    assert_eq!(
        sorted_keys(&embed),
        vec!["category_category-1", "category_category-1--subcategory-1"]
    );
}

#[test]
fn test_embed_new_subcategory_view_includes_additional_category_items() {
    // Setup an item whose additional category is the second category
    let additional_item = data::Item {
        additional_categories: Some(vec![AdditionalCategory {
            category: "Category 2".to_string(),
            subcategory: "Subcategory 3".to_string(),
        }]),
        ..item("item1", "Category 1", "Subcategory 1")
    };
    let landscape_data = LandscapeData {
        categories: vec![
            category("Category 1", &["Subcategory 1"]),
            category("Category 2", &["Subcategory 3", "Subcategory 4"]),
        ],
        items: vec![additional_item, item("item2", "Category 2", "Subcategory 4")],
    };

    // Run the embed dataset creation
    let embed = Embed::new(&landscape_data, &valid_settings());

    // Check the item is in its primary and additional subcategory views only
    assert_eq!(
        view_item_ids(&embed, "category_category-1--subcategory-1"),
        vec!["item1"]
    );
    assert_eq!(
        view_item_ids(&embed, "category_category-2"),
        vec!["item1", "item2"]
    );
    assert_eq!(
        view_item_ids(&embed, "category_category-2--subcategory-3"),
        vec!["item1"]
    );
    assert_eq!(
        view_item_ids(&embed, "category_category-2--subcategory-4"),
        vec!["item2"]
    );
}

#[test]
fn test_embed_new_writes_fixture_keys() {
    // Setup the shared embed keys fixture cases
    let cases: Vec<EmbedKeyCase> = serde_json::from_str(EMBED_KEYS_FIXTURE).unwrap();

    // Setup the data matching the cases: their categories, and an item for
    // each maturity and TAG value
    let mut categories: Vec<data::Category> = vec![];
    let mut items = vec![];
    for (i, case) in cases.iter().enumerate() {
        let item_id = format!("item{i}");
        match case.classify.as_str() {
            "category" => {
                let category_name = case.category.as_deref().unwrap();
                let index = categories.iter().position(|c| c.name == category_name).unwrap_or_else(|| {
                    categories.push(category(category_name, &[]));
                    categories.len() - 1
                });
                if let Some(subcategory_name) = &case.subcategory {
                    categories[index].subcategories.push(Subcategory {
                        name: subcategory_name.clone(),
                        normalized_name: normalize_name(subcategory_name),
                    });
                }
            }
            "maturity" if let Some(value) = &case.value => items.push(data::Item {
                maturity: Some(value.clone()),
                ..item(&item_id, "Category 1", "Subcategory 1")
            }),
            "tag" if let Some(value) = &case.value => items.push(data::Item {
                tag: Some(vec![value.clone()]),
                ..item(&item_id, "Category 1", "Subcategory 1")
            }),
            "maturity" | "tag" => {}
            classify => panic!("unexpected classify value: {classify}"),
        }
    }
    let landscape_data = LandscapeData { categories, items };

    // Run the embed dataset creation
    let embed = Embed::new(&landscape_data, &valid_settings());

    // Check each fixture file is the one fetched for its key and has a view
    for case in &cases {
        assert_eq!(case.file, format!("embed_{}_{}.json", case.classify, case.key));
        let view_key = case.file.strip_prefix("embed_").unwrap().strip_suffix(".json").unwrap();
        assert!(embed.views.contains_key(view_key), "missing view: {view_key}");
    }
}

#[test]
fn test_embed_view_serializes_empty_items() {
    // Setup a category with an empty subcategory
    let landscape_data = LandscapeData {
        categories: vec![category("Category 1", &["Subcategory 1", "Subcategory 2"])],
        items: vec![item("item1", "Category 1", "Subcategory 1")],
    };
    let embed = Embed::new(&landscape_data, &valid_settings());

    // Run the empty subcategory view serialization
    let view = serde_json::to_value(&embed.views["category_category-1--subcategory-2"]).unwrap();

    // Check the items are serialized as an empty list
    assert_eq!(view["items"], json!([]));
}

#[test]
fn test_embed_item_from_copies_data_item_fields() {
    // Setup a data item with every field used by the embed item
    let data_item = data::Item {
        category: "Category 1".to_string(),
        id: "id".to_string(),
        logo: "logo.svg".to_string(),
        name: "Item".to_string(),
        subcategory: "Subcategory 1".to_string(),
        website: "https://homepage.url".to_string(),
        additional_categories: Some(vec![AdditionalCategory {
            category: "Category 2".to_string(),
            subcategory: "Subcategory 3".to_string(),
        }]),
        crunchbase_data: Some(Organization {
            name: Some("Organization".to_string()),
            ..Default::default()
        }),
        description: Some("Description".to_string()),
        maturity: Some("graduated".to_string()),
        member_subcategory: Some("Member subcategory".to_string()),
        repositories: Some(vec![Repository {
            url: "https://repository.url".to_string(),
            primary: Some(true),
            ..Default::default()
        }]),
        tag: Some(vec!["tag1".to_string()]),
        ..Default::default()
    };

    // Run the conversion
    let item = embed::Item::from(&data_item);

    // Check the embed item fields, including the organization and primary repository
    let expected_item = embed::Item {
        category: "Category 1".to_string(),
        id: "id".to_string(),
        logo: "logo.svg".to_string(),
        name: "Item".to_string(),
        subcategory: "Subcategory 1".to_string(),
        website: "https://homepage.url".to_string(),
        additional_categories: Some(vec![AdditionalCategory {
            category: "Category 2".to_string(),
            subcategory: "Subcategory 3".to_string(),
        }]),
        description: Some("Description".to_string()),
        maturity: Some("graduated".to_string()),
        member_subcategory: Some("Member subcategory".to_string()),
        organization_name: Some("Organization".to_string()),
        primary_repository_url: Some("https://repository.url".to_string()),
        tag: Some(vec!["tag1".to_string()]),
    };
    pretty_assertions::assert_eq!(item, expected_item);
}

#[test]
fn test_full_item_serialization_keeps_social_links() {
    // Setup an item with Facebook and Gitter urls
    let item = data::Item {
        facebook_url: Some("https://facebook.com/item".to_string()),
        gitter_url: Some("https://gitter.im/item".to_string()),
        ..item("item1", "Category 1", "Subcategory 1")
    };
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![item],
    };
    let full = Full::new(
        &landscape_data,
        &CrunchbaseData::default(),
        &GithubData::default(),
    );

    // Run the full dataset serialization
    let value = serde_json::to_value(&full).unwrap();

    // Check the social links are serialized
    assert_eq!(
        value["items"][0]["facebook_url"],
        json!("https://facebook.com/item")
    );
    assert_eq!(value["items"][0]["gitter_url"], json!("https://gitter.im/item"));
}

#[test]
fn test_full_item_serialization_omits_api_only_fields() {
    // Setup an item with every field only exposed through the API
    let item = data::Item {
        annotations: Some([("key".to_string(), "value".to_string())].into_iter().collect()),
        chat_channel: Some("#channel".to_string()),
        latest_annual_review_at: Some(NaiveDate::from_ymd_opt(2024, 5, 14).unwrap()),
        latest_annual_review_url: Some("https://annual.review.url".to_string()),
        lfx_slug: Some("item1".to_string()),
        training_certifications: Some("certifications".to_string()),
        training_type: Some("type".to_string()),
        unnamed_organization: Some(true),
        ..item("item1", "Category 1", "Subcategory 1")
    };
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![item],
    };
    let full = Full::new(
        &landscape_data,
        &CrunchbaseData::default(),
        &GithubData::default(),
    );

    // Run the full dataset serialization
    let value = serde_json::to_value(&full).unwrap();

    // Check the item is serialized without the API only fields
    let item_value = &value["items"][0];
    assert_eq!(item_value["id"], json!("item1"));
    for field in [
        "annotations",
        "chat_channel",
        "latest_annual_review_at",
        "latest_annual_review_url",
        "lfx_slug",
        "training_certifications",
        "training_type",
        "unnamed_organization",
    ] {
        assert_eq!(item_value.get(field), None, "field: {field}");
    }
}

#[test]
fn test_full_new_builds_full_dataset() {
    // Setup landscape data, crunchbase data and github data
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

    // Run the full dataset creation
    let full = Full::new(&landscape_data, &crunchbase_data, &github_data);

    // Check the full dataset holds the items and external data
    let expected_full = Full {
        crunchbase_data,
        github_data,
        items: vec![item],
    };
    pretty_assertions::assert_eq!(full, expected_full);
}

// Helpers.

/// Shared embed keys fixture, also used by the UI embed keys tests.
const EMBED_KEYS_FIXTURE: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../ui/common/src/embed/__fixtures__/embed-keys.json"
));

/// Shared embed keys fixture case.
#[derive(Debug, Deserialize)]
struct EmbedKeyCase {
    /// Classification of the view (`category`, `maturity` or `tag`).
    classify: String,
    /// Name of the file fetched by the embed for the key.
    file: String,
    /// Embed key built by the UI.
    key: String,

    /// Name of the category, for category views.
    category: Option<String>,
    /// Name of the subcategory, for subcategory views.
    subcategory: Option<String>,
    /// Maturity or TAG value, for option views (`None` for the all view).
    value: Option<String>,
}

/// Return a data category with the subcategories provided, setting their
/// normalized names.
fn category(name: &str, subcategories: &[&str]) -> data::Category {
    data::Category {
        name: name.to_string(),
        normalized_name: normalize_name(name),
        subcategories: subcategories
            .iter()
            .map(|subcategory| Subcategory {
                name: (*subcategory).to_string(),
                normalized_name: normalize_name(subcategory),
            })
            .collect(),
    }
}

/// Return an embed classification option.
fn classification_option(name: &str, normalized_name: &str) -> ClassificationOption {
    ClassificationOption {
        name: name.to_string(),
        normalized_name: normalized_name.to_string(),
    }
}

/// Return games data with a quiz with one valid question.
fn games_with_one_question() -> LandscapeGames {
    LandscapeGames {
        quiz: Some(Quiz {
            questions: vec![Question {
                options: vec![
                    QuestionOption {
                        item: "project".to_string(),
                        correct: true,
                        ..Default::default()
                    },
                    QuestionOption {
                        item: "member".to_string(),
                        ..Default::default()
                    },
                ],
                title: "Question 1".to_string(),
            }],
        }),
    }
}

/// Return a data item with the id provided (also used as its name) in the
/// category and subcategory given.
fn item(id: &str, category: &str, subcategory: &str) -> data::Item {
    data::Item {
        category: category.to_string(),
        homepage_url: format!("https://{id}.url"),
        id: id.to_string(),
        logo: format!("{id}.svg"),
        name: id.to_string(),
        subcategory: subcategory.to_string(),
        ..Default::default()
    }
}

/// Return the embed views keys, sorted.
fn sorted_keys(embed: &Embed) -> Vec<&str> {
    let mut keys: Vec<&str> = embed.views.keys().map(String::as_str).collect();
    keys.sort_unstable();
    keys
}

/// Return valid landscape settings without any optional setting.
fn valid_settings() -> LandscapeSettings {
    LandscapeSettings {
        foundation: "Foundation".to_string(),
        url: "https://landscape.url".to_string(),
        ..Default::default()
    }
}

/// Return the ids of the items in the embed view with the key provided.
fn view_item_ids<'a>(embed: &'a Embed, key: &str) -> Vec<&'a str> {
    embed.views[key].items.iter().map(|item| item.id.as_str()).collect()
}

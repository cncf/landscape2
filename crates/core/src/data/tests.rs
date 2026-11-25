use std::fs;

use crate::settings::{
    self, EndUserRule, FeaturedItemField, FeaturedItemRule, FeaturedItemRuleExclude, FeaturedItemRuleOption,
    TagRule,
};

use super::*;

/// Name of the data file served by the mock server.
const DATA_FILE: &str = "data.yml";

/// Landscape data fixture using the `categories` alias.
const TESTS_DATA_CATEGORIES_ALIAS_FILE: &str = "src/testdata/data_categories_alias.yml";

/// Landscape data fixture.
const TESTS_DATA_FILE: &str = "src/testdata/data.yml";

#[test]
fn test_data_source_new_from_url_sets_data_url() {
    let url = "https://example.url/data.yml";
    let src = DataSource::new_from_url(url.to_string());
    assert_eq!(
        src,
        DataSource {
            data_file: None,
            data_url: Some(url.to_string()),
        }
    );
}

#[tokio::test]
async fn test_landscape_data_new_loads_url() {
    // Setup data file server
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", format!("/{DATA_FILE}").as_str())
        .with_status(200)
        .with_body_from_file(TESTS_DATA_FILE)
        .create_async()
        .await;

    // Run the data load from the url source
    let src = DataSource::new_from_url(format!("{}/{DATA_FILE}", server.url()));
    let landscape_data = LandscapeData::new(&src).await.unwrap();

    // Check the data was parsed and that the data file was requested
    assert_eq!(landscape_data.items.len(), 3);
    mock.assert_async().await;
}

#[tokio::test]
async fn test_landscape_data_new_rejects_missing_source() {
    let src = DataSource::default();
    let err = LandscapeData::new(&src).await.unwrap_err();
    assert_eq!(format!("{err:#}"), "data file or url not provided");
}

#[test]
fn test_enrich_keeps_homepage_when_it_differs_from_repository() {
    // Setup an item whose homepage differs from its primary repository url
    let crunchbase_url = "https://crunchbase.url/test".to_string();
    let mut landscape_data = LandscapeData {
        categories: vec![],
        items: vec![Item {
            homepage_url: "https://homepage.url".to_string(),
            website: "https://homepage.url".to_string(),
            crunchbase_url: Some(crunchbase_url.clone()),
            repositories: Some(vec![Repository {
                url: "https://repository.url".to_string(),
                primary: Some(true),
                ..Default::default()
            }]),
            ..Default::default()
        }],
    };

    // Setup Crunchbase data with a homepage for the item organization
    let crunchbase_data = CrunchbaseData::from([(
        crunchbase_url,
        Organization {
            homepage_url: Some("https://crunchbase-homepage.url".to_string()),
            ..Default::default()
        },
    )]);

    // Run the enrichment
    landscape_data.enrich(
        &LandscapeSettings::default(),
        &crunchbase_data,
        &GithubData::default(),
    );

    // Check the item homepage is kept as the website
    assert_eq!(landscape_data.items[0].website, "https://homepage.url");
}

#[test]
fn test_enrich_keeps_homepage_without_crunchbase_homepage() {
    // Setup an item whose homepage is its primary repository url
    let crunchbase_url = "https://crunchbase.url/test".to_string();
    let mut landscape_data = LandscapeData {
        categories: vec![],
        items: vec![Item {
            homepage_url: "https://repository.url".to_string(),
            website: "https://repository.url".to_string(),
            crunchbase_url: Some(crunchbase_url.clone()),
            repositories: Some(vec![Repository {
                url: "https://repository.url".to_string(),
                primary: Some(true),
                ..Default::default()
            }]),
            ..Default::default()
        }],
    };

    // Setup Crunchbase data without a homepage for the item organization
    let crunchbase_data = CrunchbaseData::from([(
        crunchbase_url,
        Organization {
            name: Some("Organization".to_string()),
            ..Default::default()
        },
    )]);

    // Run the enrichment
    landscape_data.enrich(
        &LandscapeSettings::default(),
        &crunchbase_data,
        &GithubData::default(),
    );

    // Check the item homepage is kept as the website
    assert_eq!(landscape_data.items[0].website, "https://repository.url");
}

#[test]
fn test_landscape_data_enrich_resolves_items_description() {
    // Setup an item without description whose primary repository GitHub
    // description is empty
    let crunchbase_url = "https://crunchbase.url/test".to_string();
    let repository_url = "https://repository.url".to_string();
    let mut landscape_data = LandscapeData {
        categories: vec![],
        items: vec![Item {
            crunchbase_url: Some(crunchbase_url.clone()),
            repositories: Some(vec![Repository {
                url: repository_url.clone(),
                primary: Some(true),
                ..Default::default()
            }]),
            ..Default::default()
        }],
    };

    // Setup the Crunchbase and GitHub data collected for the item
    let crunchbase_data = CrunchbaseData::from([(
        crunchbase_url,
        Organization {
            description: Some("crunchbase description".to_string()),
            ..Default::default()
        },
    )]);
    let github_data = GithubData::from([(
        repository_url,
        RepositoryGithubData {
            description: String::new(),
            ..Default::default()
        },
    )]);

    // Run the enrichment twice to check it is idempotent
    let settings = LandscapeSettings::default();
    landscape_data.enrich(&settings, &crunchbase_data, &github_data);
    landscape_data.enrich(&settings, &crunchbase_data, &github_data);

    // Check the item description is the Crunchbase description
    assert_eq!(
        landscape_data.items[0].description,
        Some("crunchbase description".to_string())
    );
}

#[test]
fn test_landscape_data_new_from_yaml_adds_not_valid_context() {
    // Setup data that is valid except for an empty category name
    let raw = r#"
landscape:
  - category:
    name: " "
    subcategories:
      - subcategory:
        name: Subcategory
        items:
          - item:
            homepage_url: https://example.com
            logo: logo.svg
            name: Item
"#;

    // Run the parsing and check the error
    let err = LandscapeData::new_from_yaml(raw).unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "the landscape data file provided is not valid: category [0] name is required"
    );
}

#[test]
fn test_landscape_data_new_from_yaml_ignores_legacy_marker_keys() {
    let raw = fs::read_to_string(TESTS_DATA_FILE).unwrap();
    let parsed = LandscapeData::new_from_yaml(&raw).unwrap();
    assert_eq!(parsed.warnings, Vec::<String>::new());
}

#[test]
fn test_landscape_data_new_from_yaml_parses_categories_alias_fixture() {
    // Run the parsing of the fixture using the categories alias
    let raw = fs::read_to_string(TESTS_DATA_CATEGORIES_ALIAS_FILE).unwrap();
    let parsed = LandscapeData::new_from_yaml(&raw).unwrap();

    // Check the categories and items were parsed without warnings
    let category_names: Vec<&str> = parsed.value.categories.iter().map(|c| c.name.as_str()).collect();
    assert_eq!(category_names, ["Category 1", "Category 2"]);
    let item_ids: Vec<&str> = parsed.value.items.iter().map(|i| i.id.as_str()).collect();
    assert_eq!(
        item_ids,
        [
            "category-1--subcategory-1-1--item-1",
            "category-2--subcategory-2-1--item-2"
        ]
    );
    assert_eq!(parsed.warnings, Vec::<String>::new());
}

#[test]
fn test_landscape_data_new_from_yaml_parses_fixture() {
    // Run the parsing of the data fixture
    let raw = fs::read_to_string(TESTS_DATA_FILE).unwrap();
    let landscape_data = LandscapeData::new_from_yaml(&raw).unwrap().value;

    // Check the categories
    let category_names: Vec<&str> = landscape_data.categories.iter().map(|c| c.name.as_str()).collect();
    assert_eq!(category_names, ["Category 1", "Category 2"]);

    // Check the first item identity, website, repositories and summary
    let item = &landscape_data.items[0];
    assert_eq!(item.id, "category-1--subcategory-1-1--item-1");
    assert_eq!(item.website, "https://cncf.io");
    assert_eq!(
        item.repositories,
        Some(vec![Repository {
            url: "https://github.com/cncf/landscape2".to_string(),
            branch: None,
            github_data: None,
            license: None,
            primary: Some(true),
        }])
    );
    assert_eq!(
        item.summary,
        Some(ItemSummary {
            intro_url: Some("https://example.com/item-1-intro".to_string()),
            personas: Some(vec!["Developer".to_string(), "Operator".to_string()]),
            use_case: Some("Item 1 use case".to_string()),
            ..Default::default()
        })
    );

    // Check the third item additional categories and repositories
    let item = &landscape_data.items[2];
    assert_eq!(item.id, "category-2--subcategory-2-1--item-3");
    assert_eq!(
        item.additional_categories,
        Some(vec![AdditionalCategory {
            category: "Category 1".to_string(),
            subcategory: "Subcategory 1-1".to_string(),
        }])
    );
    assert_eq!(
        item.repositories,
        Some(vec![
            Repository {
                url: "https://github.com/example/item-3".to_string(),
                branch: Some("main".to_string()),
                github_data: None,
                license: Some("Apache-2.0".to_string()),
                primary: Some(true),
            },
            Repository {
                url: "https://github.com/example/item-3-extra".to_string(),
                branch: Some("develop".to_string()),
                github_data: None,
                license: Some("MIT".to_string()),
                primary: Some(false),
            },
        ])
    );

    // Check the third item extra information, audits, links, summary and tags
    assert_eq!(item.accepted_at, NaiveDate::from_ymd_opt(2022, 3, 1));
    assert_eq!(
        item.audits,
        Some(vec![ItemAudit {
            date: NaiveDate::from_ymd_opt(2023, 5, 10).unwrap(),
            kind: "security".to_string(),
            url: "https://example.com/item-3-audit".to_string(),
            vendor: "Audit vendor".to_string(),
        }])
    );
    assert_eq!(item.enduser, Some(false));
    assert_eq!(item.incubating_at, NaiveDate::from_ymd_opt(2023, 6, 1));
    assert_eq!(item.joined_at, NaiveDate::from_ymd_opt(2021, 1, 15));
    assert_eq!(item.latest_annual_review_at, NaiveDate::from_ymd_opt(2023, 3, 1));
    assert_eq!(
        item.latest_annual_review_url.as_deref(),
        Some("https://example.com/item-3-annual-review")
    );
    assert_eq!(
        item.other_links,
        Some(vec![ItemLink {
            name: "Contact".to_string(),
            url: "mailto:item-3@example.com".to_string(),
        }])
    );
    assert_eq!(
        item.summary,
        Some(ItemSummary {
            business_use_case: Some("Item 3 business use case".to_string()),
            integrations: Some("Item 1, Item 2".to_string()),
            release_rate: Some("Every 3 months".to_string()),
            tags: Some(vec!["security".to_string(), "observability".to_string()]),
            ..Default::default()
        })
    );
    assert_eq!(item.tag, Some(vec!["observability".to_string()]));
}

#[test]
fn test_landscape_data_new_from_yaml_rejects_invalid_yaml() {
    let err = LandscapeData::new_from_yaml("landscape: [").unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "the landscape data file provided is not valid: invalid yaml file: did not find expected node content at line 2 column 1, while parsing a flow node"
    );
}

#[test]
fn test_landscape_data_new_from_yaml_reports_yaml_and_validation_warnings() {
    // Setup data with both an unknown key and an unknown second path subcategory
    let raw = r"
landscape:
  - category:
    name: Category 1
    subcategories:
      - subcategory:
        name: Subcategory 1
        items:
          - item:
            homepage_url: https://example.com
            logo: logo.svg
            name: Item 1
            organization: Organization
            second_path:
              - Category 1 / Unknown
";

    // Run the parsing and check both warning sources are returned in order
    let parsed = LandscapeData::new_from_yaml(raw).unwrap();
    assert_eq!(
        parsed.warnings,
        vec![
            "unknown key `landscape[].subcategories[].items[].organization` (found once, at landscape.0.subcategories.0.items.0.organization)",
            "item [Item 1] (category: [Category 1] | subcategory: [Subcategory 1]): \
             second path entry [Category 1 / Unknown] references unknown subcategory [Unknown] in category [Category 1]",
        ]
    );
}

#[test]
fn test_landscape_data_new_from_yaml_warns_on_unknown_key() {
    // Setup data with an unknown key in every item
    let raw = r"
landscape:
  - category:
    name: Category
    subcategories:
      - subcategory:
        name: Subcategory
        items:
          - item:
            homepage_url: https://example.com
            logo: logo.svg
            name: Item 1
            organization: Organization
          - item:
            homepage_url: https://example.com
            logo: logo.svg
            name: Item 2
            organization: Organization
";

    // Run the parsing and check the unknown key is reported once
    let parsed = LandscapeData::new_from_yaml(raw).unwrap();
    assert_eq!(
        parsed.warnings,
        vec![
            "unknown key `landscape[].subcategories[].items[].organization` (found 2 times, first at landscape.0.subcategories.0.items.0.organization)"
        ]
    );
}

#[test]
fn test_landscape_data_new_from_yaml_warns_on_unknown_second_path_subcategory() {
    // Setup data with a second path referencing an undefined subcategory
    let raw = r"
landscape:
  - category:
    name: Category 1
    subcategories:
      - subcategory:
        name: Subcategory 1
        items:
          - item:
            homepage_url: https://example.com
            logo: logo.svg
            name: Item 1
            second_path:
              - Category 2 / Unknown
  - category:
    name: Category 2
    subcategories:
      - subcategory:
        name: Subcategory 2
        items: []
";

    // Run the parsing and check the warning is reported while keeping the entry
    let parsed = LandscapeData::new_from_yaml(raw).unwrap();
    assert_eq!(
        parsed.warnings,
        vec![
            "item [Item 1] (category: [Category 1] | subcategory: [Subcategory 1]): \
             second path entry [Category 2 / Unknown] references unknown subcategory [Unknown] in category [Category 2]"
        ]
    );
    assert_eq!(
        parsed.value.items[0].additional_categories,
        Some(vec![AdditionalCategory {
            category: "Category 2".to_string(),
            subcategory: "Unknown".to_string(),
        }])
    );
}

#[test]
fn test_landscape_data_add_crunchbase_data_sets_matching_organization() {
    // Setup landscape data with an item with a crunchbase url
    let mut landscape_data = LandscapeData::default();
    let crunchbase_url = "https://crunchbase.url/test".to_string();
    landscape_data.items.push(Item {
        crunchbase_url: Some(crunchbase_url.clone()),
        ..Default::default()
    });

    // Setup crunchbase data for that url
    let mut crunchbase_data = CrunchbaseData::default();
    let org = Organization {
        name: Some("test".to_string()),
        ..Default::default()
    };
    crunchbase_data.insert(crunchbase_url, org.clone());

    // Run the enrichment and check the item organization data
    landscape_data.add_crunchbase_data(&crunchbase_data);
    assert_eq!(landscape_data.items[0].crunchbase_data, Some(org));
}

#[test]
fn test_add_crunchbase_data_skips_unknown_url() {
    // Setup landscape data with an item with a crunchbase url
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        crunchbase_url: Some("https://crunchbase.url/unknown".to_string()),
        ..Default::default()
    });

    // Setup crunchbase data for another url
    let crunchbase_data = CrunchbaseData::from([(
        "https://crunchbase.url/other".to_string(),
        Organization {
            name: Some("other".to_string()),
            ..Default::default()
        },
    )]);

    // Run the enrichment and check the item has no organization data
    landscape_data.add_crunchbase_data(&crunchbase_data);
    assert_eq!(landscape_data.items[0].crunchbase_data, None);
}

#[test]
fn test_landscape_data_add_featured_items_data_ignores_missing_settings() {
    // Setup landscape data with a graduated item
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        subcategory: "Subcategory".to_string(),
        maturity: Some("graduated".to_string()),
        ..Default::default()
    });

    // Run the enrichment without featured items settings
    landscape_data.add_featured_items_data(&LandscapeSettings::default());

    // Check the item is not featured
    assert_eq!(landscape_data.items[0].featured, None);
}

#[test]
fn test_landscape_data_add_featured_items_data_last_matching_rule_wins() {
    // Setup landscape data with a graduated item in a subcategory
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        subcategory: "Subcategory".to_string(),
        maturity: Some("graduated".to_string()),
        ..Default::default()
    });

    // Setup settings with a maturity rule and a later subcategory rule, both
    // matching the item
    let settings = LandscapeSettings {
        featured_items: Some(vec![
            FeaturedItemRule {
                field: FeaturedItemField::Maturity,
                options: vec![FeaturedItemRuleOption {
                    value: "graduated".to_string(),
                    label: Some("Graduated".to_string()),
                    order: Some(1),
                }],
                exclude: None,
            },
            FeaturedItemRule {
                field: FeaturedItemField::Subcategory,
                options: vec![FeaturedItemRuleOption {
                    value: "Subcategory".to_string(),
                    label: Some("VIP category".to_string()),
                    order: Some(2),
                }],
                exclude: None,
            },
        ]),
        ..Default::default()
    };

    // Run the enrichment
    landscape_data.add_featured_items_data(&settings);

    // Check the last matching rule set the featured data
    assert_eq!(
        landscape_data.items[0].featured,
        Some(ItemFeatured {
            excluded_groups: None,
            label: Some("VIP category".to_string()),
            order: Some(2),
        })
    );
}

#[test]
fn test_landscape_data_add_featured_items_data_matches_maturity() {
    // Setup landscape data with a graduated item
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        maturity: Some("graduated".to_string()),
        ..Default::default()
    });

    // Setup settings featuring graduated items
    let settings = LandscapeSettings {
        featured_items: Some(vec![FeaturedItemRule {
            field: FeaturedItemField::Maturity,
            options: vec![FeaturedItemRuleOption {
                value: "graduated".to_string(),
                label: Some("Graduated".to_string()),
                order: Some(1),
            }],
            exclude: None,
        }]),
        ..Default::default()
    };

    // Run the enrichment and check the item featured data
    landscape_data.add_featured_items_data(&settings);
    assert_eq!(
        landscape_data.items[0].featured,
        Some(ItemFeatured {
            excluded_groups: None,
            label: Some("Graduated".to_string()),
            order: Some(1),
        })
    );
}

#[test]
fn test_landscape_data_add_featured_items_data_matches_primary_subcategory() {
    // Setup landscape data with an item in the featured subcategory and another
    // one listed there only as an additional category
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        name: "Primary".to_string(),
        subcategory: "Subcategory".to_string(),
        ..Default::default()
    });
    landscape_data.items.push(Item {
        name: "Additional".to_string(),
        subcategory: "Other subcategory".to_string(),
        additional_categories: Some(vec![AdditionalCategory {
            category: "Category".to_string(),
            subcategory: "Subcategory".to_string(),
        }]),
        ..Default::default()
    });

    // Setup settings featuring items in that subcategory
    let settings = LandscapeSettings {
        featured_items: Some(vec![FeaturedItemRule {
            field: FeaturedItemField::Subcategory,
            options: vec![FeaturedItemRuleOption {
                value: "Subcategory".to_string(),
                label: Some("VIP category".to_string()),
                order: Some(1),
            }],
            exclude: None,
        }]),
        ..Default::default()
    };

    // Run the enrichment
    landscape_data.add_featured_items_data(&settings);

    // Check only the item whose primary subcategory matches is featured
    assert_eq!(
        landscape_data.items[0].featured,
        Some(ItemFeatured {
            excluded_groups: None,
            label: Some("VIP category".to_string()),
            order: Some(1),
        })
    );
    assert_eq!(landscape_data.items[1].featured, None);
}

#[test]
fn test_landscape_data_add_featured_items_data_sets_normalized_excluded_groups() {
    // Setup landscape data with a graduated item
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        maturity: Some("graduated".to_string()),
        ..Default::default()
    });

    // Setup settings featuring graduated items, except in two groups
    let settings = LandscapeSettings {
        featured_items: Some(vec![FeaturedItemRule {
            field: FeaturedItemField::Maturity,
            options: vec![FeaturedItemRuleOption {
                value: "graduated".to_string(),
                label: Some("Graduated".to_string()),
                order: Some(1),
            }],
            exclude: Some(FeaturedItemRuleExclude {
                groups: Some(vec!["Group One".to_string(), "Group (2)".to_string()]),
            }),
        }]),
        ..Default::default()
    };

    // Run the enrichment
    landscape_data.add_featured_items_data(&settings);

    // Check the excluded groups are stored with their normalized names
    assert_eq!(
        landscape_data.items[0].featured,
        Some(ItemFeatured {
            excluded_groups: Some(vec!["group-one".to_string(), "group-2".to_string()]),
            label: Some("Graduated".to_string()),
            order: Some(1),
        })
    );
}

#[test]
fn test_landscape_data_add_featured_items_data_skips_non_matching_item() {
    // Setup landscape data with a sandbox item
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        maturity: Some("sandbox".to_string()),
        ..Default::default()
    });

    // Setup settings featuring graduated items only
    let settings = LandscapeSettings {
        featured_items: Some(vec![FeaturedItemRule {
            field: FeaturedItemField::Maturity,
            options: vec![FeaturedItemRuleOption {
                value: "graduated".to_string(),
                label: Some("Graduated".to_string()),
                order: Some(1),
            }],
            exclude: None,
        }]),
        ..Default::default()
    };

    // Run the enrichment and check the item is not featured
    landscape_data.add_featured_items_data(&settings);
    assert_eq!(landscape_data.items[0].featured, None);
}

#[test]
fn test_add_github_data_enriches_additional_repositories() {
    // Setup landscape data with an item with a primary and an additional repository
    let mut landscape_data = LandscapeData::default();
    let primary_repository = Repository {
        url: "https://repo.url/primary".to_string(),
        primary: Some(true),
        ..Default::default()
    };
    let additional_repository = Repository {
        url: "https://repo.url/additional".to_string(),
        primary: Some(false),
        ..Default::default()
    };
    landscape_data.items.push(Item {
        repositories: Some(vec![primary_repository.clone(), additional_repository.clone()]),
        ..Default::default()
    });

    // Setup github data for both repositories
    let primary_github_data = RepositoryGithubData {
        description: "primary".to_string(),
        ..Default::default()
    };
    let additional_github_data = RepositoryGithubData {
        description: "additional".to_string(),
        ..Default::default()
    };
    let github_data = GithubData::from([
        (primary_repository.url.clone(), primary_github_data.clone()),
        (additional_repository.url.clone(), additional_github_data.clone()),
    ]);

    // Run the enrichment
    landscape_data.add_github_data(&github_data);

    // Check both repositories got their github data
    assert_eq!(
        landscape_data.items[0].repositories,
        Some(vec![
            Repository {
                github_data: Some(primary_github_data),
                ..primary_repository
            },
            Repository {
                github_data: Some(additional_github_data),
                ..additional_repository
            },
        ])
    );
}

#[test]
fn test_add_github_data_leaves_oss_unset_without_primary_repository() {
    // Setup landscape data with an item with a licensed non primary repository
    let mut landscape_data = LandscapeData::default();
    let repository = Repository {
        url: "https://repo.url/test".to_string(),
        license: Some("Apache-2.0".to_string()),
        primary: Some(false),
        ..Default::default()
    };
    landscape_data.items.push(Item {
        repositories: Some(vec![repository.clone()]),
        ..Default::default()
    });

    // Setup github data with a license for that repository
    let repository_github_data = RepositoryGithubData {
        license: Some("Apache-2.0".to_string()),
        ..Default::default()
    };
    let github_data = GithubData::from([(repository.url.clone(), repository_github_data.clone())]);

    // Run the enrichment
    landscape_data.add_github_data(&github_data);

    // Check the repository got its github data but the oss flag is not set
    assert_eq!(
        landscape_data.items[0].repositories,
        Some(vec![Repository {
            github_data: Some(repository_github_data),
            ..repository
        }])
    );
    assert_eq!(landscape_data.items[0].oss, None);
}

#[test]
fn test_add_github_data_sets_oss_from_repository_license() {
    // Setup landscape data with an item with a licensed primary repository
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        repositories: Some(vec![Repository {
            url: "https://repo.url/test".to_string(),
            license: Some("Apache-2.0".to_string()),
            primary: Some(true),
            ..Default::default()
        }]),
        ..Default::default()
    });

    // Run the enrichment without github data
    landscape_data.add_github_data(&GithubData::default());

    // Check the item oss flag is set from the repository license
    assert_eq!(landscape_data.items[0].oss, Some(true));
}

#[test]
fn test_landscape_data_add_github_data_sets_repository_data_and_oss() {
    // Setup landscape data with an item with a primary repository
    let mut landscape_data = LandscapeData::default();
    let repository_url = "https://repo.url/test".to_string();
    let repository = Repository {
        url: repository_url.clone(),
        primary: Some(true),
        ..Default::default()
    };
    landscape_data.items.push(Item {
        repositories: Some(vec![repository.clone()]),
        ..Default::default()
    });

    // Setup github data with a license for that repository
    let mut github_data = GithubData::default();
    let repository_github_data = RepositoryGithubData {
        description: "test".to_string(),
        license: Some("Apache-2.0".to_string()),
        ..Default::default()
    };
    github_data.insert(repository_url.clone(), repository_github_data.clone());

    // Run the enrichment
    landscape_data.add_github_data(&github_data);

    // Check the repository github data and the item oss flag
    assert_eq!(
        landscape_data.items[0].repositories,
        Some(vec![Repository {
            github_data: Some(repository_github_data),
            ..repository
        }])
    );
    assert_eq!(landscape_data.items[0].oss, Some(true));
}

#[test]
fn test_add_github_data_skips_repository_missing_from_github_data() {
    // Setup landscape data with an item with a primary repository
    let mut landscape_data = LandscapeData::default();
    let repository = Repository {
        url: "https://repo.url/test".to_string(),
        primary: Some(true),
        ..Default::default()
    };
    landscape_data.items.push(Item {
        repositories: Some(vec![repository.clone()]),
        ..Default::default()
    });

    // Setup github data for another repository
    let github_data = GithubData::from([(
        "https://repo.url/other".to_string(),
        RepositoryGithubData {
            license: Some("Apache-2.0".to_string()),
            ..Default::default()
        },
    )]);

    // Run the enrichment
    landscape_data.add_github_data(&github_data);

    // Check the repository is unchanged and the oss flag is not set
    assert_eq!(landscape_data.items[0].repositories, Some(vec![repository]));
    assert_eq!(landscape_data.items[0].oss, None);
}

#[test]
fn test_add_member_subcategory_ignores_missing_members_category() {
    // Setup a member item and another item sharing its crunchbase url
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        category: "Members".to_string(),
        subcategory: "Member subcategory".to_string(),
        crunchbase_url: Some("https://crunchbase.url/test".to_string()),
        ..Default::default()
    });
    landscape_data.items.push(Item {
        category: "Other category".to_string(),
        crunchbase_url: Some("https://crunchbase.url/test".to_string()),
        ..Default::default()
    });

    // Run the enrichment without a members category
    landscape_data.add_member_subcategory(None);

    // Check no item got a member subcategory
    assert!(landscape_data.items.iter().all(|item| item.member_subcategory.is_none()));
}

#[test]
fn test_landscape_data_add_member_subcategory_sets_member_subcategory() {
    // Setup a member item and another item sharing its crunchbase url
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        category: "Members".to_string(),
        subcategory: "Member subcategory".to_string(),
        crunchbase_url: Some("https://crunchbase.url/test".to_string()),
        ..Default::default()
    });
    landscape_data.items.push(Item {
        category: "Other category".to_string(),
        crunchbase_url: Some("https://crunchbase.url/test".to_string()),
        ..Default::default()
    });

    // Run the enrichment and check the other item member subcategory
    landscape_data.add_member_subcategory(Some("Members"));
    assert_eq!(
        landscape_data.items[1].member_subcategory,
        Some("Member subcategory".to_string())
    );
}

#[test]
fn test_landscape_data_add_tags_keeps_existing_item_tag() {
    // Setup landscape data with a project that already has a TAG
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        category: "Category".to_string(),
        maturity: Some("graduated".to_string()),
        tag: Some(vec!["tag2".to_string()]),
        ..Default::default()
    });

    // Setup settings with a TAG rule matching the item category
    let mut tags = BTreeMap::new();
    tags.insert(
        "tag1".to_string(),
        vec![TagRule {
            category: "Category".to_string(),
            ..Default::default()
        }],
    );
    let settings = LandscapeSettings {
        tags: Some(tags),
        ..Default::default()
    };

    // Run the enrichment and check the item TAG is kept
    landscape_data.add_tags(&settings);
    assert_eq!(landscape_data.items[0].tag, Some(vec!["tag2".to_string()]));
}

#[test]
fn test_landscape_data_add_tags_matches_category() {
    // Setup landscape data with a project in a category
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        category: "Category".to_string(),
        maturity: Some("graduated".to_string()),
        ..Default::default()
    });

    // Setup settings with a TAG rule matching the whole category
    let mut tags = BTreeMap::new();
    tags.insert(
        "tag1".to_string(),
        vec![TagRule {
            category: "Category".to_string(),
            subcategories: None,
        }],
    );
    let settings = LandscapeSettings {
        tags: Some(tags),
        ..Default::default()
    };

    // Run the enrichment and check the item TAG
    landscape_data.add_tags(&settings);
    assert_eq!(landscape_data.items[0].tag, Some(vec!["tag1".to_string()]));
}

#[test]
fn test_landscape_data_add_tags_matches_subcategory() {
    // Setup landscape data with a project in a subcategory
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        category: "Category".to_string(),
        subcategory: "Subcategory".to_string(),
        maturity: Some("graduated".to_string()),
        ..Default::default()
    });

    // Setup settings with a TAG rule matching the subcategory
    let mut tags = BTreeMap::new();
    tags.insert(
        "tag1".to_string(),
        vec![TagRule {
            category: "Category".to_string(),
            subcategories: Some(vec!["Subcategory".to_string()]),
        }],
    );
    let settings = LandscapeSettings {
        tags: Some(tags),
        ..Default::default()
    };

    // Run the enrichment and check the item TAG
    landscape_data.add_tags(&settings);
    assert_eq!(landscape_data.items[0].tag, Some(vec!["tag1".to_string()]));
}

#[test]
fn test_landscape_data_add_tags_skips_items_without_maturity() {
    // Setup landscape data with an item that is not a project
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        category: "Category".to_string(),
        ..Default::default()
    });

    // Setup settings with a TAG rule matching the item category
    let mut tags = BTreeMap::new();
    tags.insert(
        "tag1".to_string(),
        vec![TagRule {
            category: "Category".to_string(),
            ..Default::default()
        }],
    );
    let settings = LandscapeSettings {
        tags: Some(tags),
        ..Default::default()
    };

    // Run the enrichment and check no TAG was set
    landscape_data.add_tags(&settings);
    assert_eq!(landscape_data.items[0].tag, None);
}

#[test]
fn test_add_tags_skips_non_matching_rule() {
    // Setup landscape data with a project in a category
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        category: "Category".to_string(),
        maturity: Some("graduated".to_string()),
        ..Default::default()
    });

    // Setup settings with a TAG rule matching another category
    let tags = BTreeMap::from([(
        "tag1".to_string(),
        vec![TagRule {
            category: "Other category".to_string(),
            subcategories: None,
        }],
    )]);
    let settings = LandscapeSettings {
        tags: Some(tags),
        ..Default::default()
    };

    // Run the enrichment and check no TAG was set
    landscape_data.add_tags(&settings);
    assert_eq!(landscape_data.items[0].tag, None);
}

#[test]
fn test_add_tags_skips_subcategory_mismatch() {
    // Setup landscape data with a project in a subcategory
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        category: "Category".to_string(),
        subcategory: "Subcategory".to_string(),
        maturity: Some("graduated".to_string()),
        ..Default::default()
    });

    // Setup settings with a TAG rule matching another subcategory of the
    // same category
    let tags = BTreeMap::from([(
        "tag1".to_string(),
        vec![TagRule {
            category: "Category".to_string(),
            subcategories: Some(vec!["Other subcategory".to_string()]),
        }],
    )]);
    let settings = LandscapeSettings {
        tags: Some(tags),
        ..Default::default()
    };

    // Run the enrichment and check no TAG was set
    landscape_data.add_tags(&settings);
    assert_eq!(landscape_data.items[0].tag, None);
}

#[test]
fn test_add_tags_uses_first_tag_in_name_order() {
    // Setup landscape data with a project in a category
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        category: "Category".to_string(),
        maturity: Some("graduated".to_string()),
        ..Default::default()
    });

    // Setup settings with two TAGs whose rules match the item, the one first
    // in name order inserted last
    let mut tags = BTreeMap::new();
    for tag in ["tag-b", "tag-a"] {
        tags.insert(
            tag.to_string(),
            vec![TagRule {
                category: "Category".to_string(),
                subcategories: None,
            }],
        );
    }
    let settings = LandscapeSettings {
        tags: Some(tags),
        ..Default::default()
    };

    // Run the enrichment and check the first TAG in name order was set
    landscape_data.add_tags(&settings);
    assert_eq!(landscape_data.items[0].tag, Some(vec!["tag-a".to_string()]));
}

#[test]
fn test_landscape_data_set_enduser_flag_keeps_existing_item_flag() {
    // Setup landscape data with an item that already has the enduser flag
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        category: "Category".to_string(),
        enduser: Some(false),
        maturity: Some("graduated".to_string()),
        ..Default::default()
    });

    // Setup settings with an enduser rule matching the item category
    let enduser = Some(vec![EndUserRule {
        category: "Category".to_string(),
        subcategories: None,
    }]);
    let settings = LandscapeSettings {
        enduser,
        ..Default::default()
    };

    // Run the enrichment and check the item flag is kept
    landscape_data.set_enduser_flag(&settings);
    assert_eq!(landscape_data.items[0].enduser, Some(false));
}

#[test]
fn test_landscape_data_set_enduser_flag_matches_category() {
    // Setup landscape data with an item in a category
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        category: "Category".to_string(),
        maturity: Some("graduated".to_string()),
        ..Default::default()
    });

    // Setup settings with an enduser rule matching the whole category
    let enduser = Some(vec![EndUserRule {
        category: "Category".to_string(),
        subcategories: None,
    }]);
    let settings = LandscapeSettings {
        enduser,
        ..Default::default()
    };

    // Run the enrichment and check the item flag
    landscape_data.set_enduser_flag(&settings);
    assert_eq!(landscape_data.items[0].enduser, Some(true));
}

#[test]
fn test_landscape_data_set_enduser_flag_matches_subcategory() {
    // Setup landscape data with an item in a subcategory
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        category: "Category".to_string(),
        subcategory: "Subcategory".to_string(),
        maturity: Some("graduated".to_string()),
        ..Default::default()
    });

    // Setup settings with an enduser rule matching the subcategory
    let enduser = Some(vec![EndUserRule {
        category: "Category".to_string(),
        subcategories: Some(vec!["Subcategory".to_string()]),
    }]);
    let settings = LandscapeSettings {
        enduser,
        ..Default::default()
    };

    // Run the enrichment and check the item flag
    landscape_data.set_enduser_flag(&settings);
    assert_eq!(landscape_data.items[0].enduser, Some(true));
}

#[test]
fn test_set_enduser_flag_skips_non_matching_rule() {
    // Setup landscape data with an item in a subcategory
    let mut landscape_data = LandscapeData::default();
    landscape_data.items.push(Item {
        category: "Category".to_string(),
        subcategory: "Subcategory".to_string(),
        ..Default::default()
    });

    // Setup settings with enduser rules matching another category and another
    // subcategory of the item category
    let enduser = Some(vec![
        EndUserRule {
            category: "Other category".to_string(),
            subcategories: None,
        },
        EndUserRule {
            category: "Category".to_string(),
            subcategories: Some(vec!["Other subcategory".to_string()]),
        },
    ]);
    let settings = LandscapeSettings {
        enduser,
        ..Default::default()
    };

    // Run the enrichment and check the item flag is not set
    landscape_data.set_enduser_flag(&settings);
    assert_eq!(landscape_data.items[0].enduser, None);
}

#[test]
#[expect(clippy::too_many_lines)]
fn test_landscape_data_from_legacy_converts_every_field() {
    // Setup legacy data with one item with every field set
    let date = NaiveDate::from_ymd_opt(2024, 5, 1).unwrap();
    let legacy_data = legacy::LandscapeData {
        landscape: vec![legacy::Category {
            name: "Category".to_string(),
            subcategories: vec![legacy::SubCategory {
                items: vec![legacy::Item {
                    homepage_url: "homepage_url".to_string(),
                    logo: "logo".to_string(),
                    name: "Item".to_string(),
                    additional_repos: Some(vec![legacy::Repository {
                        repo_url: "additional_repo_url".to_string(),
                        branch: Some("branch".to_string()),
                        license: Some("license".to_string()),
                    }]),
                    branch: Some("branch".to_string()),
                    crunchbase: Some("crunchbase_url".to_string()),
                    description: Some("description".to_string()),
                    enduser: Some(false),
                    extra: Some(legacy::ItemExtra {
                        accepted: Some(date),
                        annotations: Some(BTreeMap::from([("key".to_string(), "value".to_string())])),
                        annual_review_date: Some(date),
                        annual_review_url: Some("annual_review_url".to_string()),
                        archived: Some(date),
                        artwork_url: Some("artwork_url".to_string()),
                        audits: Some(vec![ItemAudit {
                            date,
                            kind: "kind".to_string(),
                            url: "url".to_string(),
                            vendor: "vendor".to_string(),
                        }]),
                        blog_url: Some("blog_url".to_string()),
                        bluesky_url: Some("bluesky_url".to_string()),
                        chat_channel: Some("chat_channel".to_string()),
                        clomonitor_name: Some("clomonitor_name".to_string()),
                        dev_stats_url: Some("dev_stats_url".to_string()),
                        discord_url: Some("discord_url".to_string()),
                        docker_url: Some("docker_url".to_string()),
                        documentation_url: Some("documentation_url".to_string()),
                        facebook_url: Some("facebook_url".to_string()),
                        funding_url: Some("funding_url".to_string()),
                        github_discussions_url: Some("github_discussions_url".to_string()),
                        gitter_url: Some("gitter_url".to_string()),
                        graduated: Some(date),
                        incubating: Some(date),
                        lfx_slug: Some("lfx_slug".to_string()),
                        linkedin_url: Some("linkedin_url".to_string()),
                        mailing_list_url: Some("mailing_list_url".to_string()),
                        other_links: Some(vec![ItemLink {
                            name: "name".to_string(),
                            url: "https://link.url".to_string(),
                        }]),
                        package_manager_url: Some("package_manager_url".to_string()),
                        parent_project: Some("parent_project".to_string()),
                        pinterest_url: Some("pinterest_url".to_string()),
                        reddit_url: Some("reddit_url".to_string()),
                        slack_url: Some("slack_url".to_string()),
                        specification: Some(false),
                        stack_overflow_url: Some("stack_overflow_url".to_string()),
                        summary_business_use_case: Some("summary_business_use_case".to_string()),
                        summary_integration: Some("summary_integration".to_string()),
                        summary_integrations: Some("summary_integrations".to_string()),
                        summary_intro_url: Some("summary_intro_url".to_string()),
                        summary_personas: Some("summary_personas".to_string()),
                        summary_release_rate: Some("summary_release_rate".to_string()),
                        summary_tags: Some("tag1,tag2".to_string()),
                        summary_use_case: Some("summary_use_case".to_string()),
                        tag: Some(vec!["tag".to_string()]),
                        training_certifications: Some("training_certifications".to_string()),
                        training_type: Some("training_type".to_string()),
                        youtube_url: Some("youtube_url".to_string()),
                    }),
                    item_marker: None,
                    joined: Some(date),
                    license: Some("license".to_string()),
                    project: Some("graduated".to_string()),
                    repo_url: Some("repo_url".to_string()),
                    second_path: Some(vec!["category2 / subcategory2.1".to_string()]),
                    twitter: Some("twitter_url".to_string()),
                    unnamed_organization: Some(false),
                    url_for_bestpractices: Some("url_for_bestpractices".to_string()),
                }],
                name: "Subcategory".to_string(),
                subcategory_marker: None,
            }],
            category_marker: None,
        }],
    };

    // Run the conversion
    let landscape_data = LandscapeData::from(legacy_data);

    // Check the categories and every item field are converted
    let expected_landscape_data = LandscapeData {
        categories: vec![Category {
            name: "Category".to_string(),
            normalized_name: "category".to_string(),
            subcategories: vec![Subcategory {
                name: "Subcategory".to_string(),
                normalized_name: "subcategory".to_string(),
            }],
        }],
        items: vec![Item {
            category: "Category".to_string(),
            homepage_url: "homepage_url".to_string(),
            id: "category--subcategory--item".to_string(),
            logo: "logo".to_string(),
            name: "Item".to_string(),
            subcategory: "Subcategory".to_string(),
            website: "homepage_url".to_string(),
            accepted_at: Some(date),
            additional_categories: Some(vec![AdditionalCategory {
                category: "category2".to_string(),
                subcategory: "subcategory2.1".to_string(),
            }]),
            annotations: Some(BTreeMap::from([("key".to_string(), "value".to_string())])),
            archived_at: Some(date),
            artwork_url: Some("artwork_url".to_string()),
            audits: Some(vec![ItemAudit {
                date,
                kind: "kind".to_string(),
                url: "url".to_string(),
                vendor: "vendor".to_string(),
            }]),
            blog_url: Some("blog_url".to_string()),
            bluesky_url: Some("bluesky_url".to_string()),
            chat_channel: Some("chat_channel".to_string()),
            clomonitor_name: Some("clomonitor_name".to_string()),
            clomonitor_report_summary: None,
            crunchbase_data: None,
            crunchbase_url: Some("crunchbase_url".to_string()),
            description: Some("description".to_string()),
            devstats_url: Some("dev_stats_url".to_string()),
            discord_url: Some("discord_url".to_string()),
            docker_url: Some("docker_url".to_string()),
            documentation_url: Some("documentation_url".to_string()),
            enduser: Some(false),
            facebook_url: Some("facebook_url".to_string()),
            featured: None,
            funding_url: Some("funding_url".to_string()),
            github_discussions_url: Some("github_discussions_url".to_string()),
            gitter_url: Some("gitter_url".to_string()),
            graduated_at: Some(date),
            incubating_at: Some(date),
            joined_at: Some(date),
            latest_annual_review_at: Some(date),
            latest_annual_review_url: Some("annual_review_url".to_string()),
            lfx_slug: Some("lfx_slug".to_string()),
            linkedin_url: Some("linkedin_url".to_string()),
            mailing_list_url: Some("mailing_list_url".to_string()),
            maturity: Some("graduated".to_string()),
            member_subcategory: None,
            openssf_best_practices_url: Some("url_for_bestpractices".to_string()),
            oss: None,
            other_links: Some(vec![ItemLink {
                name: "name".to_string(),
                url: "https://link.url".to_string(),
            }]),
            package_manager_url: Some("package_manager_url".to_string()),
            parent_project: Some("parent_project".to_string()),
            pinterest_url: Some("pinterest_url".to_string()),
            reddit_url: Some("reddit_url".to_string()),
            repositories: Some(vec![
                Repository {
                    url: "repo_url".to_string(),
                    branch: Some("branch".to_string()),
                    github_data: None,
                    license: Some("license".to_string()),
                    primary: Some(true),
                },
                Repository {
                    url: "additional_repo_url".to_string(),
                    branch: Some("branch".to_string()),
                    github_data: None,
                    license: Some("license".to_string()),
                    primary: Some(false),
                },
            ]),
            slack_url: Some("slack_url".to_string()),
            specification: Some(false),
            stack_overflow_url: Some("stack_overflow_url".to_string()),
            summary: Some(ItemSummary {
                business_use_case: Some("summary_business_use_case".to_string()),
                integration: Some("summary_integration".to_string()),
                integrations: Some("summary_integrations".to_string()),
                intro_url: Some("summary_intro_url".to_string()),
                personas: Some(vec!["summary_personas".to_string()]),
                release_rate: Some("summary_release_rate".to_string()),
                tags: Some(vec!["tag1".to_string(), "tag2".to_string()]),
                use_case: Some("summary_use_case".to_string()),
            }),
            tag: Some(vec!["tag".to_string()]),
            training_certifications: Some("training_certifications".to_string()),
            training_type: Some("training_type".to_string()),
            twitter_url: Some("twitter_url".to_string()),
            unnamed_organization: Some(false),
            youtube_url: Some("youtube_url".to_string()),
        }],
    };
    pretty_assertions::assert_eq!(landscape_data, expected_landscape_data);
}

#[test]
fn test_landscape_data_from_legacy_drops_empty_summary_list_entries() {
    // Setup summary list values with empty entries and the lists expected
    let cases = [
        ("", None),
        ("a, b,", Some(vec!["a".to_string(), "b".to_string()])),
        (" , ", None),
        ("a,,b", Some(vec!["a".to_string(), "b".to_string()])),
    ];

    for (value, expected_list) in cases {
        // Setup legacy data with an item with summary personas and tags
        let legacy_data = legacy_data_with_item(legacy::Item {
            extra: Some(legacy::ItemExtra {
                summary_personas: Some(value.to_string()),
                summary_tags: Some(value.to_string()),
                summary_use_case: Some("use case".to_string()),
                ..Default::default()
            }),
            ..legacy_item()
        });

        // Run the conversion
        let landscape_data = LandscapeData::from(legacy_data);

        // Check the empty list entries are dropped
        let summary = landscape_data.items[0].summary.as_ref().unwrap();
        assert_eq!(summary.personas, expected_list, "personas: {value:?}");
        assert_eq!(summary.tags, expected_list, "tags: {value:?}");
    }
}

#[test]
fn test_landscape_data_from_legacy_separates_summary_intro_urls_alike() {
    // Setup summary intro urls values and the value expected
    let cases = [
        ("https://example.com/intro", "https://example.com/intro"),
        (
            "https://example.com/intro-1,https://example.com/intro-2",
            "https://example.com/intro-1, https://example.com/intro-2",
        ),
        (
            " https://example.com/intro-1 ,  https://example.com/intro-2, ",
            "https://example.com/intro-1, https://example.com/intro-2",
        ),
    ];

    for (value, expected_intro_url) in cases {
        // Setup legacy data with an item with summary intro urls
        let legacy_data = legacy_data_with_item(legacy::Item {
            extra: Some(legacy::ItemExtra {
                summary_intro_url: Some(value.to_string()),
                ..Default::default()
            }),
            ..legacy_item()
        });

        // Run the conversion
        let landscape_data = LandscapeData::from(legacy_data);

        // Check the urls are separated by a comma and a space
        let summary = landscape_data.items[0].summary.as_ref().unwrap();
        assert_eq!(
            summary.intro_url.as_deref(),
            Some(expected_intro_url),
            "intro url: {value:?}"
        );
    }
}

#[test]
fn test_landscape_data_from_legacy_sets_website_to_homepage() {
    // Setup legacy data with an item whose homepage is its repository url
    let legacy_data = legacy_data_with_item(legacy::Item {
        homepage_url: "https://repository.url".to_string(),
        crunchbase: Some("https://crunchbase.url/test".to_string()),
        repo_url: Some("https://repository.url".to_string()),
        ..legacy_item()
    });

    // Run the conversion
    let landscape_data = LandscapeData::from(legacy_data);

    // Check the website is the homepage before any enrichment
    assert_eq!(landscape_data.items[0].website, "https://repository.url");
}

#[test]
fn test_landscape_data_from_legacy_with_only_additional_repos_has_no_primary() {
    // Setup legacy data with an item with additional repositories only
    let legacy_data = legacy_data_with_item(legacy::Item {
        additional_repos: Some(vec![legacy::Repository {
            repo_url: "https://repository.url".to_string(),
            branch: None,
            license: None,
        }]),
        ..legacy_item()
    });

    // Run the conversion
    let landscape_data = LandscapeData::from(legacy_data);

    // Check the repository is kept as a non primary one
    let item = &landscape_data.items[0];
    assert_eq!(
        item.repositories,
        Some(vec![Repository {
            url: "https://repository.url".to_string(),
            branch: None,
            github_data: None,
            license: None,
            primary: Some(false),
        }])
    );
    assert!(item.primary_repository().is_none());
}

#[test]
fn test_landscape_data_from_legacy_without_extra_has_no_summary() {
    // Setup legacy data with an item without extra information
    let legacy_data = legacy_data_with_item(legacy_item());

    // Run the conversion
    let landscape_data = LandscapeData::from(legacy_data);

    // Check the item has no summary
    assert_eq!(landscape_data.items[0].summary, None);
}

#[test]
fn test_category_from_normalizes_settings_category() {
    // Setup a settings category with one subcategory
    let settings_category = settings::Category {
        name: "Category".to_string(),
        subcategories: vec!["Subcategory".to_string()],
    };

    // Run the conversion and check the names were normalized
    let category = Category::from(&settings_category);
    assert_eq!(
        category,
        Category {
            name: "Category".to_string(),
            normalized_name: "category".to_string(),
            subcategories: vec![Subcategory {
                name: "Subcategory".to_string(),
                normalized_name: "subcategory".to_string(),
            }],
        }
    );
}

#[test]
fn test_item_description_falls_back_to_crunchbase_when_repository_empty() {
    // Setup an item without description, with an empty repository description
    let item = Item {
        crunchbase_data: Some(Organization {
            description: Some("crunchbase description".to_string()),
            ..Default::default()
        }),
        repositories: Some(vec![Repository {
            github_data: Some(RepositoryGithubData {
                description: String::new(),
                ..Default::default()
            }),
            primary: Some(true),
            ..Default::default()
        }]),
        ..Default::default()
    };

    // Check the Crunchbase description is used
    assert_eq!(item.description(), Some("crunchbase description".to_string()));
}

#[test]
fn test_item_description_falls_back_to_repository_when_empty() {
    // Setup an item with an empty description, with repository and Crunchbase descriptions
    let item = Item {
        crunchbase_data: Some(Organization {
            description: Some("crunchbase description".to_string()),
            ..Default::default()
        }),
        description: Some(String::new()),
        repositories: Some(vec![Repository {
            github_data: Some(RepositoryGithubData {
                description: "repository description".to_string(),
                ..Default::default()
            }),
            primary: Some(true),
            ..Default::default()
        }]),
        ..Default::default()
    };

    // Check the primary repository description is used
    assert_eq!(item.description(), Some("repository description".to_string()));
}

#[test]
fn test_item_description_keeps_own_description_verbatim() {
    // Setup an item whose own description has shortcodes and surrounding spaces
    let item = Item {
        description: Some(" :rocket: Item description ".to_string()),
        ..Default::default()
    };

    // Check the own description is returned unchanged
    assert_eq!(
        item.description(),
        Some(" :rocket: Item description ".to_string())
    );
}

#[test]
fn test_item_description_prefers_item_description() {
    // Setup an item with item, repository and crunchbase descriptions
    let item = Item {
        crunchbase_data: Some(Organization {
            description: Some("crunchbase description".to_string()),
            ..Default::default()
        }),
        description: Some("item description".to_string()),
        repositories: Some(vec![Repository {
            github_data: Some(RepositoryGithubData {
                description: "repository description".to_string(),
                ..Default::default()
            }),
            primary: Some(true),
            ..Default::default()
        }]),
        ..Default::default()
    };

    // Check the item description is used
    assert_eq!(item.description(), Some("item description".to_string()));
}

#[test]
fn test_item_description_returns_none_when_all_empty() {
    // Setup an item with empty item, repository and Crunchbase descriptions
    let item = Item {
        crunchbase_data: Some(Organization {
            description: Some(String::new()),
            ..Default::default()
        }),
        description: Some(String::new()),
        repositories: Some(vec![Repository {
            github_data: Some(RepositoryGithubData {
                description: String::new(),
                ..Default::default()
            }),
            primary: Some(true),
            ..Default::default()
        }]),
        ..Default::default()
    };

    // Check no description is returned
    assert_eq!(item.description(), None);
}

#[test]
fn test_item_description_skips_fallback_with_only_shortcodes() {
    // Setup an item without description whose repository description only
    // has shortcodes
    let item = Item {
        crunchbase_data: Some(Organization {
            description: Some("crunchbase description".to_string()),
            ..Default::default()
        }),
        repositories: Some(vec![Repository {
            github_data: Some(RepositoryGithubData {
                description: " :rocket: :tada: ".to_string(),
                ..Default::default()
            }),
            primary: Some(true),
            ..Default::default()
        }]),
        ..Default::default()
    };

    // Check the Crunchbase description is used
    assert_eq!(item.description(), Some("crunchbase description".to_string()));
}

#[test]
fn test_item_description_skips_primary_repository_without_github_data() {
    // Setup an item without description, whose primary repository has no GitHub
    // data and whose other repository has a description
    let item = Item {
        crunchbase_data: Some(Organization {
            description: Some("crunchbase description".to_string()),
            ..Default::default()
        }),
        repositories: Some(vec![
            Repository {
                url: "https://repository.url/primary".to_string(),
                primary: Some(true),
                ..Default::default()
            },
            Repository {
                url: "https://repository.url/other".to_string(),
                github_data: Some(RepositoryGithubData {
                    description: "other repository description".to_string(),
                    ..Default::default()
                }),
                primary: Some(false),
                ..Default::default()
            },
        ]),
        ..Default::default()
    };

    // Check the Crunchbase description is used
    assert_eq!(item.description(), Some("crunchbase description".to_string()));
}

#[test]
fn test_item_description_strips_github_shortcodes_from_fallbacks() {
    // Setup an item without description, with a repository description
    let mut item = Item {
        repositories: Some(vec![Repository {
            github_data: Some(RepositoryGithubData {
                description: ":rocket: Fast: simple".to_string(),
                ..Default::default()
            }),
            primary: Some(true),
            ..Default::default()
        }]),
        ..Default::default()
    };

    // Check the shortcode is stripped from the repository description, while
    // the text between ordinary colons is kept
    assert_eq!(item.description(), Some("Fast: simple".to_string()));

    // Setup a Crunchbase description as the only fallback
    item.repositories = None;
    item.crunchbase_data = Some(Organization {
        description: Some("Cloud :+1: native :white_check_mark:".to_string()),
        ..Default::default()
    });

    // Check the shortcodes are stripped from the Crunchbase description
    assert_eq!(item.description(), Some("Cloud  native".to_string()));
}

#[test]
fn test_item_primary_repository_returns_none_without_primary() {
    let item = Item {
        repositories: Some(vec![Repository {
            url: "repo1".to_string(),
            primary: Some(false),
            ..Default::default()
        }]),
        ..Default::default()
    };

    assert!(item.primary_repository().is_none());
}

#[test]
fn test_item_primary_repository_returns_primary_repository() {
    // Setup an item with a non primary and a primary repository
    let item = Item {
        repositories: Some(vec![
            Repository {
                url: "repo1".to_string(),
                primary: Some(false),
                ..Default::default()
            },
            Repository {
                url: "repo2".to_string(),
                primary: Some(true),
                ..Default::default()
            },
        ]),
        ..Default::default()
    };

    // Check the primary repository is returned
    assert_eq!(item.primary_repository().unwrap().url, "repo2".to_string());
}

#[test]
fn test_item_set_id_joins_normalized_names() {
    let mut item = Item {
        category: "Category 1".to_string(),
        name: "Foo Bar".to_string(),
        subcategory: "Subcategory 1".to_string(),
        ..Default::default()
    };

    item.set_id("category-1", "subcategory-1");
    assert_eq!(item.id, "category-1--subcategory-1--foo-bar".to_string());
}

#[test]
fn test_item_set_website_uses_homepage_url() {
    let mut item = Item {
        homepage_url: "homepage_url".to_string(),
        ..Default::default()
    };

    item.set_website();
    assert_eq!(item.website, "homepage_url".to_string());
}

// Helpers.

/// Return legacy data with one category and subcategory holding the item
/// provided.
fn legacy_data_with_item(item: legacy::Item) -> legacy::LandscapeData {
    legacy::LandscapeData {
        landscape: vec![legacy::Category {
            name: "Category".to_string(),
            subcategories: vec![legacy::SubCategory {
                items: vec![item],
                name: "Subcategory".to_string(),
                subcategory_marker: None,
            }],
            category_marker: None,
        }],
    }
}

/// Return a legacy item with only the required fields set.
fn legacy_item() -> legacy::Item {
    legacy::Item {
        homepage_url: "https://example.com".to_string(),
        logo: "logo.svg".to_string(),
        name: "Item".to_string(),
        ..Default::default()
    }
}

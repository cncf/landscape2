use super::*;

#[test]
fn test_landscape_data_validate_accepts_logo_in_subdirectory() {
    let landscape = landscape_with_items(vec![Item {
        logo: "sub/foo.svg".to_string(),
        ..valid_item()
    }]);

    landscape.validate().unwrap();
}

#[test]
fn test_landscape_data_validate_accepts_mailto_only_in_other_links() {
    // Setup an item with a mailto other link
    let landscape = landscape_with_items(vec![Item {
        extra: Some(ItemExtra {
            other_links: Some(vec![ItemLink {
                name: "email".to_string(),
                url: "mailto:team@example.com".to_string(),
            }]),
            ..Default::default()
        }),
        ..valid_item()
    }]);

    // Run the validation and check it is accepted
    landscape.validate().unwrap();

    // Setup an item with a mailto mailing list url
    let landscape = landscape_with_items(vec![Item {
        extra: Some(ItemExtra {
            mailing_list_url: Some("mailto:team@example.com".to_string()),
            ..Default::default()
        }),
        ..valid_item()
    }]);

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): invalid mailing_list url: invalid scheme"
    );
}

#[test]
fn test_landscape_data_validate_accepts_same_item_name_in_other_subcategory() {
    let landscape = LandscapeData {
        landscape: vec![category(
            "Category",
            vec![
                subcategory("Subcategory 1", vec![valid_item()]),
                subcategory("Subcategory 2", vec![valid_item()]),
            ],
        )],
    };

    landscape.validate().unwrap();
}

#[test]
fn test_landscape_data_validate_accepts_several_summary_intro_urls() {
    // Setup an item with two summary intro urls separated by a comma
    let landscape = landscape_with_items(vec![Item {
        extra: Some(ItemExtra {
            summary_intro_url: Some("https://example.com/intro-1, https://example.com/intro-2".to_string()),
            ..Default::default()
        }),
        ..valid_item()
    }]);

    // Run the validation
    landscape.validate().unwrap();
}

#[test]
fn test_landscape_data_validate_accepts_tag_with_digits() {
    let landscape = landscape_with_items(vec![Item {
        extra: Some(ItemExtra {
            tag: Some(vec!["k8s-tools".to_string(), "tag1".to_string()]),
            ..Default::default()
        }),
        ..valid_item()
    }]);

    landscape.validate().unwrap();
}

#[test]
fn test_landscape_data_validate_accepts_valid_data() {
    // Setup an item using every optional url field with a valid value
    let landscape = landscape_with_items(vec![Item {
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
            clomonitor_name: Some("project_name-1.0".to_string()),
            other_links: Some(vec![
                ItemLink {
                    name: "email".to_string(),
                    url: "mailto:team@example.com".to_string(),
                },
                ItemLink {
                    name: "link".to_string(),
                    url: "https://link.url".to_string(),
                },
            ]),
            ..Default::default()
        }),
        project: Some("graduated".to_string()),
        ..valid_item()
    }]);

    // Run the validation and check it succeeds
    landscape.validate().unwrap();
}

#[test]
fn test_landscape_data_validate_accepts_valid_second_path() {
    // Setup an item whose second path points to a category defined later
    let landscape = LandscapeData {
        landscape: vec![
            category(
                "Category 1",
                vec![subcategory(
                    "Subcategory 1",
                    vec![Item {
                        second_path: Some(vec![" Category 2 / Subcategory 2 ".to_string()]),
                        ..valid_item()
                    }],
                )],
            ),
            category("Category 2", vec![subcategory("Subcategory 2", vec![])]),
        ],
    };

    // Run the validation and check no warnings are returned
    let warnings = landscape.validate().unwrap();
    assert_eq!(warnings, Vec::<String>::new());
}

#[test]
fn test_landscape_data_validate_error_names_item_category_and_subcategory() {
    // Setup an invalid item in the second category
    let landscape = LandscapeData {
        landscape: vec![
            category(
                "Orchestration",
                vec![subcategory("Scheduling", vec![valid_item()])],
            ),
            category(
                "Observability",
                vec![subcategory(
                    "Tracing",
                    vec![Item {
                        homepage_url: "jaeger".to_string(),
                        name: "Jaeger".to_string(),
                        ..valid_item()
                    }],
                )],
            ),
        ],
    };

    // Run the validation and check the full error chain
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Jaeger] is not valid (category: [Observability] | subcategory: [Tracing]): invalid homepage url: relative URL without a base"
    );
}

#[test]
fn test_landscape_data_validate_rejects_colliding_maturity_values() {
    // Setup two items whose maturity values normalize alike
    let landscape = landscape_with_items(vec![
        Item {
            name: "Item 1".to_string(),
            project: Some("Sandbox".to_string()),
            ..valid_item()
        },
        Item {
            name: "Item 2".to_string(),
            project: Some("sandbox".to_string()),
            ..valid_item()
        },
    ]);

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Item 2] is not valid (category: [Category] | subcategory: [Subcategory]): maturity [sandbox] collides with maturity [Sandbox] (both normalize to sandbox)"
    );
}

#[test]
fn test_landscape_data_validate_rejects_duplicate_category_name() {
    // Setup two categories whose names normalize alike
    let landscape = LandscapeData {
        landscape: vec![
            category("Foo Bar", vec![subcategory("Subcategory 1", vec![valid_item()])]),
            category("Foo-Bar", vec![subcategory("Subcategory 2", vec![valid_item()])]),
        ],
    };

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "category [Foo-Bar] is not valid: duplicate name (normalizes to foo-bar, also used by category [Foo Bar])"
    );
}

#[test]
fn test_landscape_data_validate_rejects_duplicate_item_id() {
    // Setup one landscape per way of producing a duplicate item id
    let cases = [
        (
            "names normalizing alike",
            landscape_with_items(vec![item_named("Foo Bar"), item_named("Foo-Bar")]),
            "item [Foo-Bar] is not valid (category: [Category] | subcategory: [Subcategory]): duplicate item id category--subcategory--foo-bar (also used by item [Foo Bar])",
        ),
        (
            "names differing only in case",
            landscape_with_items(vec![item_named("Helm"), item_named("helm")]),
            "item [helm] is not valid (category: [Category] | subcategory: [Subcategory]): duplicate item id category--subcategory--helm (also used by item [Helm])",
        ),
        (
            "same item in one subcategory",
            landscape_with_items(vec![valid_item(), valid_item()]),
            "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): duplicate item id category--subcategory--item (also used by item [Item])",
        ),
        (
            "same item under two same-named subcategory entries",
            LandscapeData {
                landscape: vec![category(
                    "Category",
                    vec![
                        subcategory("Subcategory", vec![valid_item()]),
                        subcategory("Subcategory", vec![valid_item()]),
                    ],
                )],
            },
            "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): duplicate item id category--subcategory--item (also used by item [Item])",
        ),
    ];

    for (case, landscape, expected_err) in cases {
        // Run the validation and check the error
        let err = landscape.validate().unwrap_err();
        assert_eq!(format!("{err:#}"), expected_err, "case: {case}");
    }
}

#[test]
fn test_landscape_data_validate_rejects_duplicate_subcategory_name() {
    // Setup two subcategories in one category whose names normalize alike
    let landscape = LandscapeData {
        landscape: vec![category(
            "Category",
            vec![
                subcategory("Foo Bar", vec![item_named("Item 1")]),
                subcategory("foo bar", vec![item_named("Item 2")]),
            ],
        )],
    };

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "subcategory [foo bar] is not valid (category: [Category]): duplicate name (normalizes to foo-bar, also used by subcategory [Foo Bar])"
    );
}

#[test]
fn test_landscape_data_validate_rejects_empty_category_name() {
    // Setup a category with an empty name
    let mut landscape = landscape_with_items(vec![valid_item()]);
    landscape.landscape[0].name = "   ".to_string();

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(format!("{err:#}"), "category [0] name is required");
}

#[test]
fn test_landscape_data_validate_rejects_empty_homepage_url() {
    // Setup an item with an empty homepage url
    let landscape = landscape_with_items(vec![Item {
        homepage_url: "   ".to_string(),
        ..valid_item()
    }]);

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): homepage url is required"
    );
}

#[test]
fn test_landscape_data_validate_rejects_empty_item_name() {
    // Setup an item with an empty name
    let landscape = landscape_with_items(vec![item_named("   ")]);

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [0] is not valid (category: [Category] | subcategory: [Subcategory]): item name is required"
    );
}

#[test]
fn test_landscape_data_validate_rejects_empty_link_name() {
    // Setup an item with a link with an empty name
    let landscape = landscape_with_items(vec![Item {
        extra: Some(ItemExtra {
            other_links: Some(vec![ItemLink {
                name: "   ".to_string(),
                url: "https://link.url".to_string(),
            }]),
            ..Default::default()
        }),
        ..valid_item()
    }]);

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): link name is required"
    );
}

#[test]
fn test_landscape_data_validate_rejects_empty_link_url() {
    // Setup an item with a link with an empty url
    let landscape = landscape_with_items(vec![Item {
        extra: Some(ItemExtra {
            other_links: Some(vec![ItemLink {
                name: "name".to_string(),
                url: "   ".to_string(),
            }]),
            ..Default::default()
        }),
        ..valid_item()
    }]);

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): link url is required"
    );
}

#[test]
fn test_landscape_data_validate_rejects_empty_logo() {
    // Setup an item with an empty logo
    let landscape = landscape_with_items(vec![Item {
        logo: "   ".to_string(),
        ..valid_item()
    }]);

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): logo is required"
    );
}

#[test]
fn test_landscape_data_validate_rejects_empty_normalized_name() {
    // Setup one landscape per level with a name that normalizes to nothing
    let cases = [
        (
            "emoji-only category",
            LandscapeData {
                landscape: vec![category(
                    "🙂",
                    vec![subcategory("Subcategory", vec![valid_item()])],
                )],
            },
            "category [🙂] is not valid: name must contain at least one letter or digit",
        ),
        (
            "emoji-only subcategory",
            LandscapeData {
                landscape: vec![category("Category", vec![subcategory("🙂", vec![valid_item()])])],
            },
            "subcategory [🙂] is not valid (category: [Category]): name must contain at least one letter or digit",
        ),
        (
            "emoji-only item",
            landscape_with_items(vec![item_named("🙂")]),
            "item [🙂] is not valid (category: [Category] | subcategory: [Subcategory]): item name must contain at least one letter or digit",
        ),
    ];

    for (case, landscape, expected_err) in cases {
        // Run the validation and check the error
        let err = landscape.validate().unwrap_err();
        assert_eq!(format!("{err:#}"), expected_err, "case: {case}");
    }
}

#[test]
fn test_landscape_data_validate_rejects_empty_subcategory_name() {
    // Setup a subcategory with an empty name
    let mut landscape = landscape_with_items(vec![valid_item()]);
    landscape.landscape[0].subcategories[0].name = "   ".to_string();

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "subcategory [0] name is required (category: [Category])"
    );
}

#[test]
fn test_landscape_data_validate_rejects_error_after_second_path_warning() {
    // Setup an item with an unknown second path subcategory followed by an
    // invalid homepage url
    let landscape = landscape_with_items(vec![Item {
        homepage_url: "not-a-url".to_string(),
        second_path: Some(vec!["Category / Unknown".to_string()]),
        ..valid_item()
    }]);

    // Run the validation and check the fatal error still fails validation
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): invalid homepage url: relative URL without a base"
    );
}

#[test]
fn test_landscape_data_validate_rejects_invalid_clomonitor_name() {
    for clomonitor_name in ["a/b", "..", "x?y", "a..b"] {
        // Setup an item with an invalid CLOMonitor name
        let landscape = landscape_with_items(vec![Item {
            extra: Some(ItemExtra {
                clomonitor_name: Some(clomonitor_name.to_string()),
                ..Default::default()
            }),
            ..valid_item()
        }]);

        // Run the validation and check the error
        let err = landscape.validate().unwrap_err();
        assert_eq!(
            format!("{err:#}"),
            "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): invalid clomonitor_name (must start with a letter or digit and use only letters, digits, dots, underscores and hyphens, without ..)",
            "clomonitor_name: {clomonitor_name}"
        );
    }
}

#[test]
fn test_landscape_data_validate_rejects_invalid_homepage_url() {
    // Setup an item with a homepage url that cannot be parsed
    let landscape = landscape_with_items(vec![Item {
        homepage_url: "homepage_url".to_string(),
        ..valid_item()
    }]);

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): invalid homepage url: relative URL without a base"
    );
}

#[test]
fn test_landscape_data_validate_rejects_invalid_second_path() {
    // Setup invalid second path entries and the errors expected
    let cases = [
        (
            "Category",
            "invalid second path entry [Category] (expected: category / subcategory)",
        ),
        (
            "Category / Subcategory / Other",
            "invalid second path entry [Category / Subcategory / Other] (expected: category / subcategory)",
        ),
        (
            "  / Subcategory",
            "invalid second path entry [  / Subcategory] (expected: category / subcategory)",
        ),
        (
            "Unknown / Subcategory",
            "second path entry [Unknown / Subcategory] references unknown category [Unknown]",
        ),
    ];

    for (entry, expected_err) in cases {
        // Setup an item with the second path entry
        let landscape = landscape_with_items(vec![Item {
            second_path: Some(vec![entry.to_string()]),
            ..valid_item()
        }]);

        // Run the validation and check the error
        let err = landscape.validate().unwrap_err();
        assert_eq!(
            format!("{err:#}"),
            format!(
                "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): {expected_err}"
            ),
            "entry: {entry}"
        );
    }
}

#[test]
fn test_landscape_data_validate_rejects_invalid_summary_intro_url() {
    // Setup an item with a summary intro url that cannot be parsed
    let landscape = landscape_with_items(vec![Item {
        extra: Some(ItemExtra {
            summary_intro_url: Some("summary_intro_url".to_string()),
            ..Default::default()
        }),
        ..valid_item()
    }]);

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): invalid summary_intro url: relative URL without a base"
    );
}

#[test]
fn test_landscape_data_validate_rejects_invalid_summary_intro_url_in_list() {
    // Setup an item with a valid summary intro url followed by a text
    let landscape = landscape_with_items(vec![Item {
        extra: Some(ItemExtra {
            summary_intro_url: Some("https://example.com/intro, Second intro".to_string()),
            ..Default::default()
        }),
        ..valid_item()
    }]);

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): invalid summary_intro url: relative URL without a base"
    );
}

#[test]
fn test_landscape_data_validate_rejects_invalid_tag() {
    // Setup an item with an invalid TAG name
    let landscape = landscape_with_items(vec![Item {
        extra: Some(ItemExtra {
            tag: Some(vec!["Invalid Tag".to_string()]),
            ..Default::default()
        }),
        ..valid_item()
    }]);

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): invalid tag (must use only lowercase letters, digits and hyphens)"
    );
}

#[test]
fn test_landscape_data_validate_rejects_invalid_url_per_group() {
    // Setup one item with an invalid url per url group
    let cases = [
        (
            "item",
            Item {
                repo_url: Some("repo_url".to_string()),
                ..valid_item()
            },
            "invalid repository url: relative URL without a base",
        ),
        (
            "additional repository",
            Item {
                additional_repos: Some(vec![Repository {
                    repo_url: "additional_repo_url".to_string(),
                    ..Default::default()
                }]),
                ..valid_item()
            },
            "invalid additional_repository url: relative URL without a base",
        ),
        (
            "extra",
            Item {
                extra: Some(ItemExtra {
                    blog_url: Some("blog_url".to_string()),
                    ..Default::default()
                }),
                ..valid_item()
            },
            "invalid blog url: relative URL without a base",
        ),
        (
            "audit",
            Item {
                extra: Some(ItemExtra {
                    audits: Some(vec![ItemAudit {
                        url: "audit_url".to_string(),
                        ..Default::default()
                    }]),
                    ..Default::default()
                }),
                ..valid_item()
            },
            "invalid audit url: relative URL without a base",
        ),
        (
            "other link",
            Item {
                extra: Some(ItemExtra {
                    other_links: Some(vec![ItemLink {
                        name: "link".to_string(),
                        url: "link_url".to_string(),
                    }]),
                    ..Default::default()
                }),
                ..valid_item()
            },
            "invalid other_link url: relative URL without a base",
        ),
    ];

    for (group, item, expected_err) in cases {
        // Run the validation and check the error
        let err = landscape_with_items(vec![item]).validate().unwrap_err();
        assert_eq!(
            format!("{err:#}"),
            format!(
                "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): {expected_err}"
            ),
            "group: {group}"
        );
    }
}

#[test]
fn test_landscape_data_validate_rejects_reserved_maturity_all() {
    // Setup an item whose maturity normalizes to the reserved all value
    let landscape = landscape_with_items(vec![Item {
        project: Some("All".to_string()),
        ..valid_item()
    }]);

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): maturity [All] is reserved (normalizes to all)"
    );
}

#[test]
fn test_landscape_data_validate_rejects_reserved_tag_all() {
    // Setup an item with the reserved all tag
    let landscape = landscape_with_items(vec![Item {
        extra: Some(ItemExtra {
            tag: Some(vec!["all".to_string()]),
            ..Default::default()
        }),
        ..valid_item()
    }]);

    // Run the validation and check the error
    let err = landscape.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): tag [all] is reserved (normalizes to all)"
    );
}

#[test]
fn test_landscape_data_validate_rejects_unsafe_logo_path() {
    for logo in ["/etc/passwd", "../secret.svg", "a/../../b.svg", r"a\b.svg"] {
        // Setup an item with a logo path escaping the logos directory
        let landscape = landscape_with_items(vec![Item {
            logo: logo.to_string(),
            ..valid_item()
        }]);

        // Run the validation and check the error
        let err = landscape.validate().unwrap_err();
        assert_eq!(
            format!("{err:#}"),
            "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): logo must be a relative path inside the logos directory (no absolute paths, .. components or backslashes)",
            "logo: {logo}"
        );
    }
}

#[test]
fn test_landscape_data_validate_rejects_wrong_social_domain() {
    // Setup one item per social link pointing to the wrong domain
    let cases = [
        (
            Item {
                twitter: Some("https://example.com/project".to_string()),
                ..valid_item()
            },
            "invalid twitter url: expecting https://twitter.com|x.com/...",
        ),
        (
            Item {
                extra: Some(ItemExtra {
                    bluesky_url: Some("https://example.com/project".to_string()),
                    ..Default::default()
                }),
                ..valid_item()
            },
            "invalid bluesky url: expecting https://bsky.app/...",
        ),
    ];

    for (item, expected_err) in cases {
        // Run the validation and check the error
        let err = landscape_with_items(vec![item]).validate().unwrap_err();
        assert_eq!(
            format!("{err:#}"),
            format!(
                "item [Item] is not valid (category: [Category] | subcategory: [Subcategory]): {expected_err}"
            )
        );
    }
}

#[test]
fn test_landscape_data_validate_warns_on_unknown_second_path_subcategory() {
    // Setup items referencing both defined and undefined subcategories in
    // existing categories
    let landscape = LandscapeData {
        landscape: vec![
            category(
                "Category 1",
                vec![subcategory(
                    "Subcategory 1",
                    vec![Item {
                        name: "Item 1".to_string(),
                        second_path: Some(vec![
                            "Category 2 / Subcategory 2".to_string(),
                            " Category 2 / Unknown 1 ".to_string(),
                            "Category 1 / Unknown 2".to_string(),
                        ]),
                        ..valid_item()
                    }],
                )],
            ),
            category(
                "Category 2",
                vec![subcategory(
                    "Subcategory 2",
                    vec![Item {
                        name: "Item 2".to_string(),
                        second_path: Some(vec!["Category 1 / Unknown 2".to_string()]),
                        ..valid_item()
                    }],
                )],
            ),
        ],
    };

    // Run the validation and check one warning per unknown subcategory entry
    let warnings = landscape.validate().unwrap();
    assert_eq!(
        warnings,
        vec![
            "item [Item 1] (category: [Category 1] | subcategory: [Subcategory 1]): \
             second path entry [ Category 2 / Unknown 1 ] references unknown subcategory [Unknown 1] in category [Category 2]",
            "item [Item 1] (category: [Category 1] | subcategory: [Subcategory 1]): \
             second path entry [Category 1 / Unknown 2] references unknown subcategory [Unknown 2] in category [Category 1]",
            "item [Item 2] (category: [Category 2] | subcategory: [Subcategory 2]): \
             second path entry [Category 1 / Unknown 2] references unknown subcategory [Unknown 2] in category [Category 1]",
        ]
    );
}

// Helpers.

/// Return a legacy category with the name and subcategories provided.
fn category(name: &str, subcategories: Vec<SubCategory>) -> Category {
    Category {
        name: name.to_string(),
        subcategories,
        category_marker: None,
    }
}

/// Return a valid legacy item with the name provided.
fn item_named(name: &str) -> Item {
    Item {
        name: name.to_string(),
        ..valid_item()
    }
}

/// Return landscape data with one category and subcategory holding the items
/// provided.
fn landscape_with_items(items: Vec<Item>) -> LandscapeData {
    LandscapeData {
        landscape: vec![category("Category", vec![subcategory("Subcategory", items)])],
    }
}

/// Return a legacy subcategory with the name and items provided.
fn subcategory(name: &str, items: Vec<Item>) -> SubCategory {
    SubCategory {
        items,
        name: name.to_string(),
        subcategory_marker: None,
    }
}

/// Return a valid legacy item with only the required fields set.
fn valid_item() -> Item {
    Item {
        homepage_url: "https://example.com".to_string(),
        logo: "logo.svg".to_string(),
        name: "Item".to_string(),
        ..Default::default()
    }
}

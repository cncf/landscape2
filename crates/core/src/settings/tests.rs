use std::{fs, path::Path};

use super::*;

/// Name of the settings file served by the mock server.
const SETTINGS_FILE: &str = "settings.yml";

/// Landscape settings fixture.
const TESTS_SETTINGS_FILE: &str = "src/testdata/settings.yml";

#[test]
fn test_settings_source_new_from_url_sets_settings_url() {
    let url = "https://example.url/settings.yml";
    let src = SettingsSource::new_from_url(url.to_string());
    assert_eq!(
        src,
        SettingsSource {
            settings_file: None,
            settings_url: Some(url.to_string()),
        }
    );
}

#[tokio::test]
async fn test_landscape_settings_new_loads_url() {
    // Setup settings file server
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", format!("/{SETTINGS_FILE}").as_str())
        .with_status(200)
        .with_body_from_file(TESTS_SETTINGS_FILE)
        .create_async()
        .await;

    // Run the settings load from the url source
    let src = SettingsSource::new_from_url(format!("{}/{SETTINGS_FILE}", server.url()));
    let settings = LandscapeSettings::new(&src).await.unwrap();

    // Check the settings were parsed and that the settings file was requested
    assert_eq!(settings.foundation, "Foundation");
    mock.assert_async().await;
}

#[tokio::test]
async fn test_landscape_settings_new_rejects_missing_source() {
    let src = SettingsSource::default();
    let err = LandscapeSettings::new(&src).await.unwrap_err();
    assert_eq!(format!("{err:#}"), "settings file or url not provided");
}

#[tokio::test]
async fn test_landscape_settings_new_rejects_not_found_url() {
    // Setup settings file server returning not found
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", format!("/{SETTINGS_FILE}").as_str())
        .with_status(404)
        .create_async()
        .await;

    // Run the settings load from the url source
    let url = format!("{}/{SETTINGS_FILE}", server.url());
    let src = SettingsSource::new_from_url(url.clone());
    let err = LandscapeSettings::new(&src).await.unwrap_err();

    // Check the error and that the settings file was requested
    assert_eq!(
        format!("{err:#}"),
        format!(
            "error fetching settings file {url}: HTTP status client error (404 Not Found) for url ({url})"
        )
    );
    mock.assert_async().await;
}

#[test]
fn test_landscape_settings_new_from_yaml_adds_not_valid_context() {
    let raw = "foundation: \" \"\nurl: https://example.url\n";
    let err = LandscapeSettings::new_from_yaml(raw).unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "the landscape settings file provided is not valid: foundation cannot be empty"
    );
}

#[test]
fn test_landscape_settings_new_from_yaml_normalizes_url_and_base_path() {
    for (url, base_path, expected_url, expected_base_path) in [
        ("https://example.url", "/", "https://example.url", None),
        ("https://example.url", "///", "https://example.url", None),
        (
            "https://example.url",
            "/docs",
            "https://example.url",
            Some("/docs"),
        ),
        (
            "https://example.url",
            "/docs//",
            "https://example.url",
            Some("/docs"),
        ),
        (
            "https://example.url/",
            "/docs/",
            "https://example.url",
            Some("/docs"),
        ),
        (
            "https://example.url/landscape//",
            "/",
            "https://example.url/landscape",
            None,
        ),
    ] {
        // Setup settings with the url and base path provided
        let raw = format!("foundation: Foundation\nurl: {url}\nbase_path: {base_path}\n");

        // Run the parsing and check the normalized values
        let settings = LandscapeSettings::new_from_yaml(&raw).unwrap().value;
        assert_eq!(settings.url, expected_url, "url: {url}");
        assert_eq!(
            settings.base_path.as_deref(),
            expected_base_path,
            "base_path: {base_path}"
        );
    }
}

#[test]
fn test_landscape_settings_new_from_yaml_parses_fixture() {
    // Run the parsing of the settings fixture
    let raw = fs::read_to_string(TESTS_SETTINGS_FILE).unwrap();
    let parsed = LandscapeSettings::new_from_yaml(&raw).unwrap();
    let settings = parsed.value;

    // Check the required fields and the normalized base path
    assert_eq!(settings.foundation, "Foundation");
    assert_eq!(settings.url, "https://tests.landscape2.io");
    assert_eq!(settings.base_path.as_deref(), Some("/landscape"));

    // Check the analytics, colors and images sections
    assert_eq!(
        settings.analytics.unwrap().gtm.unwrap().container_id.as_deref(),
        Some("GTM-TEST123")
    );
    assert_eq!(settings.colors.color7, "rgb(180, 219, 255)");
    let images = settings.images.unwrap();
    assert_eq!(images.favicon.as_deref(), Some("images/favicon.png"));
    assert_eq!(
        images.open_graph.as_deref(),
        Some("https://tests.landscape2.io/images/open-graph.png")
    );

    // Check the classification rules
    assert_eq!(
        settings.enduser,
        Some(vec![EndUserRule {
            category: "Category 2".to_string(),
            subcategories: Some(vec!["Subcategory 2-1".to_string()]),
        }])
    );
    assert_eq!(
        settings.featured_items,
        Some(vec![FeaturedItemRule {
            field: FeaturedItemField::Maturity,
            options: vec![FeaturedItemRuleOption {
                value: "graduated".to_string(),
                label: Some("Graduated".to_string()),
                order: Some(1),
            }],
            exclude: Some(FeaturedItemRuleExclude {
                groups: Some(vec!["Group 2".to_string()]),
            }),
        }])
    );
    assert_eq!(settings.members_category.as_deref(), Some("Category 2"));
    let tags = settings.tags.unwrap();
    assert_eq!(tags.keys().collect::<Vec<_>>(), ["app-delivery", "security"]);

    // Check the markdown content was converted to HTML
    let footer = settings.footer.unwrap();
    assert_eq!(footer.logo.as_deref(), Some("images/footer-logo.svg"));
    assert_eq!(
        footer.text.as_deref(),
        Some("<p>Footer <strong>text</strong></p>")
    );
    let header = settings.header.unwrap();
    assert_eq!(
        header.motd.as_deref(),
        Some("<p>Message of the <strong>day</strong></p>")
    );

    // Check the groups, including their alias and normalized name
    let groups = settings.groups.unwrap();
    assert_eq!(groups[0].alias.as_deref(), Some("group-one"));
    assert_eq!(groups[0].normalized_name.as_deref(), Some("group-1"));
    assert_eq!(groups[1].normalized_name.as_deref(), Some("group-2"));

    // Check the layout and third party sections
    assert_eq!(settings.grid_items_size, Some(GridItemsSize::Medium));
    assert_eq!(
        settings.logos_viewbox,
        LogosViewbox {
            adjust: false,
            exclude: vec!["item-2.svg".to_string()],
        }
    );
    assert_eq!(
        settings.osano,
        Some(Osano {
            customer_configuration_id: "customer-configuration-id".to_string(),
            customer_id: "customer-id".to_string(),
        })
    );
    let upcoming_event = settings.upcoming_event.unwrap();
    assert_eq!(upcoming_event.name, "Upcoming event");
    assert_eq!(upcoming_event.start, date((2024, 3, 19)));
    assert_eq!(upcoming_event.end, date((2024, 3, 22)));
    assert_eq!(settings.view_mode, Some(ViewMode::Card));

    // Check no warnings were reported
    assert_eq!(parsed.warnings, Vec::<String>::new());
}

#[test]
fn test_landscape_settings_new_from_yaml_rejects_invalid_yaml() {
    let err = LandscapeSettings::new_from_yaml("groups: [").unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "the landscape settings file provided is not valid: invalid yaml file: did not find expected node content at line 2 column 1, while parsing a flow node"
    );
}

#[test]
fn test_landscape_settings_new_from_yaml_rejects_unknown_featured_field() {
    // Setup settings with a featured item rule using an unknown field
    let raw = r"
foundation: Foundation
url: https://example.url
featured_items:
  - field: name
    options:
      - value: graduated
";

    // Run the parsing and check the error
    let err = LandscapeSettings::new_from_yaml(raw).unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "the landscape settings file provided is not valid: invalid yaml file: featured_items[0].field: unknown variant `name`, expected `maturity` or `subcategory` at line 5 column 12"
    );
}

#[test]
fn test_landscape_settings_new_from_yaml_warns_on_unknown_key() {
    // Setup valid settings with a misspelled featured items key
    let raw = r"
foundation: Foundation
url: https://example.url
featured_item:
  - field: maturity
    options:
      - value: graduated
";

    // Run the parsing and check the unknown key is reported
    let parsed = LandscapeSettings::new_from_yaml(raw).unwrap();
    assert_eq!(
        parsed.warnings,
        vec!["unknown key `featured_item` (found once, at featured_item)"]
    );
}

#[test]
fn test_landscape_settings_footer_text_to_html_converts_markdown() {
    // Setup settings with a markdown footer text
    let mut settings = LandscapeSettings {
        footer: Some(Footer {
            text: Some("# Footer text".to_string()),
            ..Default::default()
        }),
        ..Default::default()
    };

    // Run the conversion and check the footer text is now HTML
    settings.footer_text_to_html();
    assert_eq!(settings.footer.unwrap().text.unwrap(), "<h1>Footer text</h1>");
}

#[test]
fn test_header_motd_to_html_converts_markdown() {
    // Setup settings with a markdown header motd
    let mut settings = LandscapeSettings {
        header: Some(Header {
            motd: Some("**Welcome** to the [landscape](https://example.url)".to_string()),
            ..Default::default()
        }),
        ..Default::default()
    };

    // Run the conversion and check the header motd is now HTML
    settings.header_motd_to_html();
    assert_eq!(
        settings.header.unwrap().motd.unwrap(),
        r#"<p><strong>Welcome</strong> to the <a href="https://example.url">landscape</a></p>"#
    );
}

#[test]
fn test_markdown_fields_escape_raw_html_and_unsafe_links() {
    // Setup settings with raw HTML and unsafe links in the markdown fields
    let raw = r"
foundation: Foundation
url: https://example.url
footer:
  text: 'Hello <script>alert(1)</script> [x](javascript:alert(1))'
header:
  motd: 'Hello <script>alert(1)</script> [x](javascript:alert(1))'
";

    // Run the parsing
    let settings = LandscapeSettings::new_from_yaml(raw).unwrap().value;

    // Check the raw HTML is escaped and the unsafe links are removed
    let expected_html = r#"<p>Hello &lt;script&gt;alert(1)&lt;/script&gt; <a href="">x</a></p>"#;
    assert_eq!(settings.footer.unwrap().text.unwrap(), expected_html);
    assert_eq!(settings.header.unwrap().motd.unwrap(), expected_html);
}

#[test]
fn test_landscape_settings_set_groups_normalized_name_sets_normalized_name() {
    // Setup settings with a group without normalized name
    let mut settings = LandscapeSettings {
        groups: Some(vec![Group {
            name: "Group 1".to_string(),
            ..Default::default()
        }]),
        ..Default::default()
    };

    // Run the normalization and check the group normalized name
    settings.set_groups_normalized_name();
    assert_eq!(
        settings.groups.unwrap().first().unwrap().normalized_name.as_ref().unwrap(),
        "group-1"
    );
}

#[test]
fn test_landscape_settings_validate_accepts_analytics() {
    let settings = LandscapeSettings {
        analytics: Some(Analytics {
            gtm: Some(GoogleTagManager {
                container_id: Some("GTM-ABC123".to_string()),
            }),
        }),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_base_path() {
    let settings = LandscapeSettings {
        base_path: Some("/base_path".to_string()),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_categories() {
    let settings = LandscapeSettings {
        categories: Some(vec![Category {
            name: "Category".to_string(),
            subcategories: vec!["Subcategory 1".to_string(), "Subcategory 2".to_string()],
        }]),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_enduser() {
    let settings = LandscapeSettings {
        enduser: Some(vec![
            EndUserRule {
                category: "Category 1".to_string(),
                subcategories: None,
            },
            EndUserRule {
                category: "Category 2".to_string(),
                subcategories: Some(vec!["Subcategory".to_string()]),
            },
        ]),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_featured_item_rule() {
    let settings = LandscapeSettings {
        featured_items: Some(vec![valid_featured_item_rule()]),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_featured_item_rule_with_exclude() {
    let settings = LandscapeSettings {
        featured_items: Some(vec![FeaturedItemRule {
            exclude: Some(FeaturedItemRuleExclude {
                groups: Some(vec!["Members".to_string()]),
            }),
            ..valid_featured_item_rule()
        }]),
        groups: Some(vec![Group {
            categories: vec!["Members".to_string()],
            name: "Members".to_string(),
            ..Default::default()
        }]),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_footer() {
    let settings = LandscapeSettings {
        footer: Some(Footer {
            links: Some(FooterLinks {
                github: Some("https://github.com".to_string()),
                ..Default::default()
            }),
            logo: Some("https://logo.url".to_string()),
            text: Some("Footer text".to_string()),
        }),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_groups() {
    let settings = LandscapeSettings {
        groups: Some(vec![
            Group {
                categories: vec!["Category 1".to_string()],
                name: "Group 1".to_string(),
                alias: Some("projects".to_string()),
                ..Default::default()
            },
            Group {
                categories: vec!["Category 2".to_string()],
                name: "Group 2".to_string(),
                ..Default::default()
            },
        ]),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_header() {
    let settings = LandscapeSettings {
        header: Some(Header {
            links: Some(HeaderLinks {
                github: Some("https://github.com".to_string()),
            }),
            logo: Some("https://logo.url".to_string()),
            ..Default::default()
        }),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_images() {
    let settings = LandscapeSettings {
        images: Some(Images {
            favicon: Some("https://favicon.url".to_string()),
            open_graph: Some("https://open-graph.url".to_string()),
        }),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_local_favicon() {
    let settings = LandscapeSettings {
        images: Some(Images {
            favicon: Some("images/favicon.png".to_string()),
            ..Default::default()
        }),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_members_category() {
    let settings = LandscapeSettings {
        members_category: Some("Members".to_string()),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_osano() {
    let settings = LandscapeSettings {
        osano: Some(Osano {
            customer_configuration_id: "customer_configuration_id".to_string(),
            customer_id: "customer_id".to_string(),
        }),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_screenshot_width_1001() {
    let settings = LandscapeSettings {
        screenshot_width: Some(1001),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_tags() {
    let settings = LandscapeSettings {
        tags: Some(BTreeMap::from_iter(vec![(
            "tag1".to_string(),
            vec![TagRule {
                category: "Category".to_string(),
                subcategories: Some(vec!["Subcategory".to_string()]),
            }],
        )])),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_accepts_upcoming_event() {
    for (start, end) in [((2025, 1, 1), (2025, 1, 2)), ((2025, 1, 1), (2025, 1, 1))] {
        let settings = LandscapeSettings {
            upcoming_event: Some(UpcomingEvent {
                end: date(end),
                start: date(start),
                ..valid_upcoming_event()
            }),
            ..valid_settings()
        };

        settings.validate().unwrap();
    }
}

#[test]
fn test_landscape_settings_validate_accepts_valid_settings() {
    valid_settings().validate().unwrap();
}

#[test]
fn test_landscape_settings_validate_colors() {
    // Check the accepted color formats
    for value in [
        "rgba(0, 107, 204, 1)",
        "rgba(0,0,0,0.5)",
        "rgba(0,0,0,.5)",
        "rgba(255, 255, 255, 1.0)",
        "rgba( 0 , 0 , 0 , 0 )",
        "rgb(0, 0, 0)",
        "rgb(0, 107, 204)",
    ] {
        let settings = LandscapeSettings {
            colors: colors_with(value),
            ..valid_settings()
        };
        settings.validate().unwrap_or_else(|err| panic!("color {value} rejected: {err:#}"));
    }

    // Check the rejected color formats
    for value in [
        "red; rgba(0,0,0,1)",
        "rgba(0,0,0,1) x",
        "rgba(0,0,0,1.9)",
        "rgba(256,0,0,1)",
        "rgba(0, 107, 204)",
        "rgb(0, 107, 204, 1)",
        "rgb(0, 107, 204, 1, 1)",
        "rgba(\u{660}, \u{661}\u{660}\u{667}, \u{662}\u{660}\u{664}, 1)",
        "invalid-color",
    ] {
        let settings = LandscapeSettings {
            colors: Colors {
                color1: value.to_string(),
                ..valid_colors()
            },
            ..valid_settings()
        };
        let err = settings.validate().unwrap_err();
        assert_eq!(
            format!("{err:#}"),
            r#"color1 is not valid (expected format: "rgba(0, 107, 204, 1)" or "rgb(0, 107, 204)")"#,
            "color: {value}"
        );
    }
}

#[test]
fn test_landscape_settings_validate_footer_links() {
    // Check a valid url is accepted for every kind of link
    for (kind, url) in [
        ("facebook", "https://facebook.com/test"),
        ("flickr", "https://www.flickr.com/test"),
        ("forums", "https://forums.example.com"),
        ("github", "https://github.com/test"),
        ("homepage", "https://example.com"),
        ("instagram", "https://instagram.com/test"),
        ("linkedin", "https://www.linkedin.com/company/test"),
        ("slack", "https://slack.example.com"),
        ("twitch", "https://twitch.tv/test"),
        ("twitter", "https://x.com/test"),
        ("wechat", "https://wechat.example.com"),
        ("youtube", "https://youtube.com/test"),
    ] {
        let settings = LandscapeSettings {
            footer: Some(Footer {
                links: Some(footer_links_with(kind, url)),
                ..Default::default()
            }),
            ..valid_settings()
        };
        settings.validate().unwrap_or_else(|err| panic!("{kind} url rejected: {err:#}"));
    }

    // Check a url from a wrong domain (or with a wrong scheme, for the kinds
    // without a domain) is rejected for every kind of link
    for (kind, url, expected_err) in [
        (
            "facebook",
            "https://example.com/test",
            "expecting https://facebook.com/...",
        ),
        (
            "flickr",
            "https://example.com/test",
            "expecting https://flickr.com/...",
        ),
        ("forums", "ftp://forums.example.com", "invalid scheme"),
        (
            "github",
            "https://notgithub.com/test",
            "expecting https://github.com/...",
        ),
        ("homepage", "ftp://example.com", "invalid scheme"),
        (
            "instagram",
            "https://example.com/test",
            "expecting https://instagram.com/...",
        ),
        (
            "linkedin",
            "https://example.com/test",
            "expecting https://linkedin.com/...",
        ),
        ("slack", "ftp://slack.example.com", "invalid scheme"),
        (
            "twitch",
            "https://example.com/test",
            "expecting https://twitch.tv/...",
        ),
        (
            "twitter",
            "https://dropbox.com/test",
            "expecting https://twitter.com|x.com/...",
        ),
        ("wechat", "ftp://wechat.example.com", "invalid scheme"),
        (
            "youtube",
            "https://example.com/test",
            "expecting https://youtube.com/...",
        ),
    ] {
        let settings = LandscapeSettings {
            footer: Some(Footer {
                links: Some(footer_links_with(kind, url)),
                ..Default::default()
            }),
            ..valid_settings()
        };
        let err = settings.validate().unwrap_err();
        assert_eq!(format!("{err:#}"), format!("invalid {kind} url: {expected_err}"));
    }
}

#[test]
fn test_landscape_settings_validate_rejects_base_path_without_leading_slash() {
    let settings = LandscapeSettings {
        base_path: Some("base_path".to_string()),
        ..valid_settings()
    };

    let err = settings.validate().unwrap_err();
    assert_eq!(format!("{err:#}"), "base_path must start with a slash");
}

#[test]
fn test_landscape_settings_validate_rejects_blank_base_path() {
    for base_path in ["", "   "] {
        let settings = LandscapeSettings {
            base_path: Some(base_path.to_string()),
            ..valid_settings()
        };

        let err = settings.validate().unwrap_err();
        assert_eq!(format!("{err:#}"), "base_path cannot be empty");
    }
}

#[test]
fn test_landscape_settings_validate_rejects_blank_enduser_category() {
    // Setup an end user rule with a blank category
    let settings = LandscapeSettings {
        enduser: Some(vec![EndUserRule {
            category: " ".to_string(),
            subcategories: None,
        }]),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "enduser rule [0] is not valid: category cannot be empty"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_duplicate_group_name() {
    // Setup two groups whose names normalize alike
    let settings = LandscapeSettings {
        groups: Some(vec![
            Group {
                categories: vec!["Category 1".to_string()],
                name: "A B".to_string(),
                ..Default::default()
            },
            Group {
                categories: vec!["Category 2".to_string()],
                name: "A-B".to_string(),
                ..Default::default()
            },
        ]),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "group [A-B] name is duplicated (normalizes to a-b, also used by group [A B])"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_empty_category_name() {
    // Setup a category with an empty name
    let settings = LandscapeSettings {
        categories: Some(vec![Category {
            name: String::new(),
            subcategories: vec!["Subcategory".to_string()],
        }]),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(format!("{err:#}"), "category [0] name cannot be empty");
}

#[test]
fn test_landscape_settings_validate_rejects_empty_category_subcategory() {
    // Setup a category with an empty subcategory
    let settings = LandscapeSettings {
        categories: Some(vec![Category {
            name: "Category".to_string(),
            subcategories: vec![String::new()],
        }]),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "category [Category]: subcategory [0] cannot be empty"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_empty_description() {
    let settings = LandscapeSettings {
        description: Some("   ".to_string()),
        ..valid_settings()
    };

    let err = settings.validate().unwrap_err();
    assert_eq!(format!("{err:#}"), "description cannot be empty");
}

#[test]
fn test_landscape_settings_validate_rejects_empty_enduser_subcategories() {
    // Setup an end user rule with an empty subcategories list
    let settings = LandscapeSettings {
        enduser: Some(vec![EndUserRule {
            category: "Category".to_string(),
            subcategories: Some(vec![]),
        }]),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "enduser rule [0] is not valid: subcategories cannot be empty (omit them to match all the subcategories)"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_empty_featured_item_option_label() {
    // Setup a featured item rule with an option with an empty label
    let settings = LandscapeSettings {
        featured_items: Some(vec![FeaturedItemRule {
            options: vec![FeaturedItemRuleOption {
                value: "Value".to_string(),
                label: Some(String::new()),
                order: Some(1),
            }],
            ..valid_featured_item_rule()
        }]),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "featured item rule [0] is not valid: option label cannot be empty"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_empty_featured_item_option_value() {
    // Setup a featured item rule with an option with an empty value
    let settings = LandscapeSettings {
        featured_items: Some(vec![FeaturedItemRule {
            options: vec![FeaturedItemRuleOption {
                value: String::new(),
                label: Some("Label".to_string()),
                order: Some(1),
            }],
            ..valid_featured_item_rule()
        }]),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "featured item rule [0] is not valid: option value cannot be empty"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_empty_featured_item_options() {
    // Setup a featured item rule without options
    let settings = LandscapeSettings {
        featured_items: Some(vec![FeaturedItemRule {
            options: vec![],
            ..valid_featured_item_rule()
        }]),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "featured item rule [0] is not valid: options cannot be empty"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_empty_footer_text() {
    // Setup a footer with an empty text
    let settings = LandscapeSettings {
        footer: Some(Footer {
            text: Some(String::new()),
            ..Default::default()
        }),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(format!("{err:#}"), "footer text cannot be empty");
}

#[test]
fn test_landscape_settings_validate_rejects_empty_foundation() {
    let settings = LandscapeSettings {
        foundation: String::new(),
        ..valid_settings()
    };

    let err = settings.validate().unwrap_err();
    assert_eq!(format!("{err:#}"), "foundation cannot be empty");
}

#[test]
fn test_landscape_settings_validate_rejects_empty_group_category() {
    // Setup a group with an empty category
    let settings = LandscapeSettings {
        groups: Some(vec![Group {
            categories: vec![String::new()],
            name: "Group 1".to_string(),
            ..Default::default()
        }]),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "group [Group 1]: category [0] cannot be empty"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_empty_group_name() {
    // Setup a group with an empty name
    let settings = LandscapeSettings {
        groups: Some(vec![Group {
            categories: vec!["Category".to_string()],
            name: String::new(),
            ..Default::default()
        }]),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(format!("{err:#}"), "group [0] name cannot be empty");
}

#[test]
fn test_landscape_settings_validate_rejects_empty_header_motd() {
    // Setup a header with an empty message of the day
    let settings = LandscapeSettings {
        header: Some(Header {
            motd: Some(String::new()),
            ..Default::default()
        }),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(format!("{err:#}"), "header motd cannot be empty");
}

#[test]
fn test_landscape_settings_validate_rejects_empty_members_category() {
    let settings = LandscapeSettings {
        members_category: Some(String::new()),
        ..valid_settings()
    };

    let err = settings.validate().unwrap_err();
    assert_eq!(format!("{err:#}"), "members category cannot be empty");
}

#[test]
fn test_landscape_settings_validate_rejects_empty_osano_customer_configuration_id() {
    // Setup osano settings with an empty customer configuration id
    let settings = LandscapeSettings {
        osano: Some(Osano {
            customer_configuration_id: String::new(),
            customer_id: "customer_id".to_string(),
        }),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "osano customer configuration id cannot be empty"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_empty_osano_customer_id() {
    // Setup osano settings with an empty customer id
    let settings = LandscapeSettings {
        osano: Some(Osano {
            customer_configuration_id: "customer_configuration_id".to_string(),
            customer_id: String::new(),
        }),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(format!("{err:#}"), "osano customer id cannot be empty");
}

#[test]
fn test_landscape_settings_validate_rejects_empty_tag_category() {
    // Setup a tag rule with an empty category
    let settings = LandscapeSettings {
        tags: Some(BTreeMap::from_iter(vec![(
            "tag1".to_string(),
            vec![TagRule {
                category: String::new(),
                subcategories: None,
            }],
        )])),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "tag [tag1] rule is not valid: category cannot be empty"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_empty_tag_subcategories() {
    // Setup a tag rule with an empty subcategories list
    let settings = LandscapeSettings {
        tags: Some(BTreeMap::from_iter(vec![(
            "tag1".to_string(),
            vec![TagRule {
                category: "Category".to_string(),
                subcategories: Some(vec![]),
            }],
        )])),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "tag [tag1] rule is not valid: subcategories cannot be empty (omit them to match all the subcategories)"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_invalid_category_subcategory_name() {
    for (subcategories, expected_err) in [
        (
            vec!["Subcategory", "!!!"],
            "category [Category]: subcategory [!!!] must contain at least one letter or digit",
        ),
        (
            vec!["Sub category", "Sub-category"],
            "category [Category]: subcategory [Sub-category] is duplicated (normalizes to sub-category, also used by subcategory [Sub category])",
        ),
    ] {
        // Setup a category override with the subcategories provided
        let settings = LandscapeSettings {
            categories: Some(vec![Category {
                name: "Category".to_string(),
                subcategories: subcategories.into_iter().map(ToString::to_string).collect(),
            }]),
            ..valid_settings()
        };

        // Run the validation and check the error
        let err = settings.validate().unwrap_err();
        assert_eq!(format!("{err:#}"), expected_err);
    }
}

#[test]
fn test_landscape_settings_validate_rejects_invalid_favicon_url() {
    // Setup images with an invalid favicon url
    let settings = LandscapeSettings {
        images: Some(Images {
            favicon: Some("https:// invalid_url".to_string()),
            ..Default::default()
        }),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "invalid favicon url: invalid international domain name"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_invalid_footer_github_url() {
    // Setup a footer with an invalid github link
    let settings = LandscapeSettings {
        footer: Some(Footer {
            links: Some(FooterLinks {
                github: Some("invalid-url".to_string()),
                ..Default::default()
            }),
            ..Default::default()
        }),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "invalid github url: relative URL without a base"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_invalid_footer_logo_url() {
    // Setup a footer with an invalid logo url
    let settings = LandscapeSettings {
        footer: Some(Footer {
            logo: Some("https:// invalid_url".to_string()),
            ..Default::default()
        }),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "invalid footer logo url: invalid international domain name"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_invalid_group_alias() {
    for (aliases, expected_err) in [
        (vec![Some(" "), None], "group [Group 1] alias cannot be empty"),
        (
            vec![Some("a/b"), None],
            "group [Group 1] alias [a/b] cannot contain slashes",
        ),
        (
            vec![Some("projects"), Some("projects")],
            "group [Group 2] alias [projects] is duplicated",
        ),
        (
            vec![Some("stats"), None],
            "group [Group 1] alias [stats] is reserved",
        ),
    ] {
        // Setup two groups with the aliases provided
        let settings = LandscapeSettings {
            groups: Some(
                aliases
                    .into_iter()
                    .enumerate()
                    .map(|(i, alias)| Group {
                        categories: vec![format!("Category {}", i + 1)],
                        name: format!("Group {}", i + 1),
                        alias: alias.map(ToString::to_string),
                        ..Default::default()
                    })
                    .collect(),
            ),
            ..valid_settings()
        };

        // Run the validation and check the error
        let err = settings.validate().unwrap_err();
        assert_eq!(format!("{err:#}"), expected_err);
    }
}

#[test]
fn test_landscape_settings_validate_rejects_invalid_gtm_container_id() {
    for container_id in ["ABC-123", "GTM-", "GTM- ", "gtm-ABC123", "GTMABC123"] {
        // Setup analytics with the invalid container id
        let settings = LandscapeSettings {
            analytics: Some(Analytics {
                gtm: Some(GoogleTagManager {
                    container_id: Some(container_id.to_string()),
                }),
            }),
            ..valid_settings()
        };

        // Run the validation and check the error
        let err = settings.validate().unwrap_err();
        assert_eq!(
            format!("{err:#}"),
            r#"analytics gtm container_id is not valid (expected format: "GTM-XXXXXXX")"#,
            "container_id: {container_id}"
        );
    }
}

#[test]
fn test_landscape_settings_validate_rejects_invalid_header_github_url() {
    // Setup a header with an invalid github link
    let settings = LandscapeSettings {
        header: Some(Header {
            links: Some(HeaderLinks {
                github: Some("invalid-url".to_string()),
            }),
            ..Default::default()
        }),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "invalid github url: relative URL without a base"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_invalid_header_logo_url() {
    // Setup a header with an invalid logo url
    let settings = LandscapeSettings {
        header: Some(Header {
            logo: Some("https:// invalid_url".to_string()),
            ..Default::default()
        }),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "invalid header logo url: invalid international domain name"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_invalid_open_graph_url() {
    for (open_graph, expected_err) in [
        (
            "images/social.jpg",
            "invalid open_graph url: relative URL without a base",
        ),
        (
            "ftp://example.com/social.jpg",
            "invalid open_graph url: invalid scheme",
        ),
    ] {
        // Setup images with the invalid open graph url
        let settings = LandscapeSettings {
            images: Some(Images {
                open_graph: Some(open_graph.to_string()),
                ..Default::default()
            }),
            ..valid_settings()
        };

        // Run the validation and check the error
        let err = settings.validate().unwrap_err();
        assert_eq!(format!("{err:#}"), expected_err);
    }
}

#[test]
fn test_landscape_settings_validate_rejects_invalid_tag_name() {
    for (tag, subcategories, expected_err) in [
        (
            "Bad Tag",
            None,
            "tag [Bad Tag] name is not valid (must use only lowercase letters, digits and hyphens)",
        ),
        ("all", None, "tag [all] name is reserved"),
        (
            "tag1",
            Some(vec!["Subcategory".to_string(), " ".to_string()]),
            "tag [tag1] rule is not valid: subcategory [1] cannot be empty",
        ),
    ] {
        // Setup a tag with the name and rule subcategories provided
        let settings = LandscapeSettings {
            tags: Some(BTreeMap::from_iter(vec![(
                tag.to_string(),
                vec![TagRule {
                    category: "Category".to_string(),
                    subcategories,
                }],
            )])),
            ..valid_settings()
        };

        // Run the validation and check the error
        let err = settings.validate().unwrap_err();
        assert_eq!(format!("{err:#}"), expected_err);
    }
}

#[test]
fn test_landscape_settings_validate_rejects_invalid_upcoming_event() {
    for (upcoming_event, expected_err) in [
        (
            UpcomingEvent {
                name: " ".to_string(),
                ..valid_upcoming_event()
            },
            "upcoming event name cannot be empty",
        ),
        (
            UpcomingEvent {
                end: date((2025, 1, 1)),
                start: date((2025, 1, 2)),
                ..valid_upcoming_event()
            },
            "upcoming event start date cannot be after its end date",
        ),
        (
            UpcomingEvent {
                details_url: "javascript:alert(1)".to_string(),
                ..valid_upcoming_event()
            },
            "invalid upcoming event details url: invalid scheme",
        ),
        (
            UpcomingEvent {
                banner_url: "images/banner.png".to_string(),
                ..valid_upcoming_event()
            },
            "invalid upcoming event banner url: relative URL without a base",
        ),
    ] {
        // Setup settings with the invalid upcoming event
        let settings = LandscapeSettings {
            upcoming_event: Some(upcoming_event),
            ..valid_settings()
        };

        // Run the validation and check the error
        let err = settings.validate().unwrap_err();
        assert_eq!(format!("{err:#}"), expected_err);
    }
}

#[test]
fn test_landscape_settings_validate_rejects_invalid_url() {
    let settings = LandscapeSettings {
        url: "invalid-url".to_string(),
        ..valid_settings()
    };

    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "invalid landscape url: relative URL without a base"
    );
}

#[test]
fn test_landscape_settings_validate_rejects_screenshot_width_1000() {
    let settings = LandscapeSettings {
        screenshot_width: Some(1000),
        ..valid_settings()
    };

    let err = settings.validate().unwrap_err();
    assert_eq!(format!("{err:#}"), "screenshot width must be greater than 1000");
}

#[test]
fn test_landscape_settings_validate_rejects_unknown_exclude_group() {
    // Setup a featured item rule excluding a group that is not defined
    let settings = LandscapeSettings {
        featured_items: Some(vec![FeaturedItemRule {
            exclude: Some(FeaturedItemRuleExclude {
                groups: Some(vec!["members".to_string()]),
            }),
            ..valid_featured_item_rule()
        }]),
        groups: Some(vec![Group {
            categories: vec!["Members".to_string()],
            name: "Members".to_string(),
            ..Default::default()
        }]),
        ..valid_settings()
    };

    // Run the validation and check the error
    let err = settings.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "featured item rule [0] is not valid: excluded group [members] does not match any group name"
    );
}

#[test]
fn test_landscape_settings_validate_skips_local_header_logo() {
    let settings = LandscapeSettings {
        header: Some(Header {
            logo: Some("images/logo.svg".to_string()),
            ..Default::default()
        }),
        ..valid_settings()
    };

    settings.validate().unwrap();
}

#[test]
fn test_category_rule_matches_any_subcategory_when_not_provided() {
    let rule = CategoryRule {
        category: "Category".to_string(),
        subcategories: None,
    };

    assert!(rule.matches("Category", "Subcategory 1"));
    assert!(rule.matches("Category", "Subcategory 2"));
    assert!(!rule.matches("Other category", "Subcategory 1"));
}

#[test]
fn test_category_rule_matches_listed_subcategory() {
    let rule = CategoryRule {
        category: "Category".to_string(),
        subcategories: Some(vec!["Subcategory 1".to_string(), "Subcategory 2".to_string()]),
    };

    assert!(rule.matches("Category", "Subcategory 2"));
}

#[test]
fn test_category_rule_matches_returns_false_for_subcategory_mismatch() {
    let rule = CategoryRule {
        category: "Category".to_string(),
        subcategories: Some(vec!["Subcategory 1".to_string()]),
    };

    assert!(!rule.matches("Category", "Subcategory 2"));
}

#[test]
fn test_colors_default_matches_ui_fallback_stylesheet() {
    // Setup the color variables declared in the UI fallback stylesheet
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../ui/common/src/styles/colors.css");
    let css = fs::read_to_string(&path).unwrap();
    let variable = Regex::new(r"--(color[1-7]):\s*([^;]+);").unwrap();
    let css_colors: BTreeMap<&str, &str> = variable
        .captures_iter(&css)
        .map(|captures| {
            let (_, [name, value]) = captures.extract();
            (name, value.trim())
        })
        .collect();

    // Check every color variable equals the Rust default
    let colors = Colors::default();
    let expected_colors = BTreeMap::from([
        ("color1", colors.color1.as_str()),
        ("color2", colors.color2.as_str()),
        ("color3", colors.color3.as_str()),
        ("color4", colors.color4.as_str()),
        ("color5", colors.color5.as_str()),
        ("color6", colors.color6.as_str()),
        ("color7", colors.color7.as_str()),
    ]);
    assert_eq!(css_colors, expected_colors);
}

#[test]
fn test_settings_colors_default_when_absent() {
    // Run the parsing of some settings without colors
    let raw = "foundation: Foundation\nurl: https://example.url\n";
    let settings = LandscapeSettings::new_from_yaml(raw).unwrap().value;

    // Check the default palette is used and passes the validation
    assert_eq!(settings.colors, Colors::default());
    settings.validate().unwrap();
}

#[test]
fn test_grid_items_size_and_view_mode_parse_kebab_case() {
    for (raw_value, expected_grid_items_size, expected_view_mode) in [
        (
            "grid_items_size: small\nview_mode: grid",
            GridItemsSize::Small,
            ViewMode::Grid,
        ),
        (
            "grid_items_size: medium\nview_mode: card",
            GridItemsSize::Medium,
            ViewMode::Card,
        ),
        (
            "grid_items_size: large\nview_mode: card",
            GridItemsSize::Large,
            ViewMode::Card,
        ),
    ] {
        // Setup settings with the values provided
        let raw = format!("foundation: Foundation\nurl: https://example.url\n{raw_value}\n");

        // Run the parsing and check the values
        let settings = LandscapeSettings::new_from_yaml(&raw).unwrap().value;
        assert_eq!(settings.grid_items_size, Some(expected_grid_items_size));
        assert_eq!(settings.view_mode, Some(expected_view_mode));
    }
}

#[test]
fn test_grid_items_size_rejects_unknown_value() {
    let raw = "foundation: Foundation\nurl: https://example.url\ngrid_items_size: huge\n";
    let err = LandscapeSettings::new_from_yaml(raw).unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "the landscape settings file provided is not valid: invalid yaml file: grid_items_size: unknown variant `huge`, expected one of `small`, `medium`, `large` at line 3 column 18"
    );
}

#[test]
fn test_logos_viewbox_deserializes_partial_object() {
    for (raw_logos_viewbox, expected_logos_viewbox) in [
        (
            "logos_viewbox: {adjust: false}",
            LogosViewbox {
                adjust: false,
                exclude: vec![],
            },
        ),
        (
            "logos_viewbox: {exclude: [a.svg]}",
            LogosViewbox {
                adjust: true,
                exclude: vec!["a.svg".to_string()],
            },
        ),
        ("", LogosViewbox::default()),
    ] {
        // Setup settings with the logos viewbox provided
        let raw = format!("foundation: Foundation\nurl: https://example.url\n{raw_logos_viewbox}\n");

        // Run the parsing and check the logos viewbox
        let settings = LandscapeSettings::new_from_yaml(&raw).unwrap().value;
        assert_eq!(settings.logos_viewbox, expected_logos_viewbox);
    }
}

#[test]
fn test_upcoming_event_rejects_invalid_date() {
    // Setup settings with an upcoming event with an invalid start date
    let raw = r"
foundation: Foundation
url: https://example.url
upcoming_event:
  name: Event
  start: 2025-13-01
  end: 2025-12-02
  banner_url: https://example.com/banner.png
  details_url: https://example.com
";

    // Run the parsing and check the error
    let err = LandscapeSettings::new_from_yaml(raw).unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "the landscape settings file provided is not valid: invalid yaml file: upcoming_event.start: input is out of range at line 6 column 10"
    );
}

// Helpers.

/// Return a set of colors where every color uses the value provided.
fn colors_with(value: &str) -> Colors {
    Colors {
        color1: value.to_string(),
        color2: value.to_string(),
        color3: value.to_string(),
        color4: value.to_string(),
        color5: value.to_string(),
        color6: value.to_string(),
        color7: value.to_string(),
    }
}

/// Return the date for the (year, month, day) provided.
fn date((year, month, day): (i32, u32, u32)) -> NaiveDate {
    NaiveDate::from_ymd_opt(year, month, day).unwrap()
}

/// Return footer links where only the link of the kind provided is set.
fn footer_links_with(kind: &str, url: &str) -> FooterLinks {
    let url = Some(url.to_string());
    match kind {
        "facebook" => FooterLinks {
            facebook: url,
            ..Default::default()
        },
        "flickr" => FooterLinks {
            flickr: url,
            ..Default::default()
        },
        "forums" => FooterLinks {
            forums: url,
            ..Default::default()
        },
        "github" => FooterLinks {
            github: url,
            ..Default::default()
        },
        "homepage" => FooterLinks {
            homepage: url,
            ..Default::default()
        },
        "instagram" => FooterLinks {
            instagram: url,
            ..Default::default()
        },
        "linkedin" => FooterLinks {
            linkedin: url,
            ..Default::default()
        },
        "slack" => FooterLinks {
            slack: url,
            ..Default::default()
        },
        "twitch" => FooterLinks {
            twitch: url,
            ..Default::default()
        },
        "twitter" => FooterLinks {
            twitter: url,
            ..Default::default()
        },
        "wechat" => FooterLinks {
            wechat: url,
            ..Default::default()
        },
        "youtube" => FooterLinks {
            youtube: url,
            ..Default::default()
        },
        _ => panic!("unknown footer link kind: {kind}"),
    }
}

/// Return a valid set of colors.
fn valid_colors() -> Colors {
    colors_with("rgba(0, 107, 204, 1)")
}

/// Return a valid featured item rule with one option.
fn valid_featured_item_rule() -> FeaturedItemRule {
    FeaturedItemRule {
        field: FeaturedItemField::Maturity,
        options: vec![FeaturedItemRuleOption {
            value: "graduated".to_string(),
            label: Some("Graduated".to_string()),
            order: Some(1),
        }],
        exclude: None,
    }
}

/// Return valid settings with only the required fields set.
fn valid_settings() -> LandscapeSettings {
    LandscapeSettings {
        foundation: "Foundation".to_string(),
        url: "https://example.url".to_string(),
        ..Default::default()
    }
}

/// Return a valid upcoming event.
fn valid_upcoming_event() -> UpcomingEvent {
    UpcomingEvent {
        banner_url: "https://example.com/banner.png".to_string(),
        details_url: "https://example.com/event".to_string(),
        end: date((2025, 1, 14)),
        name: "Event".to_string(),
        start: date((2025, 1, 1)),
    }
}

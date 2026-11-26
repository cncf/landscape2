use std::fs;

use serde_json::json;

use super::*;

/// Name of the guide file served by the mock server.
const GUIDE_FILE: &str = "guide.yml";

/// Landscape guide fixture.
const TESTS_GUIDE_FILE: &str = "src/testdata/guide.yml";

#[test]
fn test_guide_source_new_from_url_sets_guide_url() {
    let url = "https://example.url/guide.yml";
    let src = GuideSource::new_from_url(url.to_string());
    assert_eq!(
        src,
        GuideSource {
            guide_file: None,
            guide_url: Some(url.to_string()),
        }
    );
}

#[tokio::test]
async fn test_landscape_guide_new_loads_url() {
    // Setup guide file server
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", format!("/{GUIDE_FILE}").as_str())
        .with_status(200)
        .with_body_from_file(TESTS_GUIDE_FILE)
        .create_async()
        .await;

    // Run the guide load from the url source
    let src = GuideSource::new_from_url(format!("{}/{GUIDE_FILE}", server.url()));
    let guide = LandscapeGuide::new(&src).await.unwrap().unwrap();

    // Check the guide was parsed and that the guide file was requested
    assert_eq!(guide.categories.unwrap()[0].category, "Category 1");
    mock.assert_async().await;
}

#[tokio::test]
async fn test_landscape_guide_new_returns_none_without_source() {
    let src = GuideSource::default();
    assert!(LandscapeGuide::new(&src).await.unwrap().is_none());
}

#[test]
fn test_landscape_guide_new_from_yaml_adds_not_valid_context() {
    // Setup a guide that is valid except for an empty category content
    let raw = r#"
categories:
  - category: Category 1
    content: " "
"#;

    // Run the parsing and check the error
    let err = LandscapeGuide::new_from_yaml(raw).unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "the landscape guide file provided is not valid: category [Category 1] is not valid: content cannot be empty"
    );
}

#[test]
fn test_landscape_guide_new_from_yaml_converts_content_to_html() {
    // Run the parsing of the guide fixture
    let raw = fs::read_to_string(TESTS_GUIDE_FILE).unwrap();
    let parsed = LandscapeGuide::new_from_yaml(&raw).unwrap();

    // Check the category and subcategory content was converted to HTML
    let category = &parsed.value.categories.unwrap()[0];
    assert_eq!(category.content.as_deref(), Some("<p>Category 1 content</p>"));
    assert_eq!(
        category.subcategories.as_ref().unwrap()[0].content,
        "<p>Subcategory 1 content</p>"
    );
    assert_eq!(parsed.warnings, Vec::<String>::new());
}

#[test]
fn test_landscape_guide_new_from_yaml_escapes_raw_html_and_unsafe_links() {
    // Setup a guide with raw HTML and unsafe links in the markdown content
    let raw = r"
categories:
  - category: Category 1
    content: 'Hello <script>alert(1)</script> [x](javascript:alert(1))'
    subcategories:
      - subcategory: Subcategory 1
        content: '<img src=x onerror=alert(1)> [y](vbscript:msgbox(1))'
";

    // Run the parsing
    let guide = LandscapeGuide::new_from_yaml(raw).unwrap().value;

    // Check the raw HTML is escaped and the unsafe links are removed
    let category = &guide.categories.unwrap()[0];
    assert_eq!(
        category.content.as_deref(),
        Some(r#"<p>Hello &lt;script&gt;alert(1)&lt;/script&gt; <a href="">x</a></p>"#)
    );
    assert_eq!(
        category.subcategories.as_ref().unwrap()[0].content,
        r#"<p>&lt;img src=x onerror=alert(1)&gt; <a href="">y</a></p>"#
    );
}

#[test]
fn test_landscape_guide_new_from_yaml_rejects_invalid_yaml() {
    let err = LandscapeGuide::new_from_yaml("categories: [").unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "the landscape guide file provided is not valid: invalid yaml file: did not find expected node content at line 2 column 1, while parsing a flow node"
    );
}

#[test]
fn test_landscape_guide_new_from_yaml_renders_multiple_subcategories() {
    // Setup a guide with a category with three markdown subcategories
    let raw = r"
categories:
  - category: Category 1
    subcategories:
      - subcategory: Subcategory 1
        content: '**First**'
      - subcategory: Subcategory 2
        content: '*Second*'
      - subcategory: Subcategory 3
        content: '`Third`'
";

    // Run the parsing
    let guide = LandscapeGuide::new_from_yaml(raw).unwrap().value;

    // Check every subcategory content was converted to HTML in order
    let category = &guide.categories.unwrap()[0];
    let subcategories: Vec<(&str, &str)> = category
        .subcategories
        .as_ref()
        .unwrap()
        .iter()
        .map(|sc| (sc.subcategory.as_str(), sc.content.as_str()))
        .collect();
    assert_eq!(
        subcategories,
        vec![
            ("Subcategory 1", "<p><strong>First</strong></p>"),
            ("Subcategory 2", "<p><em>Second</em></p>"),
            ("Subcategory 3", "<p><code>Third</code></p>"),
        ]
    );
    assert_eq!(category.content, None);
}

#[test]
fn test_landscape_guide_new_from_yaml_sets_normalized_names() {
    // Setup a guide with names that need normalization, one of them providing
    // its own normalized name
    let raw = r"
categories:
  - category: App Definition & Development
    normalized_name: custom
    subcategories:
      - subcategory: Database & Storage
        content: Subcategory content
  - category: Provisioning
";

    // Run the parsing
    let parsed = LandscapeGuide::new_from_yaml(raw).unwrap();

    // Check the normalized names are set, ignoring the provided one
    let categories = parsed.value.categories.unwrap();
    assert_eq!(categories[0].normalized_name, "app-definition-development");
    assert_eq!(
        categories[0].subcategories.as_ref().unwrap()[0].normalized_name,
        "database-storage"
    );
    assert_eq!(categories[1].normalized_name, "provisioning");

    // Check the provided normalized name is reported as an unknown key
    assert_eq!(
        parsed.warnings,
        vec!["unknown key `categories[].normalized_name` (found once, at categories.0.normalized_name)"]
    );
}

#[test]
fn test_landscape_guide_new_from_yaml_warns_on_category_keywords() {
    // Setup a guide with a category with keywords, and another with none
    let raw = r"
categories:
  - category: Category 1
    keywords:
      - keyword
  - category: Category 2
    keywords: []
    subcategories:
      - subcategory: Subcategory 1
        content: Subcategory 1 content
        keywords:
          - keyword
";

    // Run the parsing and check only the category with keywords is reported
    let parsed = LandscapeGuide::new_from_yaml(raw).unwrap();
    assert_eq!(
        parsed.warnings,
        vec!["category [Category 1]: category keywords are not displayed; set them on subcategories"]
    );
}

#[test]
fn test_landscape_guide_new_from_yaml_warns_on_unknown_key() {
    // Setup a valid guide with a misspelled subcategory keywords key
    let raw = r"
categories:
  - category: Category 1
    subcategories:
      - subcategory: Subcategory 1
        content: Subcategory 1 content
        keyword:
          - keyword
";

    // Run the parsing and check the unknown key is reported
    let parsed = LandscapeGuide::new_from_yaml(raw).unwrap();
    assert_eq!(
        parsed.warnings,
        vec![
            "unknown key `categories[].subcategories[].keyword` (found once, at categories.0.subcategories.0.keyword)"
        ]
    );
}

#[test]
fn test_landscape_guide_validate_accepts_valid_guide() {
    let guide = LandscapeGuide {
        categories: Some(vec![valid_category()]),
    };

    guide.validate().unwrap();
}

#[test]
fn test_landscape_guide_validate_rejects_duplicate_category() {
    // Setup a guide with two categories that normalize to the same name
    let guide = LandscapeGuide {
        categories: Some(vec![
            Category {
                category: "Category 1".to_string(),
                ..valid_category()
            },
            Category {
                category: "category 1".to_string(),
                ..valid_category()
            },
        ]),
    };

    // Run the validation and check the error
    let err = guide.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "category [category 1] is not valid: duplicate category name"
    );
}

#[test]
fn test_landscape_guide_validate_rejects_duplicate_subcategory() {
    // Setup a guide with a category with two subcategories that normalize to
    // the same name, and another category reusing one of them
    let guide = LandscapeGuide {
        categories: Some(vec![
            Category {
                category: "Category 1".to_string(),
                subcategories: Some(vec![Subcategory {
                    subcategory: "Subcategory 1".to_string(),
                    ..valid_subcategory()
                }]),
                ..valid_category()
            },
            Category {
                category: "Category 2".to_string(),
                subcategories: Some(vec![
                    Subcategory {
                        subcategory: "Subcategory 1".to_string(),
                        ..valid_subcategory()
                    },
                    Subcategory {
                        subcategory: "SUBCATEGORY 1".to_string(),
                        ..valid_subcategory()
                    },
                ]),
                ..valid_category()
            },
        ]),
    };

    // Run the validation and check only the duplicate within a category fails
    let err = guide.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "subcategory [SUBCATEGORY 1] in category [Category 2] is not valid: duplicate subcategory name"
    );
}

#[test]
fn test_landscape_guide_validate_rejects_empty_category() {
    // Setup a guide with an empty category name
    let guide = LandscapeGuide {
        categories: Some(vec![Category {
            category: "   ".to_string(),
            ..valid_category()
        }]),
    };

    // Run the validation and check the error
    let err = guide.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "category [0] is not valid: category cannot be empty"
    );
}

#[test]
fn test_landscape_guide_validate_rejects_empty_category_content() {
    // Setup a guide with an empty category content
    let guide = LandscapeGuide {
        categories: Some(vec![Category {
            content: Some("   ".to_string()),
            ..valid_category()
        }]),
    };

    // Run the validation and check the error
    let err = guide.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "category [category] is not valid: content cannot be empty"
    );
}

#[test]
fn test_landscape_guide_validate_rejects_empty_category_keyword() {
    // Setup a guide with an empty category keyword
    let guide = LandscapeGuide {
        categories: Some(vec![Category {
            keywords: Some(vec!["   ".to_string()]),
            ..valid_category()
        }]),
    };

    // Run the validation and check the error
    let err = guide.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "category [category] is not valid: keywords cannot be empty"
    );
}

#[test]
fn test_landscape_guide_validate_rejects_empty_subcategory() {
    // Setup a guide with an empty subcategory name
    let guide = LandscapeGuide {
        categories: Some(vec![Category {
            subcategories: Some(vec![Subcategory {
                subcategory: "   ".to_string(),
                ..valid_subcategory()
            }]),
            ..valid_category()
        }]),
    };

    // Run the validation and check the error
    let err = guide.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "subcategory [0] in category [category] is not valid: subcategory cannot be empty"
    );
}

#[test]
fn test_landscape_guide_validate_rejects_empty_subcategory_content() {
    // Setup a guide with an empty subcategory content
    let guide = LandscapeGuide {
        categories: Some(vec![Category {
            subcategories: Some(vec![Subcategory {
                content: "   ".to_string(),
                ..valid_subcategory()
            }]),
            ..valid_category()
        }]),
    };

    // Run the validation and check the error
    let err = guide.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "subcategory [subcategory] in category [category] is not valid: content cannot be empty"
    );
}

#[test]
fn test_landscape_guide_validate_rejects_empty_subcategory_keyword() {
    // Setup a guide with an empty subcategory keyword
    let guide = LandscapeGuide {
        categories: Some(vec![Category {
            subcategories: Some(vec![Subcategory {
                keywords: Some(vec!["   ".to_string()]),
                ..valid_subcategory()
            }]),
            ..valid_category()
        }]),
    };

    // Run the validation and check the error
    let err = guide.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "subcategory [subcategory] in category [category] is not valid: keywords cannot be empty"
    );
}

#[test]
fn test_landscape_guide_validate_reports_only_failing_subcategory() {
    // Setup a guide with three subcategories where only the last one is invalid
    let guide = LandscapeGuide {
        categories: Some(vec![Category {
            subcategories: Some(vec![
                Subcategory {
                    subcategory: "a".to_string(),
                    ..valid_subcategory()
                },
                Subcategory {
                    subcategory: "b".to_string(),
                    ..valid_subcategory()
                },
                Subcategory {
                    content: "   ".to_string(),
                    subcategory: "c".to_string(),
                    ..valid_subcategory()
                },
            ]),
            ..valid_category()
        }]),
    };

    // Run the validation and check only the failing subcategory is reported
    let err = guide.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "subcategory [c] in category [category] is not valid: content cannot be empty"
    );
}

#[test]
fn test_landscape_guide_category_keywords_not_serialized() {
    // Setup a guide whose category and subcategory have keywords
    let guide = LandscapeGuide {
        categories: Some(vec![valid_category()]),
    };

    // Run the guide serialization
    let value = serde_json::to_value(&guide).unwrap();

    // Check only the subcategory keywords are serialized
    let category = &value["categories"][0];
    assert_eq!(category.get("keywords"), None);
    assert_eq!(category["normalized_name"], json!("category"));
    assert_eq!(category["subcategories"][0]["keywords"], json!(["keyword"]));
}

// Helpers.

/// Return a valid guide category with one valid subcategory.
fn valid_category() -> Category {
    Category {
        category: "category".to_string(),
        normalized_name: "category".to_string(),
        content: Some("content".to_string()),
        keywords: Some(vec!["keyword".to_string()]),
        subcategories: Some(vec![valid_subcategory()]),
    }
}

/// Return a valid guide subcategory.
fn valid_subcategory() -> Subcategory {
    Subcategory {
        content: "content".to_string(),
        normalized_name: "subcategory".to_string(),
        subcategory: "subcategory".to_string(),
        keywords: Some(vec!["keyword".to_string()]),
    }
}

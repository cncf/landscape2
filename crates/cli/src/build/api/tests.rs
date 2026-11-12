use std::collections::BTreeSet;

use chrono::{NaiveDate, TimeZone, Utc};
use landscape2_core::data::{
    Category, Commit, Contributors, ItemFeatured, Organization, Release, RepositoryGithubData, Subcategory,
};
use serde_json::{Value, json};

use super::*;

#[test]
fn test_api_endpoint_counts_match_all_lengths() {
    // Setup the landscape fixture
    let landscape_data = landscape_data();
    let settings = settings();
    let sources = ApiSources {
        landscape_data: &landscape_data,
        settings: &settings,
    };

    // Run the API generation
    let api = Api::new(&sources);

    // Check every count endpoint matches the length of its all endpoint
    let mut checked = 0;
    for (endpoint, data) in &api.endpoints {
        let Some(prefix) = endpoint.strip_suffix("count.json") else {
            continue;
        };
        let count: Value = serde_json::from_str(data).unwrap();
        let all_len = item_ids(&api, &format!("{prefix}all.json")).len();
        assert_eq!(count["count"], json!(all_len), "endpoint: {endpoint}");
        checked += 1;
    }
    assert_eq!(checked, 7);
    assert_eq!(
        api.endpoints["categories/app-definition/count.json"],
        r#"{"count":1}"#
    );
}

#[test]
fn test_api_index_lists_category_paths() {
    // Setup the landscape fixture
    let landscape_data = landscape_data();
    let settings = settings();
    let sources = ApiSources {
        landscape_data: &landscape_data,
        settings: &settings,
    };

    // Run the API generation
    let api = Api::new(&sources);

    // Check the index lists every category path, excluding the members category
    let index: Value = serde_json::from_str(&api.endpoints["index.json"]).unwrap();
    assert_eq!(
        index,
        json!({
            "categories": [
                {
                    "all": "categories/app-definition/all.json",
                    "count": "categories/app-definition/count.json",
                    "name": "App Definition",
                    "normalized_name": "app-definition",
                    "subcategories": [
                        {
                            "all": "categories/app-definition/database/all.json",
                            "count": "categories/app-definition/database/count.json",
                            "name": "Database",
                            "normalized_name": "database"
                        },
                        {
                            "all": "categories/app-definition/streaming/all.json",
                            "count": "categories/app-definition/streaming/count.json",
                            "name": "Streaming",
                            "normalized_name": "streaming"
                        }
                    ]
                },
                {
                    "all": "categories/runtime/all.json",
                    "count": "categories/runtime/count.json",
                    "name": "Runtime",
                    "normalized_name": "runtime",
                    "subcategories": [
                        {
                            "all": "categories/runtime/container-runtime/all.json",
                            "count": "categories/runtime/container-runtime/count.json",
                            "name": "Container Runtime",
                            "normalized_name": "container-runtime"
                        }
                    ]
                }
            ],
            "landscape2_version": env!("CARGO_PKG_VERSION"),
            "members": {
                "all": "members/all.json",
                "count": "members/count.json",
                "end_users": "members/end-users.json"
            },
            "projects": {
                "all": "projects/all.json",
                "count": "projects/count.json",
                "project": "projects/{id}.json"
            }
        })
    );

    // Check every path listed in the index is a published endpoint
    let category_paths = index["categories"].as_array().unwrap().iter().flat_map(|category| {
        let subcategory_paths = category["subcategories"]
            .as_array()
            .unwrap()
            .iter()
            .flat_map(|subcategory| [&subcategory["all"], &subcategory["count"]]);
        [&category["all"], &category["count"]].into_iter().chain(subcategory_paths)
    });
    let other_paths = [
        &index["members"]["all"],
        &index["members"]["count"],
        &index["members"]["end_users"],
        &index["projects"]["all"],
        &index["projects"]["count"],
    ];
    for path in category_paths.chain(other_paths) {
        let path = path.as_str().unwrap();
        assert!(api.endpoints.contains_key(path), "path: {path}");
    }
}

#[test]
fn test_api_item_logo_url_appends_base_path() {
    let settings = LandscapeSettings {
        base_path: Some("/landscape".to_string()),
        ..settings()
    };

    assert_eq!(
        project_logo_url(&settings, "logos/project-a.svg"),
        "https://landscape.example/landscape/logos/project-a.svg"
    );
}

#[test]
fn test_api_item_logo_url_does_not_duplicate_base_path() {
    for url in [
        "https://landscape.example/landscape",
        "https://landscape.example/landscape/",
    ] {
        let settings = LandscapeSettings {
            base_path: Some("/landscape".to_string()),
            url: url.to_string(),
            ..settings()
        };

        assert_eq!(
            project_logo_url(&settings, "logos/project-a.svg"),
            "https://landscape.example/landscape/logos/project-a.svg",
            "url: {url}"
        );
    }
}

#[test]
fn test_api_item_logo_url_empty_when_logo_failed() {
    assert_eq!(project_logo_url(&settings(), ""), "");
}

#[test]
fn test_api_item_logo_url_joins_without_double_slash() {
    let settings = LandscapeSettings {
        url: "https://landscape.example/".to_string(),
        ..settings()
    };

    assert_eq!(
        project_logo_url(&settings, "logos/project-a.svg"),
        "https://landscape.example/logos/project-a.svg"
    );
}

#[test]
fn test_api_new_endpoint_set() {
    // Setup the landscape fixture
    let landscape_data = landscape_data();
    let settings = settings();
    let sources = ApiSources {
        landscape_data: &landscape_data,
        settings: &settings,
    };

    // Run the API generation
    let api = Api::new(&sources);

    // Check the exact set of endpoints published
    let endpoints: BTreeSet<&str> = api.endpoints.keys().map(String::as_str).collect();
    let expected_endpoints = BTreeSet::from([
        "categories/app-definition/all.json",
        "categories/app-definition/count.json",
        "categories/app-definition/database/all.json",
        "categories/app-definition/database/count.json",
        "categories/app-definition/streaming/all.json",
        "categories/app-definition/streaming/count.json",
        "categories/runtime/all.json",
        "categories/runtime/container-runtime/all.json",
        "categories/runtime/container-runtime/count.json",
        "categories/runtime/count.json",
        "index.json",
        "members/all.json",
        "members/count.json",
        "members/end-users.json",
        "projects/all.json",
        "projects/app-definition--database--project-a.json",
        "projects/count.json",
        "projects/runtime--container-runtime--project-b.json",
    ]);
    assert_eq!(endpoints, expected_endpoints);

    // Check the members and projects endpoints content
    assert_eq!(api.endpoints["members/count.json"], r#"{"count":2}"#);
    assert_eq!(
        item_ids(&api, "members/end-users.json"),
        ["members--gold--end-user"]
    );
    assert_eq!(api.endpoints["projects/count.json"], r#"{"count":2}"#);
    assert_eq!(
        item_ids(&api, "projects/all.json"),
        [
            "app-definition--database--project-a",
            "runtime--container-runtime--project-b"
        ]
    );
}

#[test]
fn test_api_project_endpoint_matches_golden() {
    // Setup a landscape with a fully populated project
    let item = full_data_item();
    let landscape_data = LandscapeData {
        categories: vec![category("App Definition", &["Database"])],
        items: vec![item.clone()],
    };
    let settings = LandscapeSettings {
        base_path: Some("/landscape".to_string()),
        ..settings()
    };
    let sources = ApiSources {
        landscape_data: &landscape_data,
        settings: &settings,
    };

    // Run the API generation
    let api = Api::new(&sources);

    // Check the derived values explicitly
    let endpoint = format!("projects/{}.json", item.id);
    let project: Value = serde_json::from_str(&api.endpoints[&endpoint]).unwrap();
    assert_eq!(project["country"], json!("Country"));
    assert_eq!(project["description"], json!("Description"));
    assert_eq!(
        project["logo_url"],
        json!("https://landscape.example/landscape/logos/project.svg")
    );
    assert_eq!(project["repositories"][0]["license"], json!("Apache-2.0"));
    assert_eq!(
        project["repositories"][0]["latest_release"],
        json!("2024-03-02T10:00:00Z")
    );
    assert_eq!(project["website"], json!("https://website.example"));

    // Check the whole endpoint matches the golden file
    let golden: Value = serde_json::from_str(include_str!("testdata/project.json")).unwrap();
    pretty_assertions::assert_eq!(project, golden);
}

#[test]
fn test_api_sorts_items_case_insensitively() {
    // Setup projects whose names sort differently when case is considered
    let names = ["beta", "Alpha", "delta", "Gamma"];
    let landscape_data = LandscapeData {
        categories: vec![category("App Definition", &["Database"])],
        items: names
            .iter()
            .map(|name| data::Item {
                maturity: Some("sandbox".to_string()),
                ..data_item("App Definition", "Database", name)
            })
            .collect(),
    };
    let settings = settings();
    let sources = ApiSources {
        landscape_data: &landscape_data,
        settings: &settings,
    };

    // Run the API generation
    let api = Api::new(&sources);

    // Check the category, subcategory and projects endpoints ignore case
    let expected_ids = [
        "app-definition--database--alpha",
        "app-definition--database--beta",
        "app-definition--database--delta",
        "app-definition--database--gamma",
    ];
    for endpoint in [
        "categories/app-definition/all.json",
        "categories/app-definition/database/all.json",
        "projects/all.json",
    ] {
        assert_eq!(item_ids(&api, endpoint), expected_ids, "endpoint: {endpoint}");
    }
}

#[test]
fn test_api_subcategory_all_excludes_additional_category_items() {
    // Setup an item listed in an additional subcategory
    let item = data::Item {
        additional_categories: Some(vec![AdditionalCategory {
            category: "Runtime".to_string(),
            subcategory: "Container Runtime".to_string(),
        }]),
        ..data_item("App Definition", "Database", "Project A")
    };
    let landscape_data = LandscapeData {
        categories: vec![
            category("App Definition", &["Database"]),
            category("Runtime", &["Container Runtime"]),
        ],
        items: vec![item],
    };
    let settings = settings();
    let sources = ApiSources {
        landscape_data: &landscape_data,
        settings: &settings,
    };

    // Run the API generation
    let api = Api::new(&sources);

    // Check the item is only listed in its primary category endpoints
    assert_eq!(
        item_ids(&api, "categories/app-definition/database/all.json"),
        ["app-definition--database--project-a"]
    );
    assert_eq!(
        item_ids(&api, "categories/runtime/container-runtime/all.json"),
        Vec::<String>::new()
    );
    assert_eq!(
        api.endpoints["categories/runtime/container-runtime/count.json"],
        r#"{"count":0}"#
    );
    assert_eq!(
        item_ids(&api, "categories/runtime/all.json"),
        Vec::<String>::new()
    );
    assert_eq!(api.endpoints["categories/runtime/count.json"], r#"{"count":0}"#);
}

#[test]
fn test_item_annotations_serialize_in_key_order() {
    // Setup an item with annotations provided out of order
    let item = data::Item {
        annotations: Some(BTreeMap::from([
            ("zeta".to_string(), "3".to_string()),
            ("alpha".to_string(), "1".to_string()),
            ("mu".to_string(), "2".to_string()),
        ])),
        ..data_item("App Definition", "Database", "Project A")
    };

    // Run the item serialization
    let json = to_json(&Item::from_data_item(&item, "https://landscape.example"));

    // Check the annotations are serialized sorted by key
    assert!(
        json.contains(r#""annotations":{"alpha":"1","mu":"2","zeta":"3"}"#),
        "json: {json}"
    );
}

#[test]
fn test_item_from_data_item_covers_all_data_item_fields() {
    // Setup a fully populated data item
    let data_item = full_data_item();

    // Run the conversion and serialize both items
    let data_value = serde_json::to_value(&data_item).unwrap();
    let api_value =
        serde_json::to_value(Item::from_data_item(&data_item, "https://landscape.example")).unwrap();
    let data_keys = data_value.as_object().unwrap();
    let api_keys = api_value.as_object().unwrap();

    // Check every serialized data item field is exposed, except the allowlisted ones
    let allowlist = [
        // Exposed as the absolute `logo_url`
        "logo",
        // CLOMonitor data, only used by the web application
        "clomonitor_name",
        "clomonitor_report_summary",
        // Featured information, only used by the web application
        "featured",
        // Crunchbase data, only exposed through derived fields such as `country`
        "crunchbase_data",
    ];
    for key in data_keys.keys() {
        if allowlist.contains(&key.as_str()) {
            continue;
        }
        assert!(api_keys.contains_key(key), "missing api field: {key}");
    }
    assert!(api_keys.contains_key("logo_url"));

    // Check the fields only exposed through the API are present
    for key in [
        "annotations",
        "chat_channel",
        "latest_annual_review_at",
        "latest_annual_review_url",
        "lfx_slug",
        "training_certifications",
        "training_type",
        "unnamed_organization",
    ] {
        assert!(!data_keys.contains_key(key), "data field not skipped: {key}");
        assert!(api_keys.contains_key(key), "missing api field: {key}");
    }
}

#[test]
fn test_repository_from_falls_back_to_github_license() {
    let repository = data::Repository {
        github_data: Some(github_data(Some("MIT"))),
        ..Default::default()
    };

    assert_eq!(Repository::from(&repository).license.as_deref(), Some("MIT"));
}

#[test]
fn test_repository_from_prefers_license_override() {
    let repository = data::Repository {
        github_data: Some(github_data(Some("MIT"))),
        license: Some("Apache-2.0".to_string()),
        ..Default::default()
    };

    assert_eq!(
        Repository::from(&repository).license.as_deref(),
        Some("Apache-2.0")
    );
}

#[test]
fn test_repository_from_without_license_returns_none() {
    let repository = data::Repository {
        github_data: Some(github_data(None)),
        ..Default::default()
    };

    assert_eq!(Repository::from(&repository).license, None);
}

// Helpers.

/// Returns a category with the subcategories provided.
fn category(name: &str, subcategories: &[&str]) -> Category {
    Category {
        name: name.to_string(),
        normalized_name: normalize(name),
        subcategories: subcategories
            .iter()
            .map(|subcategory| Subcategory {
                name: (*subcategory).to_string(),
                normalized_name: normalize(subcategory),
            })
            .collect(),
    }
}

/// Returns an item, as prepared by the build (logo already processed), with
/// the required fields set from its category, subcategory and name.
fn data_item(category: &str, subcategory: &str, name: &str) -> data::Item {
    data::Item {
        category: category.to_string(),
        homepage_url: format!("https://{}.example", normalize(name)),
        id: format!(
            "{}--{}--{}",
            normalize(category),
            normalize(subcategory),
            normalize(name)
        ),
        logo: format!("logos/{}.svg", normalize(name)),
        name: name.to_string(),
        subcategory: subcategory.to_string(),
        website: format!("https://{}.example", normalize(name)),
        ..Default::default()
    }
}

/// Returns a project item, as prepared by the build (logo already processed),
/// with every optional field set.
fn full_data_item() -> data::Item {
    let date = NaiveDate::from_ymd_opt(2024, 1, 2).unwrap();
    let ts = Utc.with_ymd_and_hms(2024, 3, 2, 10, 0, 0).unwrap();
    data::Item {
        category: "App Definition".to_string(),
        homepage_url: "https://github.com/org/project".to_string(),
        id: "app-definition--database--project".to_string(),
        logo: "logos/project.svg".to_string(),
        name: "Project".to_string(),
        subcategory: "Database".to_string(),
        website: "https://website.example".to_string(),
        accepted_at: Some(date),
        additional_categories: Some(vec![AdditionalCategory {
            category: "Runtime".to_string(),
            subcategory: "Container Runtime".to_string(),
        }]),
        annotations: Some(BTreeMap::from([("key".to_string(), "value".to_string())])),
        archived_at: Some(date),
        artwork_url: Some("https://artwork.example".to_string()),
        audits: Some(vec![ItemAudit {
            date,
            kind: "security".to_string(),
            url: "https://audit.example".to_string(),
            vendor: "Vendor".to_string(),
        }]),
        blog_url: Some("https://blog.example".to_string()),
        bluesky_url: Some("https://bsky.app/profile/project".to_string()),
        chat_channel: Some("#project".to_string()),
        clomonitor_name: Some("project".to_string()),
        clomonitor_report_summary: Some("clomonitor/project.svg".to_string()),
        crunchbase_data: Some(Organization {
            generated_at: ts,
            country: Some("Country".to_string()),
            ..Default::default()
        }),
        crunchbase_url: Some("https://www.crunchbase.com/organization/org".to_string()),
        description: Some("Description".to_string()),
        devstats_url: Some("https://devstats.example".to_string()),
        discord_url: Some("https://discord.example".to_string()),
        docker_url: Some("https://hub.docker.com/r/org/project".to_string()),
        documentation_url: Some("https://docs.example".to_string()),
        enduser: Some(false),
        facebook_url: Some("https://facebook.com/project".to_string()),
        featured: Some(ItemFeatured {
            label: Some("Graduated".to_string()),
            order: Some(1),
            ..Default::default()
        }),
        funding_url: Some("https://funding.example".to_string()),
        github_discussions_url: Some("https://github.com/org/project/discussions".to_string()),
        gitter_url: Some("https://gitter.im/project".to_string()),
        graduated_at: Some(date),
        incubating_at: Some(date),
        joined_at: Some(date),
        latest_annual_review_at: Some(date),
        latest_annual_review_url: Some("https://review.example".to_string()),
        lfx_slug: Some("project".to_string()),
        linkedin_url: Some("https://linkedin.com/company/project".to_string()),
        mailing_list_url: Some("https://lists.example".to_string()),
        maturity: Some("graduated".to_string()),
        member_subcategory: Some("Gold".to_string()),
        openssf_best_practices_url: Some("https://www.bestpractices.dev/projects/1".to_string()),
        oss: Some(true),
        other_links: Some(vec![ItemLink {
            name: "Link".to_string(),
            url: "https://link.example".to_string(),
        }]),
        package_manager_url: Some("https://crates.io/crates/project".to_string()),
        parent_project: Some("Parent".to_string()),
        pinterest_url: Some("https://pinterest.com/project".to_string()),
        reddit_url: Some("https://reddit.com/r/project".to_string()),
        repositories: Some(vec![full_repository()]),
        slack_url: Some("https://slack.example".to_string()),
        specification: Some(false),
        stack_overflow_url: Some("https://stackoverflow.com/questions/tagged/project".to_string()),
        summary: Some(ItemSummary {
            use_case: Some("Use case".to_string()),
            ..Default::default()
        }),
        tag: Some(vec!["app-delivery".to_string()]),
        training_certifications: Some("Certification".to_string()),
        training_type: Some("Course".to_string()),
        twitter_url: Some("https://twitter.com/project".to_string()),
        unnamed_organization: Some(false),
        youtube_url: Some("https://youtube.com/project".to_string()),
    }
}

/// Returns a primary repository with a license override and every optional
/// field set, including its GitHub data.
fn full_repository() -> data::Repository {
    let ts = Utc.with_ymd_and_hms(2024, 3, 2, 10, 0, 0).unwrap();
    data::Repository {
        url: "https://github.com/org/project".to_string(),
        branch: Some("main".to_string()),
        github_data: Some(RepositoryGithubData {
            contributors: Contributors {
                count: 10,
                url: "https://github.com/org/project/graphs/contributors".to_string(),
            },
            generated_at: ts,
            latest_commit: Commit {
                url: "https://github.com/org/project/commit/1".to_string(),
                ts: Some(ts),
            },
            stars: 100,
            url: "https://github.com/org/project".to_string(),
            languages: Some(BTreeMap::from([("Rust".to_string(), 1000)])),
            latest_release: Some(Release {
                url: "https://github.com/org/project/releases/tag/v1.0.0".to_string(),
                ts: Some(ts),
            }),
            license: Some("MIT".to_string()),
            ..Default::default()
        }),
        license: Some("Apache-2.0".to_string()),
        primary: Some(true),
    }
}

/// Returns GitHub data with the license provided.
fn github_data(license: Option<&str>) -> RepositoryGithubData {
    RepositoryGithubData {
        license: license.map(ToString::to_string),
        ..Default::default()
    }
}

/// Returns the ids of the items served from the endpoint provided.
fn item_ids(api: &Api, endpoint: &str) -> Vec<String> {
    let items: Vec<Item> = serde_json::from_str(&api.endpoints[endpoint]).unwrap();
    items.into_iter().map(|item| item.id).collect()
}

/// Returns a landscape with a members category, two categories, an end user
/// and two projects.
fn landscape_data() -> LandscapeData {
    LandscapeData {
        categories: vec![
            category("Members", &["Gold", "Silver"]),
            category("App Definition", &["Database", "Streaming"]),
            category("Runtime", &["Container Runtime"]),
        ],
        items: vec![
            data::Item {
                enduser: Some(true),
                ..data_item("Members", "Gold", "End User")
            },
            data_item("Members", "Silver", "Member"),
            data::Item {
                maturity: Some("graduated".to_string()),
                ..data_item("App Definition", "Database", "Project A")
            },
            data::Item {
                maturity: Some("sandbox".to_string()),
                ..data_item("Runtime", "Container Runtime", "Project B")
            },
        ],
    }
}

/// Returns the name provided normalized as the categories names in the
/// fixtures.
fn normalize(name: &str) -> String {
    name.to_lowercase().replace(' ', "-")
}

/// Returns the `logo_url` the API publishes for a project with the logo
/// provided, using the settings provided.
fn project_logo_url(settings: &LandscapeSettings, logo: &str) -> String {
    // Setup a landscape with a single project
    let item = data::Item {
        logo: logo.to_string(),
        maturity: Some("graduated".to_string()),
        ..data_item("App Definition", "Database", "Project A")
    };
    let landscape_data = LandscapeData {
        categories: vec![category("App Definition", &["Database"])],
        items: vec![item],
    };
    let sources = ApiSources {
        landscape_data: &landscape_data,
        settings,
    };

    // Get the logo url from the project endpoint
    let api = Api::new(&sources);
    let project: Item =
        serde_json::from_str(&api.endpoints["projects/app-definition--database--project-a.json"]).unwrap();
    project.logo_url
}

/// Returns the landscape settings used in the fixtures.
fn settings() -> LandscapeSettings {
    LandscapeSettings {
        foundation: "Foundation".to_string(),
        url: "https://landscape.example".to_string(),
        members_category: Some("Members".to_string()),
        ..Default::default()
    }
}

use std::collections::HashMap;

use chrono::NaiveDate;
use landscape2_core::data::{ItemAudit, Organization, Repository, RepositoryGithubData};
use pretty_assertions::assert_eq;

use super::*;

/// Header row of the items.csv file.
const CSV_HEADER: &str = "name,organization,homepage,logo,twitter,crunchbase_url,funding,member,relation,tag,license,headquarters,description,crunchbase_description,crunchbase_homepage,crunchbase_city,crunchbase_region,crunchbase_country,crunchbase_twitter,crunchbase_linkedin,crunchbase_ticker,crunchbase_kind,crunchbase_min_employees,crunchbase_max_employees,category,subcategory,oss,github_repo,github_stars,github_description,github_latest_commit_date,github_latest_commit_link,github_latest_release_date,github_latest_release_link,github_start_commit_date,github_start_commit_link,github_contributors_count,github_contributors_link,accepted,incubation,graduated,dev_stats_url,artwork_url,blog_url,mailing_list_url,slack_url,youtube_url,chat_channel,last_audit_date,last_audit_url,id";

#[test]
fn test_items_csv_header_order_ends_with_id() {
    // Setup a landscape with a single item
    let landscape_data = LandscapeData {
        items: vec![item("A")],
        ..Default::default()
    };

    // Run the CSV generation
    let mut csv = vec![];
    generate_items_csv(csv::Writer::from_writer(&mut csv), &landscape_data).unwrap();

    // Check the full header is written in order, with the id column last
    let csv = String::from_utf8(csv).unwrap();
    assert_eq!(csv.lines().next(), Some(CSV_HEADER));
    assert!(CSV_HEADER.ends_with(",last_audit_url,id"));
}

#[test]
fn test_items_csv_headquarters_joins_present_parts() {
    // Setup items with some or none of the headquarters parts
    let landscape_data = LandscapeData {
        items: vec![
            data::Item {
                crunchbase_data: Some(Organization {
                    city: Some("City".to_string()),
                    country: Some("Country".to_string()),
                    ..Default::default()
                }),
                ..item("A")
            },
            data::Item {
                crunchbase_data: Some(Organization {
                    city: Some("City".to_string()),
                    country: Some("Country".to_string()),
                    region: Some("Region".to_string()),
                    ..Default::default()
                }),
                ..item("B")
            },
            data::Item {
                crunchbase_data: Some(Organization::default()),
                ..item("C")
            },
        ],
        ..Default::default()
    };

    // Run the CSV generation
    let records = items_csv_records(&landscape_data);

    // Check only the present parts are joined
    assert_eq!(records["A"]["headquarters"], "City, Country");
    assert_eq!(records["B"]["headquarters"], "City, Region, Country");
    assert_eq!(records["C"]["headquarters"], "");
}

#[test]
fn test_items_csv_last_audit_is_latest_date() {
    // Setup an item whose audits are not sorted by date
    let landscape_data = LandscapeData {
        items: vec![data::Item {
            audits: Some(vec![audit(2021, 5, 1), audit(2023, 6, 1), audit(2022, 1, 1)]),
            ..item("A")
        }],
        ..Default::default()
    };

    // Run the CSV generation
    let records = items_csv_records(&landscape_data);

    // Check the last audit is the one with the latest date
    assert_eq!(records["A"]["last_audit_date"], "2023-06-01");
    assert_eq!(
        records["A"]["last_audit_url"],
        "https://audits.example/2023-06-01.pdf"
    );
}

#[test]
fn test_items_csv_license_override_beats_github() {
    // Setup items whose primary repository has a GitHub license, one of them
    // overriding it in the data file
    let landscape_data = LandscapeData {
        items: vec![
            data::Item {
                repositories: Some(vec![primary_repository(Some("Apache-2.0"), "MIT License")]),
                ..item("A")
            },
            data::Item {
                repositories: Some(vec![primary_repository(None, "MIT License")]),
                ..item("B")
            },
        ],
        ..Default::default()
    };

    // Run the CSV generation
    let records = items_csv_records(&landscape_data);

    // Check the override is used when set, and the GitHub license otherwise
    assert_eq!(records["A"]["license"], "Apache-2.0");
    assert_eq!(records["B"]["license"], "MIT License");
}

#[test]
fn test_items_csv_relation_maturity_then_member() {
    // Setup a project that is also a member, a member and a plain item
    let landscape_data = LandscapeData {
        items: vec![
            data::Item {
                maturity: Some("graduated".to_string()),
                member_subcategory: Some("Gold".to_string()),
                ..item("A")
            },
            data::Item {
                member_subcategory: Some("Gold".to_string()),
                ..item("B")
            },
            item("C"),
        ],
        ..Default::default()
    };

    // Run the CSV generation
    let records = items_csv_records(&landscape_data);

    // Check the maturity is preferred over the membership
    assert_eq!(records["A"]["relation"], "graduated");
    assert_eq!(records["B"]["relation"], "member");
    assert_eq!(records["C"]["relation"], "");
}

#[test]
fn test_items_csv_twitter_falls_back_to_crunchbase() {
    // Setup items with a Crunchbase twitter url, one of them with its own one
    let crunchbase_data = Some(Organization {
        twitter_url: Some("https://twitter.com/crunchbase".to_string()),
        ..Default::default()
    });
    let landscape_data = LandscapeData {
        items: vec![
            data::Item {
                crunchbase_data: crunchbase_data.clone(),
                twitter_url: Some("https://twitter.com/item".to_string()),
                ..item("A")
            },
            data::Item {
                crunchbase_data,
                ..item("B")
            },
        ],
        ..Default::default()
    };

    // Run the CSV generation
    let records = items_csv_records(&landscape_data);

    // Check the item twitter url is preferred over the Crunchbase one
    assert_eq!(records["A"]["twitter"], "https://twitter.com/item");
    assert_eq!(records["B"]["twitter"], "https://twitter.com/crunchbase");
    assert_eq!(
        records["B"]["crunchbase_twitter"],
        "https://twitter.com/crunchbase"
    );
}

// Helpers.

/// Returns a security audit done on the date provided.
fn audit(year: i32, month: u32, day: u32) -> ItemAudit {
    ItemAudit {
        date: NaiveDate::from_ymd_opt(year, month, day).unwrap(),
        kind: "security".to_string(),
        url: format!("https://audits.example/{year}-{month:02}-{day:02}.pdf"),
        vendor: "Vendor".to_string(),
    }
}

/// Returns an item with the name provided, and the remaining required fields
/// derived from it.
fn item(name: &str) -> data::Item {
    let normalized_name = name.to_lowercase();
    data::Item {
        category: "Category".to_string(),
        homepage_url: format!("https://{normalized_name}.example"),
        id: format!("category--subcategory--{normalized_name}"),
        logo: format!("logos/{normalized_name}.svg"),
        name: name.to_string(),
        subcategory: "Subcategory".to_string(),
        website: format!("https://{normalized_name}.example"),
        ..Default::default()
    }
}

/// Generates the items.csv file for the landscape data provided, returning
/// its records keyed by item name, each one as a map of column values keyed
/// by header.
fn items_csv_records(landscape_data: &LandscapeData) -> HashMap<String, HashMap<String, String>> {
    let mut csv = vec![];
    generate_items_csv(csv::Writer::from_writer(&mut csv), landscape_data).unwrap();

    csv::Reader::from_reader(csv.as_slice())
        .deserialize::<HashMap<String, String>>()
        .map(|record| {
            let record = record.unwrap();
            (record["name"].clone(), record)
        })
        .collect()
}

/// Returns a primary repository with the license override and the GitHub
/// license provided.
fn primary_repository(license: Option<&str>, github_license: &str) -> Repository {
    Repository {
        url: "https://github.com/org/repo".to_string(),

        github_data: Some(RepositoryGithubData {
            license: Some(github_license.to_string()),
            ..Default::default()
        }),
        license: license.map(ToString::to_string),
        primary: Some(true),
        ..Default::default()
    }
}

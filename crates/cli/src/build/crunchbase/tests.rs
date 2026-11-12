use std::{collections::BTreeMap, fs, path::Path};

use chrono::{TimeDelta, TimeZone};
use landscape2_core::data::Item;
use mockito::Matcher;
use pretty_assertions::assert_eq;
use serde_json::{Value, json};
use tempfile::TempDir;

use super::*;

/// Url of the organization used in most tests.
const ORG_URL: &str = "https://www.crunchbase.com/organization/acme";

/// Url of an organization that belongs to another landscape.
const OTHER_ORG_URL: &str = "https://www.crunchbase.com/organization/other";

#[tokio::test]
async fn test_collect_crunchbase_data_no_client_keeps_stale_entry() {
    // Setup cache with an expired entry
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let stale_org = organization(now() - TimeDelta::days(30));
    write_cache_entries(tmp_dir.path(), &json!({ ORG_URL: stale_org }));

    // Run the collection without a client
    let crunchbase_data =
        collect_crunchbase_data_with(&cache, &landscape_data(&[ORG_URL]), None, now()).await;

    // Check the stale entry is returned
    assert_eq!(
        crunchbase_data,
        BTreeMap::from([(ORG_URL.to_string(), stale_org)])
    );
}

#[tokio::test]
async fn test_collect_crunchbase_data_no_fetch_does_not_overwrite_unreadable_cache() {
    // Setup an unreadable cache file
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let cache_file = tmp_dir.path().join("landscape").join(CRUNCHBASE_CACHE_FILE);
    fs::write(&cache_file, r#"{"version": 1, "entries": {"#).unwrap();

    // Run the collection without a client
    let crunchbase_data =
        collect_crunchbase_data_with(&cache, &landscape_data(&[ORG_URL]), None, now()).await;

    // Check no data is returned and the cache file is left untouched
    assert!(crunchbase_data.is_empty());
    assert_eq!(
        fs::read_to_string(&cache_file).unwrap(),
        r#"{"version": 1, "entries": {"#
    );
}

#[tokio::test]
async fn test_collect_crunchbase_data_preserves_other_landscapes_entries_on_write() {
    // Setup cache with an expired entry and a recent one from another landscape
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let other_org = organization(now() - TimeDelta::days(10));
    write_cache_entries(
        tmp_dir.path(),
        &json!({
            ORG_URL: organization(now() - TimeDelta::days(8)),
            OTHER_ORG_URL: other_org,
        }),
    );

    // Setup client expectations
    let mut cb = MockCB::new();
    expect_organization_fetch(&mut cb);

    // Run the collection
    collect_crunchbase_data_with(&cache, &landscape_data(&[ORG_URL]), Some(Arc::new(cb)), now()).await;

    // Check the cache file keeps the other landscape entry next to the new one
    let cache_file = read_cache_file(tmp_dir.path());
    assert_eq!(cache_file["version"], 1);
    assert_eq!(
        cache_file["entries"][OTHER_ORG_URL],
        serde_json::to_value(&other_org).unwrap()
    );
    assert_eq!(cache_file["entries"][ORG_URL]["name"], "Acme (fetched)");
}

#[tokio::test]
async fn test_collect_crunchbase_data_refresh_failure_keeps_stale_entry() {
    // Setup cache with an expired entry
    let tmp_dir = TempDir::new().unwrap();
    let cache = Cache::new(Some(tmp_dir.path())).unwrap();
    let stale_org = organization(now() - TimeDelta::days(8));
    write_cache_entries(tmp_dir.path(), &json!({ ORG_URL: stale_org }));

    // Setup client expectations
    let mut cb = MockCB::new();
    cb.expect_get_organization()
        .times(1)
        .withf(|permalink| permalink == "acme")
        .returning(|_| Err(format_err!("unexpected status code: 500")));

    // Run the collection
    let crunchbase_data =
        collect_crunchbase_data_with(&cache, &landscape_data(&[ORG_URL]), Some(Arc::new(cb)), now()).await;

    // Check the stale entry is returned
    assert_eq!(
        crunchbase_data,
        BTreeMap::from([(ORG_URL.to_string(), stale_org)])
    );
}

#[tokio::test]
async fn test_collect_organization_data_acquisition_window_boundary() {
    // Setup client expectations returning acquisitions announced exactly 72
    // months before now and one day earlier
    let cb = mock_cb(CBOrganizationEntity {
        cards: CBCards {
            acquiree_acquisitions: Some(vec![
                acquisition("inside", "Inside", NaiveDate::from_ymd_opt(2020, 1, 15).unwrap()),
                acquisition(
                    "outside",
                    "Outside",
                    NaiveDate::from_ymd_opt(2020, 1, 14).unwrap(),
                ),
            ]),
            ..Default::default()
        },
        ..Default::default()
    });

    // Run the collection
    let organization = collect_organization_data(&cb, ORG_URL, now()).await.unwrap();

    // Check only the acquisition inside the window is kept
    assert_eq!(
        organization.acquisitions,
        Some(vec![Acquisition {
            acquiree_cb_permalink: Some("inside".to_string()),
            acquiree_name: Some("Inside".to_string()),
            announced_on: NaiveDate::from_ymd_opt(2020, 1, 15),
            price: Some(1000),
        }])
    );
}

#[tokio::test]
async fn test_collect_organization_data_empty_lists_become_none() {
    // Setup client expectations returning empty lists
    let cb = mock_cb(CBOrganizationEntity {
        cards: CBCards {
            acquiree_acquisitions: Some(vec![]),
            headquarters_address: Some(vec![]),
            raised_funding_rounds: Some(vec![]),
        },
        properties: CBOrganization {
            categories: Some(vec![]),
            ..Default::default()
        },
    });

    // Run the collection
    let organization = collect_organization_data(&cb, ORG_URL, now()).await.unwrap();

    // Check the empty lists are not collected
    assert_eq!(
        organization,
        Organization {
            generated_at: now(),
            ..Default::default()
        }
    );
}

#[tokio::test]
async fn test_collect_organization_data_invalid_url_makes_no_calls() {
    // Setup client expectations
    let mut cb = MockCB::new();
    cb.expect_get_organization().never();

    // Run the collection
    let err = collect_organization_data(&cb, "https://www.crunchbase.com/company/acme", now())
        .await
        .unwrap_err();

    // Check the url is rejected
    assert_eq!(format!("{err:#}"), "invalid crunchbase url");
}

#[tokio::test]
async fn test_collect_organization_data_keeps_categories_with_values() {
    // Setup client expectations returning a category without value
    let cb = mock_cb(CBOrganizationEntity {
        properties: CBOrganization {
            categories: Some(vec![
                CBEntityIdentifier {
                    value: Some("Cloud Computing".to_string()),
                },
                CBEntityIdentifier { value: None },
                CBEntityIdentifier {
                    value: Some("Open Source".to_string()),
                },
            ]),
            ..Default::default()
        },
        ..Default::default()
    });

    // Run the collection
    let organization = collect_organization_data(&cb, ORG_URL, now()).await.unwrap();

    // Check the categories with value are kept
    assert_eq!(
        organization.categories,
        Some(vec!["Cloud Computing".to_string(), "Open Source".to_string()])
    );
}

#[tokio::test]
async fn test_collect_organization_data_kind_set_only_with_funding_total() {
    // Setup client expectations returning a funding total without amount
    let cb = mock_cb(CBOrganizationEntity {
        properties: CBOrganization {
            funding_total: Some(CBFundingTotal { value_usd: None }),
            ..Default::default()
        },
        ..Default::default()
    });

    // Run the collection
    let organization = collect_organization_data(&cb, ORG_URL, now()).await.unwrap();

    // Check the kind is set even without the funding amount
    assert_eq!(organization.funding, None);
    assert_eq!(organization.kind, Some("funding".to_string()));

    // Setup client expectations returning no funding total
    let cb = mock_cb(CBOrganizationEntity::default());

    // Run the collection
    let organization = collect_organization_data(&cb, ORG_URL, now()).await.unwrap();

    // Check the kind is not set
    assert_eq!(organization.funding, None);
    assert_eq!(organization.kind, None);
}

#[tokio::test]
async fn test_collect_organization_data_maps_num_employees_buckets() {
    let cases = [
        (Some("c_00001_00010"), (Some(1), Some(10))),
        (Some("c_00011_00050"), (Some(11), Some(50))),
        (Some("c_00051_00100"), (Some(51), Some(100))),
        (Some("c_00101_00250"), (Some(101), Some(250))),
        (Some("c_00251_00500"), (Some(251), Some(500))),
        (Some("c_00501_01000"), (Some(501), Some(1000))),
        (Some("c_01001_05000"), (Some(1001), Some(5000))),
        (Some("c_05001_10000"), (Some(5001), Some(10000))),
        (Some("c_10001_max"), (Some(10001), None)),
        (Some("unknown"), (None, None)),
        (None, (None, None)),
    ];
    for (num_employees_enum, (expected_min, expected_max)) in cases {
        // Setup client expectations returning the employees range
        let cb = mock_cb(CBOrganizationEntity {
            properties: CBOrganization {
                num_employees_enum: num_employees_enum.map(ToString::to_string),
                ..Default::default()
            },
            ..Default::default()
        });

        // Run the collection
        let organization = collect_organization_data(&cb, ORG_URL, now()).await.unwrap();

        // Check the employees range bounds
        assert_eq!(
            (organization.num_employees_min, organization.num_employees_max),
            (expected_min, expected_max),
            "{num_employees_enum:?}"
        );
    }
}

#[test]
fn test_cbapi_new_key_with_newline_returns_error() {
    let err = CBApi::new("key\nvalue", "http://127.0.0.1").map(|_| ()).unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "invalid CRUNCHBASE_API_KEY value: failed to parse header value"
    );
}

#[tokio::test]
async fn test_cbapi_non_ok_status_returns_error() {
    // Setup server expectations
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", "/entities/organizations/acme")
        .match_query(Matcher::Any)
        .match_header("x-cb-user-key", "key")
        .with_status(401)
        .with_header("content-type", "application/json")
        .with_body("{}")
        .expect(1)
        .create_async()
        .await;

    // Run the request
    let cb = CBApi::new("key", &server.url()).unwrap();
    let err = cb.get_organization("acme").await.unwrap_err();

    // Check the status error is returned
    assert_eq!(format!("{err:#}"), "unexpected status code: 401 Unauthorized");
    mock.assert_async().await;
}

#[test]
fn test_get_location_value_missing_value_returns_none() {
    let addresses = vec![CBAddress {
        location_identifiers: Some(vec![CBLocationIdentifier {
            location_type: Some("city".to_string()),
            value: None,
        }]),
    }];
    assert_eq!(get_location_value(Some(&addresses), "city"), None);
}

#[test]
fn test_get_location_value_uses_first_address() {
    let addresses = vec![
        address(&[("city", "Madrid"), ("country", "Spain")]),
        address(&[("city", "Lisbon"), ("country", "Portugal"), ("region", "Lisboa")]),
    ];
    assert_eq!(
        get_location_value(Some(&addresses), "city"),
        Some("Madrid".to_string())
    );
    assert_eq!(
        get_location_value(Some(&addresses), "country"),
        Some("Spain".to_string())
    );
    assert_eq!(get_location_value(Some(&addresses), "region"), None);
}

// Helpers.

/// Returns an acquisition of the organization provided (permalink and name)
/// announced on the date provided.
fn acquisition(permalink: &str, name: &str, announced_on: NaiveDate) -> CBAcquisition {
    CBAcquisition {
        acquiree_identifier: Some(CBAcquireeIdentifier {
            permalink: Some(permalink.to_string()),
            value: Some(name.to_string()),
        }),
        announced_on: Some(CBAcquisitionAnnouncedOn {
            value: Some(announced_on),
        }),
        price: Some(CBAcquisitionPrice {
            value_usd: Some(1000),
        }),
    }
}

/// Returns an address with the locations (type and value) provided.
fn address(locations: &[(&str, &str)]) -> CBAddress {
    CBAddress {
        location_identifiers: Some(
            locations
                .iter()
                .map(|(location_type, value)| CBLocationIdentifier {
                    location_type: Some((*location_type).to_string()),
                    value: Some((*value).to_string()),
                })
                .collect(),
        ),
    }
}

/// Sets up the expectations of a successful fetch of the `acme` organization.
fn expect_organization_fetch(cb: &mut MockCB) {
    cb.expect_get_organization()
        .times(1)
        .withf(|permalink| permalink == "acme")
        .returning(|_| {
            Ok(CBOrganizationEntity {
                properties: CBOrganization {
                    name: Some("Acme (fetched)".to_string()),
                    ..Default::default()
                },
                ..Default::default()
            })
        });
}

/// Returns a landscape with one item for each of the organizations provided.
fn landscape_data(crunchbase_urls: &[&str]) -> LandscapeData {
    LandscapeData {
        items: crunchbase_urls
            .iter()
            .map(|url| Item {
                crunchbase_url: Some((*url).to_string()),
                ..Default::default()
            })
            .collect(),
        ..Default::default()
    }
}

/// Returns a client that returns the organization entity provided once for
/// the `acme` organization.
fn mock_cb(entity: CBOrganizationEntity) -> MockCB {
    let mut cb = MockCB::new();
    cb.expect_get_organization()
        .times(1)
        .withf(|permalink| permalink == "acme")
        .return_once(move |_| Ok(entity));
    cb
}

/// Returns the fixed time used as the current time in the tests.
fn now() -> DateTime<Utc> {
    Utc.with_ymd_and_hms(2026, 1, 15, 0, 0, 0).unwrap()
}

/// Returns some cached organization data generated at the time provided.
fn organization(generated_at: DateTime<Utc>) -> Organization {
    Organization {
        generated_at,
        name: Some("Acme (cached)".to_string()),
        ..Default::default()
    }
}

/// Reads the Crunchbase cache file as JSON.
fn read_cache_file(tmp_dir: &Path) -> Value {
    serde_json::from_slice(&fs::read(tmp_dir.join("landscape").join(CRUNCHBASE_CACHE_FILE)).unwrap()).unwrap()
}

/// Writes the entries provided to the Crunchbase cache file.
fn write_cache_entries(tmp_dir: &Path, entries: &Value) {
    let cache_file = json!({ "entries": entries, "version": 1 });
    fs::write(
        tmp_dir.join("landscape").join(CRUNCHBASE_CACHE_FILE),
        serde_json::to_vec(&cache_file).unwrap(),
    )
    .unwrap();
}

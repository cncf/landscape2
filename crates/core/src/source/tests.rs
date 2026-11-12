use serde::Deserialize;

use super::*;

/// Path of a fixture that does not exist.
const MISSING_FILE: &str = "src/testdata/missing.yml";

/// Name of the settings file served by the mock server.
const SETTINGS_FILE: &str = "settings.yml";

/// Landscape guide fixture.
const TESTS_GUIDE_FILE: &str = "src/testdata/guide.yml";

#[test]
fn test_source_kind_display_prints_lowercase_name() {
    let names: Vec<String> = [
        SourceKind::Data,
        SourceKind::Games,
        SourceKind::Guide,
        SourceKind::Settings,
    ]
    .iter()
    .map(ToString::to_string)
    .collect();

    assert_eq!(names, ["data", "games", "guide", "settings"]);
}

#[test]
fn test_parse_yaml_rejects_invalid_yaml() {
    let err = parse_yaml::<Document>("entries: [").unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "invalid yaml file: did not find expected node content at line 2 column 1, while parsing a flow node"
    );
}

#[test]
fn test_parse_yaml_reports_unknown_key_once_per_pattern() {
    // Setup a document with unknown keys repeated across sequence entries,
    // nested under an optional struct and at the root
    let raw = r"
entries:
  - name: Entry 1
    organization: Organization 1
    extra:
      url: https://example.com
      foo: bar
  - name: Entry 2
    organization: Organization 2
  - name: Entry 3
    organization: Organization 3
topic: Topic
";

    // Run the parsing
    let parsed: Parsed<Document> = parse_yaml(raw).unwrap();

    // Check the known keys were parsed
    assert_eq!(
        parsed.value,
        Document {
            entries: vec![
                Entry {
                    name: "Entry 1".to_string(),
                    extra: Some(Extra {
                        url: Some("https://example.com".to_string()),
                    }),
                },
                Entry {
                    name: "Entry 2".to_string(),
                    extra: None,
                },
                Entry {
                    name: "Entry 3".to_string(),
                    extra: None,
                },
            ],
        }
    );

    // Check one warning per pattern was reported, in order of appearance
    assert_eq!(
        parsed.warnings,
        vec![
            "unknown key `entries[].organization` (found 3 times, first at entries.0.organization)",
            "unknown key `entries[].extra.foo` (found once, at entries.0.extra.foo)",
            "unknown key `topic` (found once, at topic)",
        ]
    );
}

#[test]
fn test_parse_yaml_returns_no_warnings_without_unknown_keys() {
    let parsed: Parsed<Document> = parse_yaml("entries:\n  - name: Entry 1\n").unwrap();
    assert_eq!(parsed.warnings, Vec::<String>::new());
}

#[tokio::test]
async fn test_read_raw_fetches_url() {
    // Setup settings file server
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", format!("/{SETTINGS_FILE}").as_str())
        .with_status(200)
        .with_body("foundation: Foundation\n")
        .create_async()
        .await;

    // Run the read from the url
    let url = format!("{}/{SETTINGS_FILE}", server.url());
    let raw = read_raw(SourceKind::Settings, None, Some(&url)).await.unwrap();

    // Check the raw content and that the settings file was requested
    assert_eq!(raw.as_deref(), Some("foundation: Foundation\n"));
    mock.assert_async().await;
}

#[tokio::test]
async fn test_read_raw_names_missing_file_in_error() {
    let err = read_raw(SourceKind::Games, Some(Path::new(MISSING_FILE)), None).await.unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        format!("error reading games file {MISSING_FILE}: No such file or directory (os error 2)")
    );
}

#[tokio::test]
async fn test_read_raw_prefers_file_over_url() {
    let raw = read_raw(
        SourceKind::Guide,
        Some(Path::new(TESTS_GUIDE_FILE)),
        Some("http://127.0.0.1:1/guide.yml"),
    )
    .await
    .unwrap();
    assert_eq!(raw, Some(fs::read_to_string(TESTS_GUIDE_FILE).unwrap()));
}

#[tokio::test]
async fn test_read_raw_reads_file() {
    let raw = read_raw(SourceKind::Guide, Some(Path::new(TESTS_GUIDE_FILE)), None).await.unwrap();
    assert_eq!(raw, Some(fs::read_to_string(TESTS_GUIDE_FILE).unwrap()));
}

#[tokio::test]
async fn test_read_raw_rejects_server_error() {
    // Setup settings file server returning a server error
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", format!("/{SETTINGS_FILE}").as_str())
        .with_status(500)
        .create_async()
        .await;

    // Run the read from the url
    let url = format!("{}/{SETTINGS_FILE}", server.url());
    let err = read_raw(SourceKind::Settings, None, Some(&url)).await.unwrap_err();

    // Check the error and that the settings file was requested
    assert_eq!(
        format!("{err:#}"),
        format!(
            "error fetching settings file {url}: HTTP status server error (500 Internal Server Error) for url ({url})"
        )
    );
    mock.assert_async().await;
}

#[tokio::test]
async fn test_read_raw_returns_none_without_file_or_url() {
    let raw = read_raw(SourceKind::Data, None, None).await.unwrap();
    assert!(raw.is_none());
}

// Helpers.

/// Document used to check the unknown keys reporting.
#[derive(Debug, PartialEq, Deserialize)]
struct Document {
    entries: Vec<Entry>,
}

/// Document entry, holding an optional struct.
#[derive(Debug, PartialEq, Deserialize)]
struct Entry {
    name: String,

    extra: Option<Extra>,
}

/// Optional extra information of a document entry.
#[derive(Debug, PartialEq, Deserialize)]
struct Extra {
    url: Option<String>,
}

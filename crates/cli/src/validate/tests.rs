use std::path::PathBuf;

use pretty_assertions::assert_eq;

use super::*;

#[tokio::test]
async fn test_validate_data_unknown_key_reports_warning_and_succeeds() {
    // Run the validation of a data file with an unknown key
    let mut warnings_out = vec![];
    validate_data(&data_source("data-unknown-key.yml"), &mut warnings_out).await.unwrap();

    // Check the unknown key is reported as a warning
    assert_eq!(
        String::from_utf8(warnings_out).unwrap(),
        "warning: unknown key `categories[].subcategories[].items[].unknown_key` \
         (found once, at categories.0.subcategories.0.items.0.unknown_key)\n"
    );
}

#[tokio::test]
async fn test_validate_data_valid_file_succeeds() {
    // Run the validation of a valid data file
    let mut warnings_out = vec![];
    validate_data(&data_source("data.yml"), &mut warnings_out).await.unwrap();

    // Check no warnings are reported
    assert_eq!(String::from_utf8(warnings_out).unwrap(), "");
}

#[tokio::test]
async fn test_validate_games_with_data_file_rejects_unknown_option() {
    // Setup the games arguments, with a data file missing an option item
    let args = ValidateGamesArgs {
        data_file: Some(testdata_path("data.yml")),
        data_url: None,
        games_source: games_source("games-unknown-option.yml"),
    };

    // Run the validation
    let mut warnings_out = vec![];
    let err = validate_games(&args, &mut warnings_out).await.unwrap_err();

    // Check the missing option is reported
    assert_eq!(
        format!("{err:#}"),
        "question [0] is not valid: option [1] item [Item 3] not found in the landscape data"
    );
    assert_eq!(String::from_utf8(warnings_out).unwrap(), "");
}

#[tokio::test]
async fn test_validate_games_without_data_file_skips_items_check() {
    // Setup the games arguments, without a data source
    let args = ValidateGamesArgs {
        data_file: None,
        data_url: None,
        games_source: games_source("games-unknown-option.yml"),
    };

    // Run the validation and check it succeeds
    let mut warnings_out = vec![];
    validate_games(&args, &mut warnings_out).await.unwrap();
    assert_eq!(String::from_utf8(warnings_out).unwrap(), "");
}

#[tokio::test]
async fn test_validate_settings_invalid_file_reports_cause_once() {
    // Setup the settings source, with an invalid url
    let settings_source = SettingsSource {
        settings_file: Some(testdata_path("settings-invalid.yml")),
        settings_url: None,
    };

    // Run the validation
    let mut warnings_out = vec![];
    let err = validate_settings(&settings_source, &mut warnings_out).await.unwrap_err();

    // Check the context and the cause are reported once
    let msg = format!("{err:#}");
    assert_eq!(
        msg,
        "the landscape settings file provided is not valid: invalid landscape url: relative URL without a base"
    );
    assert_eq!(msg.matches("file provided is not valid").count(), 1);
    assert_eq!(msg.matches("invalid landscape url").count(), 1);
}

// Helpers.

/// Returns a data source for the testdata file provided.
fn data_source(file: &str) -> DataSource {
    DataSource {
        data_file: Some(testdata_path(file)),
        data_url: None,
    }
}

/// Returns a games source for the testdata file provided.
fn games_source(file: &str) -> GamesSource {
    GamesSource {
        games_file: Some(testdata_path(file)),
        games_url: None,
    }
}

/// Returns the path of the testdata file provided.
fn testdata_path(file: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/testdata").join(file)
}

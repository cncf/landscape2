use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
};

use jsonschema::Validator;
use landscape2_core::{
    data::LandscapeData,
    games::LandscapeGames,
    guide::LandscapeGuide,
    settings::{LandscapeSettings, RESERVED_GROUP_ALIASES},
};
use serde_json::Value;

/// Landscape data fixture with an item that sets every legacy item and extra
/// key.
const DATA_ALL_FIELDS_FIXTURE: &str = "crates/core/src/testdata/data_all_fields.yml";

/// Reference landscape data file.
const DOCS_DATA: &str = "docs/config/data.yml";

/// Reference landscape games file.
const DOCS_GAMES: &str = "docs/config/games.yml";

/// Reference landscape guide file.
const DOCS_GUIDE: &str = "docs/config/guide.yml";

/// Reference landscape settings file.
const DOCS_SETTINGS: &str = "docs/config/settings.yml";

/// JSON pointer to the item `extra` properties in the data schema.
const ITEM_EXTRA_PROPERTIES_POINTER: &str = concat!(
    "/patternProperties/^(categories|landscape)$/items/properties/subcategories",
    "/items/properties/items/items/properties/extra/properties"
);

/// JSON pointer to the item properties in the data schema.
const ITEM_PROPERTIES_POINTER: &str = concat!(
    "/patternProperties/^(categories|landscape)$/items/properties/subcategories",
    "/items/properties/items/items/properties"
);

/// Landscape data template used by `landscape2 new`.
const TEMPLATE_DATA: &str = "crates/cli/src/new/template/data.yml";

/// Landscape games template used by `landscape2 new`.
const TEMPLATE_GAMES: &str = "crates/cli/src/new/template/games.yml";

/// Landscape guide template used by `landscape2 new`.
const TEMPLATE_GUIDE: &str = "crates/cli/src/new/template/guide.yml";

/// Landscape settings template used by `landscape2 new`.
const TEMPLATE_SETTINGS: &str = "crates/cli/src/new/template/settings.yml";

/// Fields of a valid landscape data item, as flow mapping entries.
const VALID_ITEM: &str = r#"name: Item, homepage_url: "https://item.example", logo: logo.svg"#;

/// Kind of landscape source file, each one with its own JSON schema and
/// parser.
#[derive(Debug, Clone, Copy)]
enum Kind {
    Data,
    Games,
    Guide,
    Settings,
}

#[test]
fn test_legacy_item_fields_documented() {
    // Setup the fixture and the documentation of the data file
    let raw = read_repo_file(DATA_ALL_FIELDS_FIXTURE);
    let docs = read_repo_file(DOCS_DATA);
    let schema = read_schema(Kind::Data);

    // Check the fixture parses and validates without warnings
    let parsed = LandscapeData::new_from_yaml(&raw).unwrap();
    assert_eq!(parsed.warnings, Vec::<String>::new());
    assert_eq!(parsed.value.items.len(), 1);

    // Collect the keys of the fixture item and its extra information
    let fixture = yaml_to_json(&raw);
    let item = fixture.pointer("/categories/0/subcategories/0/items/0").unwrap();
    let item_keys = object_keys(item);
    let extra_keys = object_keys(&item["extra"]);

    // Check every item key is in the schema and in the reference file
    let item_properties = object_keys(schema.pointer(ITEM_PROPERTIES_POINTER).unwrap());
    let extra_properties = object_keys(schema.pointer(ITEM_EXTRA_PROPERTIES_POINTER).unwrap());
    let undocumented_keys: Vec<String> = item_keys
        .iter()
        .filter(|key| !item_properties.contains(*key) || !is_documented_key(&docs, key))
        .chain(
            extra_keys
                .iter()
                .filter(|key| !extra_properties.contains(*key) || !is_documented_key(&docs, key)),
        )
        .cloned()
        .collect();
    assert_eq!(undocumented_keys, Vec::<String>::new());
}

#[test]
fn test_new_template_games_items_exist_in_template_data() {
    // Setup the games and data templates
    let games = LandscapeGames::new_from_yaml(&read_repo_file(TEMPLATE_GAMES)).unwrap().value;
    let data = LandscapeData::new_from_yaml(&read_repo_file(TEMPLATE_DATA)).unwrap().value;

    // Check every quiz option matches an item in the data template
    games.check_items(&data).unwrap();
}

#[test]
fn test_new_templates_parse_and_validate() {
    // Check the data template
    let data = LandscapeData::new_from_yaml(&read_repo_file(TEMPLATE_DATA)).unwrap();
    assert_eq!(data.warnings, Vec::<String>::new());
    assert_eq!(data.value.items.len(), 9);
    let marker_item = data.value.items.iter().find(|item| item.name == "Item 9").unwrap();
    assert_eq!(marker_item.subcategory, "Subcategory 2-2");

    // Check the games template
    let games = LandscapeGames::new_from_yaml(&read_repo_file(TEMPLATE_GAMES)).unwrap();
    assert_eq!(games.warnings, Vec::<String>::new());
    let questions = games.value.quiz.unwrap().questions;
    assert_eq!(questions.len(), 2);
    assert_eq!(questions[0].title, "Which of the following items have feature X?");

    // Check the guide template
    let guide = LandscapeGuide::new_from_yaml(&read_repo_file(TEMPLATE_GUIDE)).unwrap();
    assert_eq!(guide.warnings, Vec::<String>::new());
    let categories = guide.value.categories.unwrap();
    assert_eq!(categories.len(), 2);
    assert_eq!(categories[0].normalized_name, "category-1");

    // Check the settings template
    let settings = LandscapeSettings::new_from_yaml(&read_repo_file(TEMPLATE_SETTINGS)).unwrap();
    assert_eq!(settings.warnings, Vec::<String>::new());
    assert_eq!(settings.value.foundation, "DEMO");
    let groups = settings.value.groups.unwrap();
    assert_eq!(groups.len(), 2);
    assert_eq!(groups[0].normalized_name.as_deref(), Some("some-categories"));
}

#[test]
fn test_reference_and_template_files_match_schemas() {
    // Setup the files to check and the schema of each of them
    let files = [
        (Kind::Data, DOCS_DATA),
        (Kind::Games, DOCS_GAMES),
        (Kind::Guide, DOCS_GUIDE),
        (Kind::Settings, DOCS_SETTINGS),
        (Kind::Data, TEMPLATE_DATA),
        (Kind::Games, TEMPLATE_GAMES),
        (Kind::Guide, TEMPLATE_GUIDE),
        (Kind::Settings, TEMPLATE_SETTINGS),
    ];

    // Validate every file against its schema, collecting the errors found
    let mut errors = vec![];
    for (kind, file) in files {
        let validator = compile_schema(kind);
        let instance = yaml_to_json(&read_repo_file(file));
        for error in validator.iter_errors(&instance) {
            errors.push(format!("{file}: {error} (at {})", error.instance_path()));
        }
    }

    // Check no file has errors
    assert_eq!(errors, Vec::<String>::new());
}

#[test]
fn test_reference_docs_data_parses_and_validates() {
    let parsed = LandscapeData::new_from_yaml(&read_repo_file(DOCS_DATA)).unwrap();
    assert_eq!(parsed.warnings, Vec::<String>::new());
    let names: Vec<&str> = parsed.value.items.iter().map(|item| item.name.as_str()).collect();
    assert_eq!(names, ["My item", "My other item", "My third item"]);
    assert_eq!(parsed.value.items[0].id, "my-category--my-subcategory--my-item");
}

#[test]
fn test_reference_docs_games_parses_and_validates() {
    let parsed = LandscapeGames::new_from_yaml(&read_repo_file(DOCS_GAMES)).unwrap();
    assert_eq!(parsed.warnings, Vec::<String>::new());
    let questions = parsed.value.quiz.unwrap().questions;
    assert_eq!(questions.len(), 1);
    assert_eq!(questions[0].options.len(), 3);
    let correct_option = questions[0].options.iter().find(|option| option.correct).unwrap();
    assert_eq!(correct_option.item, "My item");
}

#[test]
fn test_reference_games_items_exist_in_reference_data() {
    // Setup the reference games and data files
    let games = LandscapeGames::new_from_yaml(&read_repo_file(DOCS_GAMES)).unwrap().value;
    let data = LandscapeData::new_from_yaml(&read_repo_file(DOCS_DATA)).unwrap().value;

    // Check every quiz option matches an item in the reference data
    games.check_items(&data).unwrap();
}

#[test]
fn test_reference_docs_guide_parses_and_validates() {
    let parsed = LandscapeGuide::new_from_yaml(&read_repo_file(DOCS_GUIDE)).unwrap();
    assert_eq!(parsed.warnings, Vec::<String>::new());
    let categories = parsed.value.categories.unwrap();
    assert_eq!(categories.len(), 2);
    assert_eq!(categories[0].normalized_name, "introduction");
    assert_eq!(categories[1].normalized_name, "provisioning");
}

#[test]
fn test_reference_docs_settings_parses_and_validates() {
    let parsed = LandscapeSettings::new_from_yaml(&read_repo_file(DOCS_SETTINGS)).unwrap();
    assert_eq!(parsed.warnings, Vec::<String>::new());
    assert_eq!(parsed.value.foundation, "CNCF");
    let groups = parsed.value.groups.unwrap();
    assert_eq!(groups.len(), 5);
    assert_eq!(groups[0].alias.as_deref(), Some("projects"));
    assert_eq!(
        groups[0].normalized_name.as_deref(),
        Some("projects-and-products")
    );
}

#[test]
fn test_schema_and_parser_agree_on_cases() {
    // Setup the cases, each one expected to be accepted or rejected by both
    let long_title = "a".repeat(201);
    let cases = [
        // Data
        (Kind::Data, "categories: []".to_string(), true),
        (Kind::Data, "categories: [{subcategories: []}]".to_string(), false),
        (Kind::Data, "categories: [{name: Category}]".to_string(), false),
        (Kind::Data, data_item_yaml("extra: {tag: [Bad Tag]}"), false),
        (Kind::Data, data_item_yaml("extra: {tag: ['-']}"), false),
        (Kind::Data, data_item_yaml("extra: {tag: [all]}"), false),
        (Kind::Data, data_item_yaml("extra: {tag: [all-]}"), false),
        (Kind::Data, data_item_yaml("extra: {tag: [all-tags]}"), true),
        (Kind::Data, data_item_yaml("project: '!!'"), false),
        (Kind::Data, data_item_yaml("project: All"), false),
        (Kind::Data, data_item_yaml("project: All!"), false),
        (Kind::Data, data_item_yaml("project: All+"), true),
        (
            Kind::Data,
            data_item_yaml("extra: {annotations: {key: [value]}}"),
            false,
        ),
        (
            Kind::Data,
            data_yaml(r#"name: "", homepage_url: "https://item.example", logo: logo.svg"#),
            false,
        ),
        (
            Kind::Data,
            data_item_yaml("crunchbase: http://crunchbase.com/organization/x/y"),
            false,
        ),
        (
            Kind::Data,
            data_item_yaml("twitter: https://www.twitter.com/x"),
            true,
        ),
        (
            Kind::Data,
            data_item_yaml("extra: {linkedin_url: https://uk.linkedin.com/in/x}"),
            true,
        ),
        (
            Kind::Data,
            data_yaml(r#"name: Item, homepage_url: "https://item.example", logo: Logo.SVG"#),
            true,
        ),
        // Settings
        (
            Kind::Settings,
            settings_yaml("tags: {tag1: [{category: Category}]}"),
            true,
        ),
        (
            Kind::Settings,
            settings_yaml("tags: {Bad Tag: [{category: Category}]}"),
            false,
        ),
        (
            Kind::Settings,
            settings_yaml("tags: {all: [{category: Category}]}"),
            false,
        ),
        (Kind::Settings, settings_yaml("featured_items: []"), true),
        (Kind::Settings, settings_yaml("screenshot_width: 1000"), false),
        (Kind::Settings, settings_yaml("upcoming_event: {}"), false),
        (
            Kind::Settings,
            settings_yaml("footer: {links: {forums: https://forums.example}}"),
            true,
        ),
        // Games
        (
            Kind::Games,
            games_yaml(
                "{title: Title, options: [{item: A, correct: true}, {item: B}, {item: C}, {item: D}, {item: E}]}",
            ),
            false,
        ),
        (
            Kind::Games,
            games_yaml(&format!(
                "{{title: {long_title}, options: [{{item: A, correct: true}}, {{item: B}}]}}"
            )),
            false,
        ),
        (Kind::Games, "quiz: {questions: []}".to_string(), false),
        // Guide
        (Kind::Guide, "{}".to_string(), true),
    ];

    // Run every case through the schema and the parser, collecting mismatches
    let mut mismatches = vec![];
    for (kind, yaml, expect_valid) in cases {
        let schema_valid = compile_schema(kind).is_valid(&yaml_to_json(&yaml));
        let parser_valid = parser_accepts(kind, &yaml);
        if schema_valid != expect_valid || parser_valid != expect_valid {
            mismatches.push(format!(
                "{kind:?} case {yaml:?}: expected valid={expect_valid}, schema={schema_valid}, parser={parser_valid}"
            ));
        }
    }

    // Check both agree with the expected outcome on every case
    assert_eq!(mismatches, Vec::<String>::new());
}

#[test]
fn test_schema_and_parser_reject_reserved_group_aliases() {
    // Setup the settings validator and the schema reserved aliases
    let validator = compile_schema(Kind::Settings);
    let schema = read_schema(Kind::Settings);
    let schema_aliases: BTreeSet<&str> = schema
        .pointer("/properties/groups/items/properties/alias/not/enum")
        .unwrap()
        .as_array()
        .unwrap()
        .iter()
        .map(|alias| alias.as_str().unwrap())
        .collect();

    // Check the schema reserves the same aliases as the parser
    let reserved_aliases: BTreeSet<&str> = RESERVED_GROUP_ALIASES.iter().copied().collect();
    assert_eq!(schema_aliases, reserved_aliases);

    // Check every reserved alias is rejected by both
    let mut accepted_aliases = vec![];
    for alias in RESERVED_GROUP_ALIASES {
        let yaml = group_alias_settings_yaml(alias);
        if validator.is_valid(&yaml_to_json(&yaml)) || parser_accepts(Kind::Settings, &yaml) {
            accepted_aliases.push(*alias);
        }
    }
    assert_eq!(accepted_aliases, Vec::<&str>::new());

    // Check a regular alias is accepted by both
    let yaml = group_alias_settings_yaml("projects");
    assert!(validator.is_valid(&yaml_to_json(&yaml)));
    assert!(parser_accepts(Kind::Settings, &yaml));
}

// Helpers.

/// Compile the JSON schema of the kind of file provided.
fn compile_schema(kind: Kind) -> Validator {
    jsonschema::validator_for(&read_schema(kind)).unwrap()
}

/// Build a landscape data file with a single valid item, extended with the
/// flow mapping entries provided.
fn data_item_yaml(fields: &str) -> String {
    data_yaml(&format!("{VALID_ITEM}, {fields}"))
}

/// Build a landscape data file with a single item, made of the flow mapping
/// entries provided.
fn data_yaml(item: &str) -> String {
    format!("categories: [{{name: Category, subcategories: [{{name: Subcategory, items: [{{{item}}}]}}]}}]")
}

/// Build a games file with a quiz containing the question provided (as a
/// flow mapping).
fn games_yaml(question: &str) -> String {
    format!("quiz: {{questions: [{question}]}}")
}

/// Build a settings file with a group using the alias provided.
fn group_alias_settings_yaml(alias: &str) -> String {
    settings_yaml(&format!(
        "groups: [{{name: Group, alias: {alias}, categories: [Category]}}]"
    ))
}

/// Check if the reference file provided documents the key as a YAML key (a
/// line starting with `<key>:`, optionally as the first key of a list entry).
fn is_documented_key(docs: &str, key: &str) -> bool {
    let prefix = format!("{key}:");
    docs.lines().any(|line| {
        let line = line.trim_start();
        line.strip_prefix("- ").unwrap_or(line).starts_with(&prefix)
    })
}

/// Return the keys of the JSON object provided.
fn object_keys(value: &Value) -> BTreeSet<String> {
    value.as_object().unwrap().keys().cloned().collect()
}

/// Check if the parser of the kind of file provided accepts the raw content.
fn parser_accepts(kind: Kind, raw: &str) -> bool {
    match kind {
        Kind::Data => LandscapeData::new_from_yaml(raw).is_ok(),
        Kind::Games => LandscapeGames::new_from_yaml(raw).is_ok(),
        Kind::Guide => LandscapeGuide::new_from_yaml(raw).is_ok(),
        Kind::Settings => LandscapeSettings::new_from_yaml(raw).is_ok(),
    }
}

/// Read the file provided, relative to the repository root.
fn read_repo_file(rel: &str) -> String {
    fs::read_to_string(repo_path(rel)).unwrap()
}

/// Read the JSON schema of the kind of file provided.
fn read_schema(kind: Kind) -> Value {
    let file = match kind {
        Kind::Data => "docs/config/schema/data.schema.json",
        Kind::Games => "docs/config/schema/games.schema.json",
        Kind::Guide => "docs/config/schema/guide.schema.json",
        Kind::Settings => "docs/config/schema/settings.schema.json",
    };
    serde_json::from_str(&read_repo_file(file)).unwrap()
}

/// Return the absolute path of the file provided, relative to the repository
/// root.
fn repo_path(rel: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..").join(rel)
}

/// Build a settings file with the required fields and the top level entries
/// provided.
fn settings_yaml(fields: &str) -> String {
    format!("foundation: CNCF\nurl: https://landscape.example\n{fields}\n")
}

/// Convert the YAML content provided to a JSON value.
fn yaml_to_json(raw: &str) -> Value {
    serde_yaml::from_str(raw).unwrap()
}

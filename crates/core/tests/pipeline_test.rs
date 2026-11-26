use chrono::{DateTime, TimeZone, Utc};
use landscape2_core::{
    data::{CrunchbaseData, GithubData, ItemFeatured, LandscapeData, Organization, RepositoryGithubData},
    datasets::{Datasets, NewDatasetsInput},
    games::LandscapeGames,
    guide::LandscapeGuide,
    settings::LandscapeSettings,
};

/// Landscape data fixture.
const DATA_FIXTURE: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/testdata/data.yml"));

/// Landscape games fixture.
const GAMES_FIXTURE: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/testdata/games.yml"));

/// Landscape guide fixture.
const GUIDE_FIXTURE: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/testdata/guide.yml"));

/// Landscape settings fixture.
const SETTINGS_FIXTURE: &str =
    include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/testdata/settings.yml"));

#[test]
fn test_enrich_sets_website_from_crunchbase_when_homepage_is_repository() {
    // Setup the landscape data from the fixture
    let mut landscape_data = landscape_data();

    // Setup the Crunchbase data of the item whose homepage is its repository
    let crunchbase_data = CrunchbaseData::from([(
        "https://www.crunchbase.com/organization/item-2".to_string(),
        Organization {
            homepage_url: Some("https://item-2.example".to_string()),
            ..Default::default()
        },
    )]);

    // Run the enrichment
    landscape_data.enrich(
        &LandscapeSettings::default(),
        &crunchbase_data,
        &GithubData::default(),
    );

    // Check the website falls back to the Crunchbase homepage
    let item = landscape_data.items.iter().find(|item| item.name == "Item 2").unwrap();
    assert_eq!(item.homepage_url, "https://github.com/example/item-2");
    assert_eq!(item.website, "https://item-2.example");
}

#[test]
fn test_pipeline_builds_datasets_from_fixtures() {
    // Setup the landscape sources from the fixtures
    let mut landscape_data = landscape_data();
    let settings = LandscapeSettings::new_from_yaml(SETTINGS_FIXTURE).unwrap().value;
    let guide = LandscapeGuide::new_from_yaml(GUIDE_FIXTURE).unwrap().value;
    let games = LandscapeGames::new_from_yaml(GAMES_FIXTURE).unwrap().value;

    // Setup the data collected from Crunchbase and GitHub
    let crunchbase_data = CrunchbaseData::from([
        (
            "https://www.crunchbase.com/organization/item-2".to_string(),
            Organization {
                generated_at: now(),
                homepage_url: Some("https://item-2.example".to_string()),
                ..Default::default()
            },
        ),
        (
            "https://www.crunchbase.com/organization/item-3".to_string(),
            Organization {
                generated_at: now(),
                description: Some("Item 3 organization description".to_string()),
                ..Default::default()
            },
        ),
    ]);
    let github_data = GithubData::from([
        (
            "https://github.com/cncf/landscape2".to_string(),
            RepositoryGithubData {
                description: "Item 1 repository description".to_string(),
                generated_at: now(),
                participation_stats: vec![1, 2, 3],
                url: "https://github.com/cncf/landscape2".to_string(),
                ..Default::default()
            },
        ),
        (
            "https://github.com/example/item-2".to_string(),
            RepositoryGithubData {
                description: "Item 2 repository description".to_string(),
                generated_at: now(),
                participation_stats: vec![4, 5],
                url: "https://github.com/example/item-2".to_string(),
                license: Some("Apache-2.0".to_string()),
                ..Default::default()
            },
        ),
    ]);

    // Run the enrichment and the datasets generation
    landscape_data.enrich(&settings, &crunchbase_data, &github_data);
    let datasets = Datasets::new(&NewDatasetsInput {
        crunchbase_data: &crunchbase_data,
        github_data: &github_data,
        landscape_data: &landscape_data,
        now: now(),
        settings: &settings,
        games: Some(&games),
        guide: Some(&guide),
        qr_code: Some("QR_CODE"),
    });

    // Check the website falls back to the Crunchbase homepage
    let full_item_2 = datasets.full.items.iter().find(|item| item.name == "Item 2").unwrap();
    assert_eq!(full_item_2.website, "https://item-2.example");
    assert_eq!(full_item_2.oss, Some(true));

    // Check the embed items descriptions fall back to the repository and the
    // organization, and that the second path lists item 3 in category 1
    let view = &datasets.embed.views["category_category-1--subcategory-1-1"];
    let descriptions: Vec<(&str, Option<&str>)> =
        view.items.iter().map(|item| (item.name.as_str(), item.description.as_deref())).collect();
    assert_eq!(
        descriptions,
        [
            ("Item 1", Some("This is the description of item 1")),
            ("Item 2", Some("Item 2 repository description")),
            ("Item 3", Some("Item 3 organization description")),
        ]
    );
    assert_eq!(view.items[1].website, "https://item-2.example");

    // Check the TAG enrichment, keeping the TAG set at the item level over the
    // one from the matching settings rule
    let base_items = &datasets.base.items;
    assert_eq!(base_items[0].tag, Some(vec!["app-delivery".to_string()]));
    assert_eq!(base_items[1].tag, None);
    assert_eq!(base_items[2].tag, Some(vec!["observability".to_string()]));

    // Check the featured enrichment, including the groups excluded by the rule
    assert_eq!(
        base_items[0].featured,
        Some(ItemFeatured {
            excluded_groups: Some(vec!["group-2".to_string()]),
            label: Some("Graduated".to_string()),
            order: Some(1),
        })
    );
    assert_eq!(base_items[2].featured, None);

    // Check the stats reference time and the aligned participation stats
    assert_eq!(datasets.stats.generated_at, now());
    let repositories_stats = datasets.stats.repositories.unwrap();
    assert_eq!(repositories_stats.participation_stats, vec![1, 6, 8]);
}

// Helpers.

/// Return the landscape data parsed from the fixture, checking it produced no
/// warnings.
fn landscape_data() -> LandscapeData {
    let parsed = LandscapeData::new_from_yaml(DATA_FIXTURE).unwrap();
    assert_eq!(parsed.warnings, Vec::<String>::new());
    parsed.value
}

/// Return the fixed reference time used to generate the datasets.
fn now() -> DateTime<Utc> {
    Utc.with_ymd_and_hms(2024, 6, 1, 0, 0, 0).unwrap()
}

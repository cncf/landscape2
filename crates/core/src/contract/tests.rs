#[cfg(feature = "ts")]
use std::fs;
use std::path::Path;

use super::*;

#[test]
fn test_dataset_fixtures_are_up_to_date() {
    // Setup the directory where the fixtures are rendered
    let rendered_dir = tempfile::tempdir().unwrap();

    // Render the fixtures and the minimal fixtures
    render_dataset_fixtures(rendered_dir.path(), &build_fixture_datasets(), &FIXTURE_SOURCES).unwrap();
    render_dataset_fixtures(
        &rendered_dir.path().join(MINIMAL_FIXTURES_SUBDIR),
        &build_minimal_fixture_datasets(),
        &MINIMAL_FIXTURE_SOURCES,
    )
    .unwrap();

    // Check the committed fixtures match the rendered ones
    check_generated_dir(Path::new(DATASET_FIXTURES_DIR), rendered_dir.path());
}

#[cfg(feature = "ts")]
#[test]
fn test_ts_types_are_up_to_date() {
    // Setup the directories with the committed and rendered types
    let committed_dir = Path::new(GENERATED_TYPES_DIR);
    let rendered_dir = tempfile::tempdir().unwrap();

    // Export the types into the rendered directory
    export_ts_types(rendered_dir.path()).unwrap();

    // Check the committed types match the rendered ones
    let rendered_core_dir = rendered_dir.path().join("core");
    check_generated_dir(&committed_dir.join("core"), &rendered_core_dir);

    // Check the barrel exports every generated type file
    let barrel = fs::read_to_string(committed_dir.join("index.ts")).unwrap();
    let missing_lines: Vec<String> = list_files(&rendered_core_dir)
        .unwrap()
        .iter()
        .filter_map(|file| file.file_stem().map(|stem| stem.to_string_lossy().to_string()))
        .map(|name| format!("export type * from './core/{name}';"))
        .filter(|line| !barrel.lines().any(|barrel_line| barrel_line == line))
        .collect();
    assert!(
        missing_lines.is_empty(),
        "{}/index.ts lacks these lines: {}",
        committed_dir.display(),
        missing_lines.join(" "),
    );
}

use std::{fs, path::Path};

use clap::Parser;
use itertools::Itertools;
use pretty_assertions::assert_eq;
use tempfile::TempDir;

use crate::cli::{Cli, Command};

use super::*;

/// Files expected in the built-in template.
const TEMPLATE_PATHS: [&str; 5] = [
    "data.yml",
    "games.yml",
    "guide.yml",
    "logos/cncf.svg",
    "settings.yml",
];

#[test]
fn test_new_empty_dir_writes_all_template_files() {
    // Setup an output directory that does not exist yet
    let tmp_dir = TempDir::new().unwrap();
    let output_dir = tmp_dir.path().join("landscape");

    // Run the command
    new(&new_args(&output_dir, false)).unwrap();

    // Check every template file is written, byte-equal to the embedded one
    assert_eq!(template_paths(), TEMPLATE_PATHS);
    assert_eq!(written_paths(&output_dir), TEMPLATE_PATHS);
    for path in TEMPLATE_PATHS {
        let written = fs::read(output_dir.join(path)).unwrap();
        assert_eq!(
            written,
            TemplateFiles::get(path).unwrap().data.as_ref(),
            "path: {path}"
        );
    }
}

#[test]
fn test_new_existing_file_with_force_overwrites() {
    // Setup an output directory with an existing data file
    let tmp_dir = TempDir::new().unwrap();
    fs::write(tmp_dir.path().join("data.yml"), "custom data").unwrap();

    // Run the command forcing it
    new(&new_args(tmp_dir.path(), true)).unwrap();

    // Check the data file is overwritten and the rest written
    let data = fs::read(tmp_dir.path().join("data.yml")).unwrap();
    assert_eq!(data, TemplateFiles::get("data.yml").unwrap().data.as_ref());
    assert_eq!(written_paths(tmp_dir.path()), TEMPLATE_PATHS);
}

#[test]
fn test_new_existing_file_without_force_fails_and_keeps_file() {
    // Setup an output directory with an existing data file and logo
    let tmp_dir = TempDir::new().unwrap();
    fs::write(tmp_dir.path().join("data.yml"), "custom data").unwrap();
    fs::create_dir(tmp_dir.path().join("logos")).unwrap();
    fs::write(tmp_dir.path().join("logos/cncf.svg"), "custom logo").unwrap();

    // Run the command
    let err = new(&new_args(tmp_dir.path(), false)).unwrap_err();

    // Check the existing files are listed in the error
    assert_eq!(
        format!("{err:#}"),
        format!(
            "the output directory already contains some template files, use --force to overwrite them: {}, {}",
            tmp_dir.path().join("data.yml").display(),
            tmp_dir.path().join("logos/cncf.svg").display()
        )
    );

    // Check the existing files are kept and nothing else is written
    assert_eq!(
        fs::read_to_string(tmp_dir.path().join("data.yml")).unwrap(),
        "custom data"
    );
    assert_eq!(
        fs::read_to_string(tmp_dir.path().join("logos/cncf.svg")).unwrap(),
        "custom logo"
    );
    assert_eq!(written_paths(tmp_dir.path()), ["data.yml", "logos/cncf.svg"]);
}

#[test]
fn test_new_printed_build_command_parses() {
    // Run the parsing of the build command printed
    let Command::Build(args) = Cli::try_parse_from(BUILD_COMMAND.split_whitespace()).unwrap().command else {
        panic!("not a build command");
    };

    // Check every path in the command exists in the template
    let template_paths = template_paths();
    let files = [
        args.data_source.data_file,
        args.games_source.games_file,
        args.guide_source.guide_file,
        args.settings_source.settings_file,
    ];
    for file in files {
        let file = file.unwrap().to_string_lossy().to_string();
        assert!(template_paths.contains(&file), "file not in the template: {file}");
    }
    let logos_path = args.logos_source.logos_path.unwrap().to_string_lossy().to_string();
    assert!(template_paths.iter().any(|path| path.starts_with(&format!("{logos_path}/"))));
    assert_eq!(args.output_dir, Path::new("build"));
}

#[test]
fn test_new_templates_include_schema_modeline() {
    // Setup the YAML files in the template
    let yaml_paths: Vec<String> = template_paths()
        .into_iter()
        .filter(|path| Path::new(path).extension().is_some_and(|extension| extension == "yml"))
        .collect();
    assert_eq!(yaml_paths, ["data.yml", "games.yml", "guide.yml", "settings.yml"]);

    // Check each file starts with the modeline of its own schema
    for path in yaml_paths {
        let kind = Path::new(&path).file_stem().unwrap().to_string_lossy();
        let modeline = format!(
            "# yaml-language-server: $schema=https://raw.githubusercontent.com/cncf/landscape2/refs/heads/main/docs/config/schema/{kind}.schema.json\n\n"
        );
        let content = TemplateFiles::get(&path).unwrap().data;
        assert!(
            content.starts_with(modeline.as_bytes()),
            "template {path} does not start with the modeline"
        );
    }
}

// Helpers.

/// Returns the new arguments for the output directory and force flag
/// provided.
fn new_args(output_dir: &Path, force: bool) -> NewArgs {
    NewArgs {
        output_dir: output_dir.to_path_buf(),
        force,
    }
}

/// Returns the sorted paths of the files embedded in the template.
fn template_paths() -> Vec<String> {
    TemplateFiles::iter().map(|path| path.to_string()).sorted().collect()
}

/// Returns the sorted paths, relative to the directory provided, of the files
/// found in it.
fn written_paths(dir: &Path) -> Vec<String> {
    walkdir::WalkDir::new(dir)
        .into_iter()
        .map(Result::unwrap)
        .filter(|entry| entry.file_type().is_file())
        .map(|entry| entry.path().strip_prefix(dir).unwrap().to_string_lossy().replace('\\', "/"))
        .sorted()
        .collect()
}

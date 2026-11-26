//! This module defines the functionality of the new CLI subcommand.

use std::{
    fs::{self, File},
    io::Write,
    path::PathBuf,
    time::Instant,
};

use anyhow::{Context, Result, bail};
use itertools::Itertools;
use rust_embed::RustEmbed;
use tracing::{info, instrument};

/// Command used to build the new landscape from its directory.
const BUILD_COMMAND: &str = "landscape2 build --data-file data.yml --settings-file settings.yml --guide-file guide.yml --games-file games.yml --logos-path logos --output-dir build";

/// Embed landscape template files into binary.
#[derive(RustEmbed)]
#[folder = "src/new/template"]
struct TemplateFiles;

/// New arguments.
#[derive(clap::Args)]
pub struct NewArgs {
    /// Output directory to write files to.
    #[arg(long)]
    output_dir: PathBuf,

    /// Overwrite the template files that already exist in the output
    /// directory.
    #[arg(long)]
    force: bool,
}

/// Create a new landscape from the built-in template.
///
/// Existing files are never overwritten unless forced: when any template file
/// already exists in the output directory, nothing is written.
///
/// # Errors
/// Returns an error if some template files already exist in the output
/// directory (and overwriting them was not forced), or if the output directory
/// or template files cannot be created or written.
#[instrument(skip_all)]
pub fn new(args: &NewArgs) -> Result<()> {
    info!("creating new landscape from the built-in template..");
    let start = Instant::now();

    // Refuse to overwrite existing files, unless forced
    if !args.force {
        let existing_files = TemplateFiles::iter()
            .map(|file_path| args.output_dir.join(file_path.as_ref()))
            .filter(|path| path.exists())
            .sorted()
            .map(|path| path.display().to_string())
            .collect::<Vec<_>>();
        if !existing_files.is_empty() {
            bail!(
                "the output directory already contains some template files, use --force to overwrite them: {}",
                existing_files.join(", ")
            );
        }
    }

    // Copy template files to the output directory
    for file_path in TemplateFiles::iter() {
        let Some(embedded_file) = TemplateFiles::get(&file_path) else {
            continue;
        };
        let path = args.output_dir.join(file_path.as_ref());
        if let Some(parent_path) = path.parent() {
            fs::create_dir_all(parent_path)
                .with_context(|| format!("error creating directory {}", parent_path.display()))?;
        }
        if args.force {
            fs::write(&path, &embedded_file.data)
        } else {
            File::create_new(&path).and_then(|mut file| file.write_all(&embedded_file.data))
        }
        .with_context(|| format!("error writing {}", path.display()))?;
    }

    // Display success message and build instructions
    let duration = start.elapsed().as_secs_f64();
    info!("landscape created! (took: {:.3}s)", duration);
    display_success_msg(&args.output_dir.to_string_lossy());

    Ok(())
}

/// Display success message.
fn display_success_msg(output_dir: &str) {
    println!(
        "\n✅ Landscape created successfully!

You can build it by running the following command:

👉 cd {output_dir} && {BUILD_COMMAND}
"
    );
}

#[cfg(test)]
mod tests;

//! This module defines the functionality of the create CLI subcommand.

use anyhow::Result;
use rust_embed::RustEmbed;
use std::{
    fs::{self, File},
    io::Write,
    path::{Path, PathBuf},
    time::Instant,
};
use tracing::{info, instrument};

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
}

/// Create a new landscape from the built-in template.
#[instrument(skip_all)]
pub fn new(args: &NewArgs) -> Result<()> {
    info!("creating new landscape from the built-in template..");
    let start = Instant::now();

    // Setup output directory
    if !args.output_dir.exists() {
        fs::create_dir_all(&args.output_dir)?;
    }

    // Copy template files to the output directory
    for file_path in TemplateFiles::iter() {
        if let Some(embedded_file) = TemplateFiles::get(&file_path) {
            if let Some(parent_path) = Path::new(file_path.as_ref()).parent() {
                fs::create_dir_all(&args.output_dir.join(parent_path))?;
            }
            let mut file = File::create(&args.output_dir.join(file_path.as_ref()))?;
            file.write_all(&embedded_file.data)?;
        }
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

👉 cd {output_dir} && landscape2 build --data-file data.yml --settings-file settings.yml --guide-file guide.yml --logos-path logos --output-dir build
"
    );
}

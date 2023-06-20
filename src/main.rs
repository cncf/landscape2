#![warn(clippy::all, clippy::pedantic)]

use anyhow::Result;
use build::build;
use clap::{Args, Parser, Subcommand};
use std::path::PathBuf;

mod build;
mod data;
mod datasets;
mod settings;
mod tmpl;

/// CLI arguments.
#[derive(Parser)]
#[command(about, version)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

/// Commands available.
#[derive(Subcommand)]
enum Command {
    /// Build landscape static site.
    Build(BuildArgs),
}

/// Build command arguments.
#[derive(Args)]
struct BuildArgs {
    /// Data source.
    #[command(flatten)]
    data_source: DataSource,

    /// Logos source
    #[command(flatten)]
    logos_source: LogosSource,

    /// Output directory to write files to.
    #[arg(long)]
    output_dir: PathBuf,

    /// Settings source.
    #[command(flatten)]
    settings_source: SettingsSource,
}

/// Landscape data location.
#[derive(Args)]
#[group(required = true, multiple = false)]
struct DataSource {
    /// Landscape data file local path.
    #[arg(long)]
    data_file: Option<PathBuf>,

    /// Landscape data file url.
    #[arg(long)]
    data_url: Option<String>,
}

/// Logos location.
#[derive(Args)]
#[group(required = true, multiple = false)]
struct LogosSource {
    /// Local path where the logos are stored.
    #[arg(long)]
    logos_path: Option<PathBuf>,

    /// Base URL where the logos are hosted.
    #[arg(long)]
    logos_url: Option<String>,
}

/// Landscape settings location.
#[derive(Args)]
#[group(required = true, multiple = false)]
struct SettingsSource {
    /// Landscape settings file local path.
    #[arg(long)]
    settings_file: Option<PathBuf>,

    /// Landscape settings file url.
    #[arg(long)]
    settings_url: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Setup logging
    if std::env::var_os("RUST_LOG").is_none() {
        std::env::set_var("RUST_LOG", "landscape2=debug");
    }
    tracing_subscriber::fmt::init();

    // Run command
    let cli = Cli::parse();
    match &cli.command {
        Command::Build(args) => build(args).await?,
    }

    Ok(())
}

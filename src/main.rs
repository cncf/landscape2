#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::doc_markdown)]

use anyhow::Result;
use build::build;
use clap::{Args, Parser, Subcommand};
use std::{env, path::PathBuf};

mod build;
mod data;
mod datasets;
mod github;
mod settings;
mod tmpl;

/// Environment variable containing a comma separated list of GitHub tokens.
const GITHUB_TOKENS: &str = "GITHUB_TOKENS";

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

    // Read credentials from environment
    let mut credentials = Credentials::default();
    if let Ok(github_tokens) = env::var(GITHUB_TOKENS) {
        credentials.github_tokens = Some(github_tokens.split(',').map(ToString::to_string).collect());
    }

    // Run command
    let cli = Cli::parse();
    match &cli.command {
        Command::Build(args) => build(args, &credentials).await?,
    }

    Ok(())
}

/// Services credentials.
#[derive(Debug, Default)]
pub(crate) struct Credentials {
    pub github_tokens: Option<Vec<String>>,
}

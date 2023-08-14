#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::doc_markdown)]

use anyhow::Result;
use build::build;
use clap::{Args, Parser, Subcommand};
use std::path::PathBuf;

mod build;
mod cache;
mod crunchbase;
mod data;
mod datasets;
mod github;
mod logos;
mod projects;
mod s3;
mod settings;

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
    /// Build landscape website.
    Build(BuildArgs),

    /// Deploy landscape website.
    Deploy(DeployArgs),
}

/// Build command arguments.
#[derive(Args)]
struct BuildArgs {
    /// Cache directory.
    #[arg(long)]
    cache_dir: Option<PathBuf>,

    /// Data source.
    #[command(flatten)]
    data_source: DataSource,

    /// Logos source.
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

/// Landscape logos location.
#[derive(Args, Clone)]
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

/// Deploy command arguments.
#[derive(Debug, Args)]
#[command(args_conflicts_with_subcommands = true)]
struct DeployArgs {
    /// Provider used to deploy the landscape website.
    #[command(subcommand)]
    provider: Provider,
}

/// Provider used to deploy the landscape website.
#[derive(Debug, Subcommand)]
enum Provider {
    /// Deploy landscape website to AWS S3.
    S3(S3Args),
}

/// AWS S3 provider arguments.
#[derive(Debug, Args)]
struct S3Args {
    /// Bucket to copy the landscape website files to.
    #[arg(long)]
    bucket: String,

    /// Location of the landscape website files (build subcommand output).
    #[arg(long)]
    landscape_dir: PathBuf,
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
        Command::Deploy(args) => match &args.provider {
            Provider::S3(args) => s3::deploy(args).await?,
        },
    }

    Ok(())
}

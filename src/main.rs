#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::doc_markdown)]

use anyhow::Result;
use build::build;
use clap::{Args, Parser, Subcommand};
use std::path::PathBuf;
use validate::validate_data;

mod build;
mod cache;
mod crunchbase;
mod data;
mod datasets;
mod github;
mod guide;
mod logos;
mod projects;
mod s3;
mod settings;
mod validate;

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

    /// Deploy landscape website (experimental).
    Deploy(DeployArgs),

    /// Validate landscape data sources files.
    Validate(ValidateArgs),
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

    /// Guide source.
    #[command(flatten)]
    guide_source: GuideSource,

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

/// Landscape guide location.
#[derive(Args)]
#[group(required = false, multiple = false)]
struct GuideSource {
    /// Landscape guide file local path.
    #[arg(long)]
    guide_file: Option<PathBuf>,

    /// Landscape guide file url.
    #[arg(long)]
    guide_url: Option<String>,
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
#[derive(Args)]
#[command(args_conflicts_with_subcommands = true)]
struct DeployArgs {
    /// Provider used to deploy the landscape website.
    #[command(subcommand)]
    provider: Provider,
}

/// Provider used to deploy the landscape website.
#[derive(Subcommand)]
enum Provider {
    /// Deploy landscape website to AWS S3.
    S3(S3Args),
}

/// AWS S3 provider arguments.
#[derive(Args)]
struct S3Args {
    /// Bucket to copy the landscape website files to.
    #[arg(long)]
    bucket: String,

    /// Location of the landscape website files (build subcommand output).
    #[arg(long)]
    landscape_dir: PathBuf,
}

/// Validate command arguments.
#[derive(Args)]
#[command(args_conflicts_with_subcommands = true)]
struct ValidateArgs {
    /// Landscape file to validate.
    #[command(subcommand)]
    target: ValidateTarget,
}

/// Landscape file to validate.
#[derive(Subcommand)]
enum ValidateTarget {
    /// Validate landscape data file.
    Data(DataSource),
}

#[tokio::main]
async fn main() -> Result<()> {
    // Helper function to setup logging
    let setup_logging = || {
        if std::env::var_os("RUST_LOG").is_none() {
            std::env::set_var("RUST_LOG", "landscape2=debug");
        }
        tracing_subscriber::fmt::init();
    };

    // Run command
    let cli = Cli::parse();
    match &cli.command {
        Command::Build(args) => {
            setup_logging();
            build(args).await?;
        }
        Command::Deploy(args) => {
            setup_logging();
            match &args.provider {
                Provider::S3(args) => s3::deploy(args).await?,
            };
        }
        Command::Validate(args) => match &args.target {
            ValidateTarget::Data(src) => validate_data(src).await?,
        },
    }

    Ok(())
}

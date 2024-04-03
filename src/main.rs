#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::doc_markdown, clippy::blocks_in_conditions)]

use anyhow::Result;
use build::build;
use clap::{Args, Parser, Subcommand};
use deploy::s3;
use new::new;
use serve::serve;
use std::path::PathBuf;
use validate::{validate_data, validate_guide, validate_settings};

mod build;
mod deploy;
mod new;
mod serve;
mod validate;

/// CLI arguments.
#[derive(Parser)]
#[command(
    version,
    about = "Landscape2 CLI tool

https://github.com/cncf/landscape2#usage"
)]
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

    /// Create a new landscape from the built-in template.
    New(NewArgs),

    /// Serve landscape website.
    Serve(ServeArgs),

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

/// New command arguments.
#[derive(Args)]
struct NewArgs {
    /// Output directory to write files to.
    #[arg(long)]
    output_dir: PathBuf,
}

/// Serve command arguments.
#[derive(Args)]
struct ServeArgs {
    /// Address the web server will listen on.
    #[arg(long, default_value = "127.0.0.1:8000")]
    addr: String,

    /// Whether the server should stop gracefully or not.
    #[arg(long, default_value_t = false)]
    graceful_shutdown: bool,

    /// Location of the landscape website files (build subcommand output).
    /// The current path will be used when none is provided.
    #[arg(long)]
    landscape_dir: Option<PathBuf>,

    /// Enable silent mode.
    #[arg(long, default_value_t = false)]
    silent: bool,
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

    /// Validate landscape guide file.
    Guide(GuideSource),

    /// Validate landscape settings file.
    Settings(SettingsSource),
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    // Setup logging
    match &cli.command {
        Command::Build(_) | Command::Deploy(_) | Command::New(_) | Command::Serve(_) => {
            if std::env::var_os("RUST_LOG").is_none() {
                std::env::set_var("RUST_LOG", "landscape2=debug");
            }
            tracing_subscriber::fmt::init();
        }
        Command::Validate(_) => {}
    }

    // Run command
    match &cli.command {
        Command::Build(args) => build(args).await?,
        Command::Deploy(args) => {
            match &args.provider {
                Provider::S3(args) => s3::deploy(args).await?,
            };
        }
        Command::New(args) => new(args)?,
        Command::Serve(args) => serve(args).await?,
        Command::Validate(args) => match &args.target {
            ValidateTarget::Data(src) => validate_data(src).await?,
            ValidateTarget::Guide(src) => validate_guide(src).await?,
            ValidateTarget::Settings(src) => validate_settings(src).await?,
        },
    }

    Ok(())
}

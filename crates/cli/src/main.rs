#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::doc_markdown,
    clippy::blocks_in_conditions,
    clippy::module_name_repetitions
)]

use anyhow::Result;
use clap::{Parser, Subcommand};
use landscape2::build::{BuildArgs, build};
use landscape2::deploy::s3::{self};
use landscape2::deploy::{DeployArgs, Provider};
use landscape2::new::{NewArgs, new};
use landscape2::serve::{ServeArgs, serve};
use landscape2::validate::{
    Target, ValidateArgs, validate_data, validate_games, validate_guide, validate_settings,
};
use tracing_subscriber::EnvFilter;

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
#[allow(clippy::large_enum_variant)]
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

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    // Setup logging
    match &cli.command {
        Command::Build(_) | Command::Deploy(_) | Command::New(_) | Command::Serve(_) => {
            let env_filter =
                EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("landscape2=debug"));
            tracing_subscriber::fmt().with_env_filter(env_filter).init();
        }
        Command::Validate(_) => {}
    }

    // Run command
    match &cli.command {
        Command::Build(args) => build(args).await?,
        Command::Deploy(args) => match &args.provider {
            Provider::S3(args) => s3::deploy(args).await?,
        },
        Command::New(args) => new(args)?,
        Command::Serve(args) => serve(args).await?,
        Command::Validate(args) => match &args.target {
            Target::Data(src) => validate_data(src).await?,
            Target::Games(src) => validate_games(src).await?,
            Target::Guide(src) => validate_guide(src).await?,
            Target::Settings(src) => validate_settings(src).await?,
        },
    }

    Ok(())
}

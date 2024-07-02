#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::doc_markdown,
    clippy::blocks_in_conditions,
    clippy::module_name_repetitions
)]

use anyhow::Result;
use clap::{Parser, Subcommand};
use landscape2_academic::build::{build, BuildArgs};
use landscape2_academic::deploy::s3::{self};
use landscape2_academic::deploy::{DeployArgs, Provider};
use landscape2_academic::new::{new, NewArgs};
use landscape2_academic::serve::{serve, ServeArgs};
use landscape2_academic::validate::{validate_data, validate_guide, validate_settings, Target, ValidateArgs};

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
            Target::Data(src) => validate_data(src).await?,
            Target::Guide(src) => validate_guide(src).await?,
            Target::Settings(src) => validate_settings(src).await?,
        },
    }

    Ok(())
}

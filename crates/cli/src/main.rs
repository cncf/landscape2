#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::blocks_in_conditions,
    clippy::doc_markdown,
    clippy::module_name_repetitions
)]

use std::io;

use anyhow::Result;
use clap::Parser;
use landscape2::{
    build::build,
    cli::{Cli, Command},
    deploy::{Provider, s3},
    new::new,
    serve::serve,
    validate::{Target, validate_data, validate_games, validate_guide, validate_settings},
};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    // Setup logging (validate only logs warnings by default, to stderr, as its
    // output is the validation result)
    let is_validate = matches!(cli.command, Command::Validate(_));
    let default_filter = if is_validate {
        "landscape2=warn"
    } else {
        "landscape2=debug"
    };
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(default_filter));
    let subscriber = tracing_subscriber::fmt().with_env_filter(env_filter);
    if is_validate {
        subscriber.with_writer(io::stderr).init();
    } else {
        subscriber.init();
    }

    // Run command
    match &cli.command {
        Command::Build(args) => build(args).await?,
        Command::Deploy(args) => match &args.provider {
            Provider::S3(args) => s3::deploy(args).await?,
        },
        Command::New(args) => new(args)?,
        Command::Serve(args) => serve(args).await?,
        Command::Validate(args) => {
            let warnings_out = &mut io::stderr();
            match &args.target {
                Target::Data(src) => validate_data(src, warnings_out).await?,
                Target::Games(games_args) => validate_games(games_args, warnings_out).await?,
                Target::Guide(src) => validate_guide(src, warnings_out).await?,
                Target::Settings(src) => validate_settings(src, warnings_out).await?,
            }
        }
    }

    Ok(())
}

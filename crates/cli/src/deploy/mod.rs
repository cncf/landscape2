//! This module defines the functionality of the deploy CLI subcommand.

use clap::Subcommand;

pub mod s3;

/// Deploy command arguments.
#[derive(clap::Args)]
#[command(args_conflicts_with_subcommands = true)]
pub struct DeployArgs {
    /// Provider used to deploy the landscape website.
    #[command(subcommand)]
    pub provider: Provider,
}

/// Provider used to deploy the landscape website.
#[derive(Subcommand)]
pub enum Provider {
    /// Deploy landscape website to AWS S3.
    S3(s3::Args),
}

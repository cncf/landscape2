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
    ///
    /// The AWS region and credentials are resolved from the standard AWS
    /// sources (environment variables, shared profiles, SSO or instance
    /// roles). Change detection compares the MD5 digest of each file with the
    /// ETag of the deployed object, so objects encrypted with SSE-KMS or
    /// uploaded in multiple parts are uploaded again on every run.
    S3(s3::Args),
}

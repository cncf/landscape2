//! This module defines the command line interface of the landscape2 tool.

use clap::{Parser, Subcommand};

use crate::{build::BuildArgs, deploy::DeployArgs, new::NewArgs, serve::ServeArgs, validate::ValidateArgs};

/// CLI arguments.
#[derive(Parser)]
#[command(
    version,
    about = "Landscape2 CLI tool

https://github.com/cncf/landscape2#usage"
)]
pub struct Cli {
    /// Command to run.
    #[command(subcommand)]
    pub command: Command,
}

/// Commands available.
#[derive(Subcommand)]
#[allow(clippy::large_enum_variant)]
pub enum Command {
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

#[cfg(test)]
mod tests;

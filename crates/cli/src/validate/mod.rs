//! This module defines the functionality of the validate CLI subcommand.

use anyhow::{Context, Result};
use clap::Subcommand;
use landscape2_core::{
    data::{DataSource, LandscapeData},
    games::{GamesSource, LandscapeGames},
    guide::{GuideSource, LandscapeGuide},
    settings::{LandscapeSettings, SettingsSource},
};
use tracing::instrument;

/// Validate command arguments.
#[derive(clap::Args)]
#[command(args_conflicts_with_subcommands = true)]
pub struct ValidateArgs {
    /// Landscape file to validate.
    #[command(subcommand)]
    pub target: Target,
}

/// Landscape file to validate.
#[derive(Subcommand)]
pub enum Target {
    /// Validate landscape data file.
    Data(DataSource),

    /// Validate landscape games file.
    Games(GamesSource),

    /// Validate landscape guide file.
    Guide(GuideSource),

    /// Validate landscape settings file.
    Settings(SettingsSource),
}

/// Validate landscape data file.
///
/// # Errors
/// Returns an error if the landscape data file is invalid or cannot be read.
#[instrument(skip_all)]
pub async fn validate_data(data_source: &DataSource) -> Result<()> {
    LandscapeData::new(data_source)
        .await
        .context("the landscape data file provided is not valid")?;

    println!("The landscape data file provided is valid!");
    Ok(())
}

/// Validate landscape games file.
///
/// # Errors
/// Returns an error if the landscape games file is invalid or cannot be read.
#[instrument(skip_all)]
pub async fn validate_games(games_source: &GamesSource) -> Result<()> {
    LandscapeGames::new(games_source)
        .await
        .context("the landscape games file provided is not valid")?;

    println!("The landscape games file provided is valid!");
    Ok(())
}

/// Validate landscape guide file.
///
/// # Errors
/// Returns an error if the landscape guide file is invalid or cannot be read.
#[instrument(skip_all)]
pub async fn validate_guide(guide_source: &GuideSource) -> Result<()> {
    LandscapeGuide::new(guide_source)
        .await
        .context("the landscape guide file provided is not valid")?;

    println!("The landscape guide file provided is valid!");
    Ok(())
}

/// Validate landscape settings file.
///
/// # Errors
/// Returns an error if the landscape settings file is invalid or cannot be read.
#[instrument(skip_all)]
pub async fn validate_settings(settings_source: &SettingsSource) -> Result<()> {
    LandscapeSettings::new(settings_source)
        .await
        .context("the landscape settings file provided is not valid")?;

    println!("The landscape settings file provided is valid!");
    Ok(())
}

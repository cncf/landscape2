//! This module defines the functionality of the validate CLI subcommand.

use std::{io::Write, path::PathBuf};

use anyhow::{Result, bail};
use clap::Subcommand;
use landscape2_core::{
    data::{DataSource, LandscapeData},
    games::{GamesSource, LandscapeGames},
    guide::{GuideSource, LandscapeGuide},
    settings::{LandscapeSettings, SettingsSource},
    source::Parsed,
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
    Games(ValidateGamesArgs),

    /// Validate landscape guide file.
    Guide(GuideSource),

    /// Validate landscape settings file.
    Settings(SettingsSource),
}

/// Validate games command arguments.
///
/// The landscape data source is optional here, so its arguments are declared
/// instead of flattening `DataSource`, whose group is required.
#[derive(clap::Args)]
pub struct ValidateGamesArgs {
    /// Landscape data file local path. When a data source is provided, the
    /// quiz options are checked against its items.
    #[arg(long, conflicts_with = "data_url")]
    pub data_file: Option<PathBuf>,

    /// Landscape data file url. When a data source is provided, the quiz
    /// options are checked against its items.
    #[arg(long)]
    pub data_url: Option<String>,

    /// Games source.
    #[command(flatten)]
    pub games_source: GamesSource,
}

/// Validate landscape data file, writing the warnings found to the writer
/// provided.
///
/// # Errors
/// Returns an error if the landscape data file is invalid or cannot be read.
#[instrument(skip_all)]
pub async fn validate_data(data_source: &DataSource, warnings_out: &mut impl Write) -> Result<()> {
    // Read and validate the landscape data, reporting its warnings
    let Some(raw) = data_source.read_raw().await? else {
        bail!("data file or url not provided");
    };
    report_warnings(LandscapeData::new_from_yaml(&raw)?, warnings_out)?;

    println!("The landscape data file provided is valid!");
    Ok(())
}

/// Validate landscape games file, writing the warnings found to the writer
/// provided. When a landscape data source is provided, the quiz options are
/// also checked against its items.
///
/// # Errors
/// Returns an error if the landscape games file (or the data file, when
/// provided) is invalid or cannot be read, or if a quiz option does not match
/// any item in the landscape data.
#[instrument(skip_all)]
pub async fn validate_games(args: &ValidateGamesArgs, warnings_out: &mut impl Write) -> Result<()> {
    // Read and validate the landscape games, reporting its warnings
    let Some(raw) = args.games_source.read_raw().await? else {
        bail!("games file or url not provided");
    };
    let games = report_warnings(LandscapeGames::new_from_yaml(&raw)?, warnings_out)?;

    // Check the quiz options match the landscape items, when data is provided
    let data_source = DataSource {
        data_file: args.data_file.clone(),
        data_url: args.data_url.clone(),
    };
    if let Some(raw) = data_source.read_raw().await? {
        let landscape_data = report_warnings(LandscapeData::new_from_yaml(&raw)?, warnings_out)?;
        games.check_items(&landscape_data)?;
    }

    println!("The landscape games file provided is valid!");
    Ok(())
}

/// Validate landscape guide file, writing the warnings found to the writer
/// provided.
///
/// # Errors
/// Returns an error if the landscape guide file is invalid or cannot be read.
#[instrument(skip_all)]
pub async fn validate_guide(guide_source: &GuideSource, warnings_out: &mut impl Write) -> Result<()> {
    // Read and validate the landscape guide, reporting its warnings
    let Some(raw) = guide_source.read_raw().await? else {
        bail!("guide file or url not provided");
    };
    report_warnings(LandscapeGuide::new_from_yaml(&raw)?, warnings_out)?;

    println!("The landscape guide file provided is valid!");
    Ok(())
}

/// Validate landscape settings file, writing the warnings found to the writer
/// provided.
///
/// # Errors
/// Returns an error if the landscape settings file is invalid or cannot be read.
#[instrument(skip_all)]
pub async fn validate_settings(
    settings_source: &SettingsSource,
    warnings_out: &mut impl Write,
) -> Result<()> {
    // Read and validate the landscape settings, reporting its warnings
    let Some(raw) = settings_source.read_raw().await? else {
        bail!("settings file or url not provided");
    };
    report_warnings(LandscapeSettings::new_from_yaml(&raw)?, warnings_out)?;

    println!("The landscape settings file provided is valid!");
    Ok(())
}

/// Writes each warning of the parsed source provided to the writer provided,
/// as `warning: <message>`, and returns the parsed value.
fn report_warnings<T>(parsed: Parsed<T>, warnings_out: &mut impl Write) -> Result<T> {
    for warning in &parsed.warnings {
        writeln!(warnings_out, "warning: {warning}")?;
    }
    Ok(parsed.value)
}

#[cfg(test)]
mod tests;

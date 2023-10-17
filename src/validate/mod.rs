//! This module defines the functionality of the validate CLI subcommand.

use crate::{
    build::{LandscapeData, LandscapeGuide, LandscapeSettings},
    DataSource, GuideSource, SettingsSource,
};
use anyhow::{Context, Result};
use tracing::instrument;

/// Validate landscape data file.
#[instrument(skip_all)]
pub(crate) async fn validate_data(data_source: &DataSource) -> Result<()> {
    LandscapeData::new(data_source)
        .await
        .context("the landscape data file provided is not valid")?;

    println!("The landscape data file provided is valid!");
    Ok(())
}

/// Validate landscape settings file.
#[instrument(skip_all)]
pub(crate) async fn validate_settings(settings_source: &SettingsSource) -> Result<()> {
    LandscapeSettings::new(settings_source)
        .await
        .context("the landscape settings file provided is not valid")?;

    println!("The landscape settings file provided is valid!");
    Ok(())
}

/// Validate landscape guide file.
#[instrument(skip_all)]
pub(crate) async fn validate_guide(guide_source: &GuideSource) -> Result<()> {
    LandscapeGuide::new(guide_source)
        .await
        .context("the landscape guide file provided is not valid")?;

    println!("The landscape guide file provided is valid!");
    Ok(())
}

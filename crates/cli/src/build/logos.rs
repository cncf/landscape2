//! This module provides some helper functions to prepare logos to be displayed
//! on the landscape web application.

use std::{
    fs,
    path::{Path, PathBuf},
    sync::LazyLock,
};

use anyhow::{Result, bail};
use clap::Args;
use regex::bytes::Regex;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use usvg::{NodeExt, Rect, TreeParsing};

use super::settings::LogosViewbox;

/// Regular expression used to remove the SVG logos' title.
pub static SVG_TITLE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new("<title>.*</title>").expect("exprs in SVG_TITLE to be valid"));

/// Regular expression used to update the SVG logos' viewbox.
pub static SVG_VIEWBOX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"viewBox="[0-9. ]*""#).expect("expr in SVG_VIEWBOX to be valid"));

/// Landscape logos source.
#[derive(Args, Clone, Default)]
#[group(required = true, multiple = false)]
pub struct LogosSource {
    /// Local path where the logos are stored.
    #[arg(long)]
    pub logos_path: Option<PathBuf>,

    /// Base URL where the logos are hosted.
    #[arg(long)]
    pub logos_url: Option<String>,
}

/// Represents some information about an item's logo.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Logo {
    pub data: Vec<u8>,
    pub extension: String,
    pub digest: String,
}

/// Get logo from the source provided and apply some modifications to it when
/// applicable.
pub(crate) async fn prepare_logo(
    http_client: reqwest::Client,
    logos_source: &LogosSource,
    logos_viewbox: &LogosViewbox,
    file_name: &str,
) -> Result<Logo> {
    // Get logo from the source provided
    let mut logo_data = get_logo(http_client.clone(), logos_source, file_name).await?;

    // Apply some modifications to the logo if it is an SVG file
    let extension = Path::new(file_name)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default()
        .to_lowercase();
    if extension == "svg" {
        // Remove title if present (some identical logos are using a different
        // title, so we do this before computing the digest)
        logo_data = SVG_TITLE.replace(&logo_data, b"").into_owned();

        // Update viewbox to the smallest rectangle in which the object fits
        if logos_viewbox.adjust
            && !logos_viewbox.exclude.contains(&file_name.to_string())
            && let Ok(Some(bounding_box)) = get_svg_bounding_box(&logo_data)
            && bounding_box.left() >= 0.0
            && bounding_box.top() >= 0.0
        {
            let new_viewbox_bounds = format!(
                "{} {} {} {}",
                bounding_box.left(),
                bounding_box.top(),
                bounding_box.right() - bounding_box.left(),
                bounding_box.bottom() - bounding_box.top()
            );
            let new_viewbox = format!(r#"viewBox="{new_viewbox_bounds}""#);
            logo_data = SVG_VIEWBOX.replace(&logo_data, new_viewbox.as_bytes()).into_owned();
        }
    }

    // Calculate digest
    let digest = hex::encode(Sha256::digest(&logo_data));

    Ok(Logo {
        data: logo_data,
        extension,
        digest,
    })
}

/// Get logo content from the corresponding source.
#[allow(clippy::similar_names)]
async fn get_logo(
    http_client: reqwest::Client,
    logos_source: &LogosSource,
    file_name: &str,
) -> Result<Vec<u8>> {
    // Try from path
    if let Some(path) = &logos_source.logos_path {
        return fs::read(path.join(file_name)).map_err(Into::into);
    }

    // Try from url
    if let Some(logos_url) = &logos_source.logos_url {
        let logos_url = logos_url.trim_end_matches('/');
        let logo_url = format!("{logos_url}/{file_name}");
        let resp = http_client.get(logo_url).send().await?;
        if resp.status() != StatusCode::OK {
            bail!("unexpected status code getting logo: {}", resp.status());
        }
        return Ok(resp.bytes().await?.to_vec());
    }

    bail!("logos path or url not provided");
}

/// Get SVG bounding box (smallest rectangle in which the object fits).
fn get_svg_bounding_box(svg_data: &[u8]) -> Result<Option<Rect>> {
    let opt = usvg::Options::default();
    let tree = usvg::Tree::from_data(svg_data, &opt)?;
    let bounding_box = tree.root.calculate_bbox();

    Ok(bounding_box)
}

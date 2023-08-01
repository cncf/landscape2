use crate::LogosSource;
use anyhow::{format_err, Result};
use lazy_static::lazy_static;
use regex::bytes::Regex;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use usvg::{NodeExt, Rect, TreeParsing};

lazy_static! {
    /// Regular expression used to remove the SVG logos' title.
    static ref SVG_TITLE: Regex = Regex::new("<title>.*</title>",).expect("exprs in SVG_TITLE to be valid");

    /// Regular expression used to update the SVG logos' viewbox.
    static ref SVG_VIEWBOX: Regex = Regex::new(r#"viewBox="[0-9. ]*""#).expect("expr in SVG_VIEWBOX to be valid");
}

/// Represents some information about an item's logo.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Logo {
    pub svg_data: Vec<u8>,
    pub digest: String,
}

/// Get SVG logo from the source provided and apply some modifications to it.
pub(crate) async fn prepare_logo(
    http_client: reqwest::Client,
    logos_source: &LogosSource,
    file_name: &str,
) -> Result<Logo> {
    // Get SVG logo from the source provided
    let mut svg_data = get_svg(http_client.clone(), logos_source, file_name).await?;

    // Remove title if present (some identical logos are using a different
    // title, so we do this before computing the digest)
    svg_data = SVG_TITLE.replace(&svg_data, b"").into_owned();

    // Calculate digest
    let digest = hex::encode(Sha256::digest(&svg_data));

    // Update viewbox to the smallest rectangle in which the object fits
    if let Ok(Some(bounding_box)) = get_svg_bounding_box(&svg_data) {
        let new_viewbox_bounds = format!(
            "{} {} {} {}",
            bounding_box.left(),
            bounding_box.top(),
            bounding_box.right() - bounding_box.left(),
            bounding_box.bottom() - bounding_box.top()
        );
        let new_viewbox = format!(r#"viewBox="{new_viewbox_bounds}""#);
        svg_data = SVG_VIEWBOX.replace(&svg_data, new_viewbox.as_bytes()).into_owned();
    }

    Ok(Logo { svg_data, digest })
}

/// Get SVG logo content from the corresponding source.
#[allow(clippy::similar_names)]
async fn get_svg(
    http_client: reqwest::Client,
    logos_source: &LogosSource,
    file_name: &str,
) -> Result<Vec<u8>> {
    let svg_data = if let Some(path) = &logos_source.logos_path {
        fs::read(path.join(file_name))?
    } else {
        let logos_url = logos_source.logos_url.as_ref().unwrap().trim_end_matches('/');
        let logo_url = format!("{logos_url}/{file_name}");
        let resp = http_client.get(logo_url).send().await?;
        if resp.status() != StatusCode::OK {
            return Err(format_err!(
                "unexpected status code getting logo: {}",
                resp.status()
            ));
        }
        resp.bytes().await?.to_vec()
    };

    Ok(svg_data)
}

/// Get SVG bounding box (smallest rectangle in which the object fits).
fn get_svg_bounding_box(svg_data: &[u8]) -> Result<Option<Rect>> {
    let opt = usvg::Options::default();
    let tree = usvg::Tree::from_data(svg_data, &opt)?;
    let bounding_box = tree.root.calculate_bbox();

    Ok(bounding_box)
}

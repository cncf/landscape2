//! This module provides some helper functions to prepare logos to be displayed
//! on the landscape web application.

use std::{
    fs,
    path::{Component, Path, PathBuf},
    sync::LazyLock,
};

use anyhow::{Context, Result, bail, format_err};
use clap::Args;
use landscape2_core::settings::LogosViewbox;
use regex::bytes::{NoExpand, Regex};
use reqwest::StatusCode;
use sha2::{Digest, Sha256};
use url::Url;
use usvg::{NodeExt, Rect, TreeParsing};

/// Regular expression used to locate the SVG logos' root element start tag.
static SVG_ROOT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)<svg\b[^>]*>").expect("exprs in SVG_ROOT to be valid"));

/// Regular expression used to remove the SVG logos' titles.
static SVG_TITLE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)<title\b[^>]*>.*?</title>").expect("exprs in SVG_TITLE to be valid"));

/// Regular expression used to locate the viewbox attribute in the SVG logos'
/// root element start tag.
static SVG_VIEWBOX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"viewBox\s*=\s*(?:"[^"]*"|'[^']*')"#).expect("exprs in SVG_VIEWBOX to be valid")
});

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

/// Logo prepared to be published in the output directory.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Logo {
    /// Logo content, including the SVG adjustments when applicable.
    pub data: Vec<u8>,
    /// Hex encoded SHA-256 digest of the logo content, used as file name.
    pub digest: String,
    /// Lowercased extension of the logo file name.
    pub extension: String,
}

/// Get logo from the source provided and apply some modifications to it when
/// applicable.
///
/// SVG logos have their titles removed (identical logos sometimes use a
/// different title) and, unless disabled or excluded, the root viewbox
/// adjusted to the smallest rectangle in which the content fits.
pub(crate) async fn prepare_logo(
    http_client: &reqwest::Client,
    logos_source: &LogosSource,
    logos_viewbox: &LogosViewbox,
    file_name: &str,
) -> Result<Logo> {
    // Get logo from the source provided
    let logo_data = get_logo(http_client, logos_source, file_name).await?;

    // Process the logo in a blocking task, as parsing SVG files is CPU bound
    let extension = Path::new(file_name)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or_default()
        .to_lowercase();
    let adjust_viewbox =
        logos_viewbox.adjust && !logos_viewbox.exclude.iter().any(|excluded| excluded == file_name);
    let logo = tokio::task::spawn_blocking(move || process_logo(logo_data, extension, adjust_viewbox))
        .await
        .context("error executing logo processing task")?;

    Ok(logo)
}

/// Get logo content from the corresponding source.
///
/// Logo paths must be relative and stay inside the logos location: absolute
/// paths, `..` components and backslashes are rejected, and local logos must
/// resolve (symlinks included) to a file under the logos path.
async fn get_logo(
    http_client: &reqwest::Client,
    logos_source: &LogosSource,
    file_name: &str,
) -> Result<Vec<u8>> {
    // Reject logo paths that could escape the logos location
    let path = Path::new(file_name);
    if file_name.contains('\\')
        || path.components().any(|c| {
            matches!(
                c,
                Component::ParentDir | Component::Prefix(_) | Component::RootDir
            )
        })
    {
        bail!("invalid logo path: {file_name}");
    }

    // Try from path, making sure the resolved file stays under the logos path
    if let Some(logos_path) = &logos_source.logos_path {
        let logo_path = logos_path.join(path);
        let read_err = || format!("error reading logo {}", logo_path.display());
        let canonical_logos_path = fs::canonicalize(logos_path)
            .with_context(|| format!("error resolving logos path {}", logos_path.display()))?;
        let canonical_logo_path = fs::canonicalize(&logo_path).with_context(read_err)?;
        if !canonical_logo_path.starts_with(&canonical_logos_path) {
            bail!("logo path is outside the logos path: {file_name}");
        }
        return fs::read(&canonical_logo_path).with_context(read_err);
    }

    // Try from url, percent-encoding the logo path segments
    if let Some(logos_url) = &logos_source.logos_url {
        let invalid_url = || format!("invalid logos url: {logos_url}");
        let mut logo_url = Url::parse(logos_url).with_context(invalid_url)?;
        logo_url
            .path_segments_mut()
            .map_err(|()| format_err!(invalid_url()))?
            .pop_if_empty()
            .extend(file_name.split('/').filter(|segment| !segment.is_empty() && *segment != "."));
        let resp = http_client.get(logo_url).send().await?;
        if resp.status() != StatusCode::OK {
            bail!(
                "unexpected status code getting logo {file_name}: {}",
                resp.status()
            );
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

/// Apply the SVG modifications to the logo data provided (when applicable)
/// and compute its digest.
fn process_logo(mut data: Vec<u8>, extension: String, adjust_viewbox: bool) -> Logo {
    if extension == "svg" {
        // Remove titles (some identical logos use a different title, so this
        // is done before computing the digest)
        data = SVG_TITLE.replace_all(&data, NoExpand(b"")).into_owned();

        // Update the root viewbox to the smallest rectangle in which the
        // content fits, as long as it does not start at negative coordinates
        if adjust_viewbox
            && let Ok(Some(bounding_box)) = get_svg_bounding_box(&data)
            && bounding_box.left() >= 0.0
            && bounding_box.top() >= 0.0
        {
            let viewbox = format!(
                "{} {} {} {}",
                bounding_box.left(),
                bounding_box.top(),
                bounding_box.right() - bounding_box.left(),
                bounding_box.bottom() - bounding_box.top()
            );
            data = set_root_viewbox(&data, &viewbox);
        }
    }

    // Calculate digest
    let digest = hex::encode(Sha256::digest(&data));

    Logo {
        data,
        digest,
        extension,
    }
}

/// Set the viewbox of the SVG root element, replacing the existing one or
/// inserting it when missing. Nested elements (e.g. `<symbol>`) are left
/// untouched.
fn set_root_viewbox(svg_data: &[u8], viewbox: &str) -> Vec<u8> {
    // Locate the root element start tag
    let Some(root) = SVG_ROOT.find(svg_data) else {
        return svg_data.to_vec();
    };
    let root_tag = root.as_bytes();

    // Replace the viewbox in the root tag, or insert it right after `<svg`
    let viewbox_attr = format!(r#"viewBox="{viewbox}""#);
    let new_root_tag = if SVG_VIEWBOX.is_match(root_tag) {
        SVG_VIEWBOX.replace(root_tag, NoExpand(viewbox_attr.as_bytes())).into_owned()
    } else {
        let (open, rest) = root_tag.split_at("<svg".len());
        [open, b" ", viewbox_attr.as_bytes(), rest].concat()
    };

    [&svg_data[..root.start()], &new_root_tag, &svg_data[root.end()..]].concat()
}

#[cfg(test)]
mod tests;

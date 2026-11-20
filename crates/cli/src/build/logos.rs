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
use usvg::{
    Align, Node, NodeExt, NodeKind, Rect, TreeParsing, Visibility,
    tiny_skia_path::{self, PathStroker},
};

/// Regular expression used to locate the SVG logos' root element start tag
/// and its name (it may be namespace-prefixed, like `<svg:svg>`, and quoted
/// attribute values may contain `>`).
static SVG_ROOT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"<((?:[\w.-]+:)?svg)(?:[\s/](?:[^>"']|"[^"]*"|'[^']*')*)?>"#)
        .expect("exprs in SVG_ROOT to be valid")
});

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

/// Get SVG bounding box (smallest rectangle in which the object fits),
/// strokes included.
///
/// No bounding box is returned for logos with visible text (its size depends
/// on the fonts available where the logo is displayed) or rendered filters
/// (e.g. shadows drawn outside the content), for logos stretched to fill their
/// viewport, as a new viewbox would distort them, for logos with clipped or
/// masked strokes, as the part of them that is visible is not known, or for
/// logos whose content (strokes excluded) starts at negative coordinates.
fn get_svg_bounding_box(svg_data: &[u8]) -> Result<Option<Rect>> {
    let opt = usvg::Options::default();
    let tree = usvg::Tree::from_data(svg_data, &opt)?;
    let has_filters = tree
        .root
        .descendants()
        .any(|node| matches!(*node.borrow(), NodeKind::Group(ref group) if !group.filters.is_empty()));
    if has_visible_text(&tree.root) || has_filters || tree.view_box.aspect.align == Align::None {
        return Ok(None);
    }
    let Some(mut bounding_box) = tree.root.calculate_bbox() else {
        return Ok(None);
    };
    if bounding_box.left() < 0.0 || bounding_box.top() < 0.0 {
        return Ok(None);
    }

    // Extend the bounding box with the area covered by the drawn paths'
    // strokes (approximated with a precision relative to the logo size)
    let view_box = tree.view_box.rect;
    let precision = 1000.0 / view_box.width().max(view_box.height());
    for node in tree.root.descendants() {
        let NodeKind::Path(ref path) = *node.borrow() else {
            continue;
        };
        let Some(stroke) = &path.stroke else {
            continue;
        };
        if path.visibility != Visibility::Visible
            || stroke.opacity.get() == 0.0
            || has_ancestor_group(&node, |group| group.opacity.get() == 0.0)
        {
            continue;
        }
        if has_ancestor_group(&node, |group| group.clip_path.is_some() || group.mask.is_some()) {
            return Ok(None);
        }
        let ts = node.abs_transform();
        let res_scale = PathStroker::compute_resolution_scale(&ts) * precision;
        let Some(stroke_bbox) = path
            .data
            .stroke(&to_tiny_skia_stroke(stroke), res_scale)
            .and_then(|stroke_path| stroke_path.compute_tight_bounds())
            .and_then(|stroke_bbox| stroke_bbox.transform(ts))
        else {
            continue;
        };
        bounding_box = Rect::from_ltrb(
            bounding_box.left().min(stroke_bbox.left()),
            bounding_box.top().min(stroke_bbox.top()),
            bounding_box.right().max(stroke_bbox.right()),
            bounding_box.bottom().max(stroke_bbox.bottom()),
        )
        .context("invalid bounding box")?;
    }

    Ok(Some(bounding_box))
}

/// Check if any of the groups containing the node provided satisfies the
/// predicate.
fn has_ancestor_group(node: &Node, predicate: impl Fn(&usvg::Group) -> bool) -> bool {
    node.ancestors()
        .any(|ancestor| matches!(*ancestor.borrow(), NodeKind::Group(ref group) if predicate(group)))
}

/// Check if the node provided, its descendants or their subroots (e.g. masks
/// or patterns) contain any text with visible content.
fn has_visible_text(root: &Node) -> bool {
    root.descendants().any(|node| {
        if let NodeKind::Text(ref text) = *node.borrow()
            && text.chunks.iter().any(|chunk| !chunk.text.trim().is_empty())
        {
            return true;
        }
        let mut has_text = false;
        node.subroots(|subroot| has_text = has_text || has_visible_text(&subroot));
        has_text
    })
}

/// Convert the usvg stroke provided to a tiny-skia one, ignoring the dashes,
/// as dashing only removes parts of the stroke.
fn to_tiny_skia_stroke(stroke: &usvg::Stroke) -> tiny_skia_path::Stroke {
    tiny_skia_path::Stroke {
        width: stroke.width.get(),
        miter_limit: stroke.miterlimit.get(),
        line_cap: match stroke.linecap {
            usvg::LineCap::Butt => tiny_skia_path::LineCap::Butt,
            usvg::LineCap::Round => tiny_skia_path::LineCap::Round,
            usvg::LineCap::Square => tiny_skia_path::LineCap::Square,
        },
        line_join: match stroke.linejoin {
            usvg::LineJoin::Miter => tiny_skia_path::LineJoin::Miter,
            usvg::LineJoin::MiterClip => tiny_skia_path::LineJoin::MiterClip,
            usvg::LineJoin::Round => tiny_skia_path::LineJoin::Round,
            usvg::LineJoin::Bevel => tiny_skia_path::LineJoin::Bevel,
        },
        dash: None,
    }
}

/// Apply the SVG modifications to the logo data provided (when applicable)
/// and compute its digest.
fn process_logo(mut data: Vec<u8>, extension: String, adjust_viewbox: bool) -> Logo {
    if extension == "svg" {
        // Remove titles (some identical logos use a different title, so this
        // is done before computing the digest)
        data = SVG_TITLE.replace_all(&data, NoExpand(b"")).into_owned();

        // Update the root viewbox to the smallest rectangle in which the
        // content fits
        if adjust_viewbox && let Ok(Some(bounding_box)) = get_svg_bounding_box(&data) {
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
    let Some(captures) = SVG_ROOT.captures(svg_data) else {
        return svg_data.to_vec();
    };
    let root = captures.get(0).expect("whole match to be present");
    let root_tag = root.as_bytes();

    // Replace the viewbox in the root tag, or insert it right after the
    // element name (e.g. `<svg` or `<svg:svg`)
    let viewbox_attr = format!(r#"viewBox="{viewbox}""#);
    let new_root_tag = if SVG_VIEWBOX.is_match(root_tag) {
        SVG_VIEWBOX.replace(root_tag, NoExpand(viewbox_attr.as_bytes())).into_owned()
    } else {
        let name_end = captures.get(1).expect("root name to be captured").end() - root.start();
        let (open, rest) = root_tag.split_at(name_end);
        [open, b" ", viewbox_attr.as_bytes(), rest].concat()
    };

    [&svg_data[..root.start()], &new_root_tag, &svg_data[root.end()..]].concat()
}

#[cfg(test)]
mod tests;

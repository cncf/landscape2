//! This module provides some utility functions, including the parsers used to
//! extract identifiers from Crunchbase and GitHub urls.

use std::{ffi::OsStr, path::Path, sync::LazyLock};

use anyhow::{Result, bail};
use regex::Regex;
use sha2::{Digest, Sha256};
use url::Url;

use crate::paths::IMAGES_PATH;

/// Crunchbase organization url regular expression.
pub(crate) static CRUNCHBASE_URL: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^https://www\.crunchbase\.com/organization/(?P<permalink>[^/?#]+)/?$")
        .expect("exprs in CRUNCHBASE_URL to be valid")
});

/// GitHub repository url regular expression.
pub(crate) static GITHUB_REPOSITORY_URL: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^https://github\.com/(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+?)(?:\.git)?/?$")
        .expect("exprs in GITHUB_REPOSITORY_URL to be valid")
});

/// Number of hex characters of the location digest used to name the settings
/// images.
const IMAGE_NAME_DIGEST_LEN: usize = 16;

/// Normalized value reserved for the views that include every option of a
/// classification (i.e. `maturity_all` or `tag_all`).
pub(crate) const RESERVED_CLASSIFICATION_VALUE: &str = "all";

/// TAG name regular expression, shared by the data and settings files.
pub(crate) static TAG_NAME: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[a-z0-9-]+$").expect("exprs in TAG_NAME to be valid"));

/// Characters allowed in normalized names.
pub(crate) static VALID_CHARS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[\p{L}\p{N}\-\ \+]").expect("exprs in VALID_CHARS to be valid"));

/// Returns the organization permalink of the Crunchbase url provided, or
/// `None` when it is not a Crunchbase organization url.
#[must_use]
pub fn crunchbase_permalink(url: &str) -> Option<&str> {
    CRUNCHBASE_URL.captures(url).and_then(|c| c.name("permalink")).map(|m| m.as_str())
}

/// Returns the owner and the name of the repository of the GitHub url
/// provided, or `None` when it is not a GitHub repository url. A trailing
/// `.git` suffix is not part of the repository name.
#[must_use]
pub fn github_repository(url: &str) -> Option<(&str, &str)> {
    let captures = GITHUB_REPOSITORY_URL.captures(url)?;
    let owner = captures.name("owner")?.as_str();
    let repo = captures.name("repo")?.as_str();
    Some((owner, repo))
}

/// Returns the path, relative to the output directory and always `/`-joined,
/// where the settings image at the location provided is written to:
/// `images/<first 16 hex chars of sha256(location)>.<ext>`.
///
/// The name derives from the (trimmed) location string rather than from the
/// image content, so it can be computed without reading the image, and the
/// same file name in different directories never collides. `<ext>` is the
/// lowercased extension of the url path's last segment (ignoring the query)
/// or of the local path's file name. Without an extension, the name has no
/// suffix.
#[must_use]
pub fn image_output_path(location: &str) -> String {
    // Name the image after the digest of its location
    let location = location.trim();
    let digest = hex::encode(Sha256::digest(location.as_bytes()));
    let name = &digest[..IMAGE_NAME_DIGEST_LEN];

    // Get the lowercased extension of the location's file name, if any
    let file_name = match Url::parse(location) {
        Ok(url) => url.path_segments().and_then(|mut segments| segments.next_back()).map(ToString::to_string),
        Err(_) => Path::new(location).file_name().and_then(OsStr::to_str).map(ToString::to_string),
    };
    let extension = file_name
        .as_deref()
        .and_then(|file_name| Path::new(file_name).extension())
        .and_then(OsStr::to_str)
        .map(str::to_lowercase);

    match extension {
        Some(extension) => format!("{IMAGES_PATH}/{name}.{extension}"),
        None => format!("{IMAGES_PATH}/{name}"),
    }
}

/// Check if the string provided looks like a URL.
pub(crate) fn is_url(s: &str) -> bool {
    s.starts_with("http://") || s.starts_with("https://")
}

/// Convert the markdown text provided to HTML.
///
/// The UI injects the result as HTML, so this must keep using the default
/// options: they leave dangerous HTML and protocols disabled, escaping raw HTML
/// and dropping unsafe link destinations like `javascript:`.
pub(crate) fn markdown_to_html(s: &str) -> String {
    markdown::to_html(s)
}

/// Normalize category, subcategory and item name.
///
/// Letters, digits, `+` and `-` are kept (lowercased), and any other character
/// (spaces included) becomes a hyphen. Consecutive hyphens are collapsed and a
/// trailing one is removed. The output is used in ids, urls, embed file names
/// and API paths, so it must remain stable.
pub(crate) fn normalize_name(value: &str) -> String {
    let mut normalized_name = String::with_capacity(value.len());
    let mut buf = [0; 4];
    for c in value.chars() {
        // Keep valid chars lowercased, and use a single hyphen for the rest
        if c != ' ' && c != '-' && VALID_CHARS.is_match(c.encode_utf8(&mut buf)) {
            normalized_name.extend(c.to_lowercase());
        } else if !normalized_name.ends_with('-') {
            normalized_name.push('-');
        }
    }

    // Remove the trailing hyphen, if any
    if normalized_name.ends_with('-') {
        normalized_name.pop();
    }

    normalized_name
}

/// Validate the url provided.
pub(crate) fn validate_url(kind: &str, url: Option<&str>) -> Result<()> {
    if let Some(url) = url {
        let invalid_url = |reason: &str| bail!("invalid {kind} url: {reason}");

        // Parse url
        let url = match Url::parse(url) {
            Ok(url) => url,
            Err(err) => return invalid_url(&err.to_string()),
        };

        // Check scheme
        if kind == "other_link" && url.scheme() == "mailto" {
            return Ok(());
        }
        if url.scheme() != "http" && url.scheme() != "https" {
            return invalid_url("invalid scheme");
        }

        // Some checks specific to the url kind provided. A domain matches the
        // host itself or any of its subdomains
        let check_domains = |domains: &[&str]| {
            let host = url.host_str().unwrap_or_default();
            for domain in domains {
                if host == *domain || host.ends_with(&format!(".{domain}")) {
                    return Ok(());
                }
            }
            invalid_url(&format!("expecting https://{}/...", domains.join("|")))
        };
        match kind {
            "bluesky" => return check_domains(&["bsky.app"]),
            "crunchbase" => {
                if !CRUNCHBASE_URL.is_match(url.as_str()) {
                    return invalid_url(&format!("expecting: {}", CRUNCHBASE_URL.as_str()));
                }
            }
            "facebook" => return check_domains(&["facebook.com"]),
            "flickr" => return check_domains(&["flickr.com"]),
            "github" => return check_domains(&["github.com"]),
            "instagram" => return check_domains(&["instagram.com"]),
            "linkedin" => return check_domains(&["linkedin.com"]),
            "pinterest" => return check_domains(&["pinterest.com"]),
            "reddit" => return check_domains(&["reddit.com"]),
            "stack_overflow" => return check_domains(&["stackoverflow.com"]),
            "twitch" => return check_domains(&["twitch.tv"]),
            "twitter" => return check_domains(&["twitter.com", "x.com"]),
            "youtube" => return check_domains(&["youtube.com"]),
            _ => {}
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests;

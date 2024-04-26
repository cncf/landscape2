//! This module provides some utility functions.

use anyhow::{bail, Result};
use lazy_static::lazy_static;
use regex::Regex;
use url::Url;

lazy_static! {
    /// Crunchbase url regular expression.
    static ref CRUNCHBASE_URL: Regex =
        Regex::new("^https://www.crunchbase.com/organization/(?P<permalink>[^/]+)/?$")
            .expect("exprs in CRUNCHBASE_URL to be valid");

    /// Regular expression to match multiple hyphens.
    static ref MULTIPLE_HYPHENS: Regex = Regex::new(r"-{2,}").expect("exprs in MULTIPLE_HYPHENS to be valid");

    /// Characters allowed in normalized names.
    static ref VALID_CHARS: Regex = Regex::new(r"[a-z0-9\-\ \+]").expect("exprs in VALID_CHARS to be valid");
}

/// Normalize category, subcategory and item name.
pub(crate) fn normalize_name(value: &str) -> String {
    let mut normalized_name = value
        .to_lowercase()
        .replace(' ', "-")
        .chars()
        .map(|c| {
            if VALID_CHARS.is_match(&c.to_string()) {
                c
            } else {
                '-'
            }
        })
        .collect::<String>();
    normalized_name = MULTIPLE_HYPHENS.replace(&normalized_name, "-").to_string();
    if let Some(normalized_name_without_suffix) = normalized_name.strip_suffix('-') {
        normalized_name = normalized_name_without_suffix.to_string();
    }
    normalized_name
}

/// Validate the url provided.
pub(crate) fn validate_url(kind: &str, url: &Option<String>) -> Result<()> {
    if let Some(url) = url {
        let invalid_url = |reason: &str| bail!("invalid {kind} url: {reason}");

        // Parse url
        let url = match Url::parse(url) {
            Ok(url) => url,
            Err(err) => return invalid_url(&err.to_string()),
        };

        // Check scheme
        if url.scheme() != "http" && url.scheme() != "https" {
            return invalid_url("invalid scheme");
        }

        // Some checks specific to the url kind provided
        let check_domain = |domain: &str| {
            if url.host_str().is_some_and(|host| !host.ends_with(domain)) {
                return invalid_url(&format!("expecting https://{domain}/..."));
            }
            Ok(())
        };
        match kind {
            "crunchbase" => {
                if !CRUNCHBASE_URL.is_match(url.as_str()) {
                    return invalid_url(&format!("expecting: {}", CRUNCHBASE_URL.as_str()));
                }
            }
            "facebook" => return check_domain("facebook.com"),
            "flickr" => return check_domain("flickr.com"),
            "github" => return check_domain("github.com"),
            "instagram" => return check_domain("instagram.com"),
            "linkedin" => return check_domain("linkedin.com"),
            "stack_overflow" => return check_domain("stackoverflow.com"),
            "twitch" => return check_domain("twitch.tv"),
            "twitter" => return check_domain("twitter.com"),
            "youtube" => return check_domain("youtube.com"),
            _ => {}
        }
    }

    Ok(())
}

//! This module provides some utility functions.

use std::sync::LazyLock;

use anyhow::{bail, Result};
use regex::Regex;
use url::Url;

/// Crunchbase url regular expression.
pub(crate) static CRUNCHBASE_URL: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new("^https://www.crunchbase.com/organization/(?P<permalink>[^/]+)/?$")
        .expect("exprs in CRUNCHBASE_URL to be valid")
});

/// Regular expression to match multiple hyphens.
pub(crate) static MULTIPLE_HYPHENS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"-{2,}").expect("exprs in MULTIPLE_HYPHENS to be valid"));

/// Characters allowed in normalized names.
pub(crate) static VALID_CHARS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[\p{L}\p{N}\-\ \+]").expect("exprs in VALID_CHARS to be valid"));

/// Normalize category, subcategory and item name.
pub(crate) fn normalize_name(value: &str) -> String {
    let mut normalized_name = value
        .replace(' ', "-")
        .chars()
        .map(|c| {
            let c = c.to_string();
            if VALID_CHARS.is_match(&c) {
                c.to_lowercase()
            } else {
                "-".to_string()
            }
        })
        .collect::<String>();
    normalized_name = MULTIPLE_HYPHENS.replace_all(&normalized_name, "-").to_string();
    if let Some(normalized_name_without_suffix) = normalized_name.strip_suffix('-') {
        normalized_name = normalized_name_without_suffix.to_string();
    }
    normalized_name
}

/// Check if the string provided starts with http:// or https://.
pub(crate) fn is_url(s: &str) -> bool {
    s.starts_with("http://") || s.starts_with("https://")
}

/// Validate the url provided.
pub(crate) fn validate_url(kind: &str, url: Option<&String>) -> Result<()> {
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
        let check_domains = |domains: &[&str]| {
            for domain in domains {
                if url.host_str().is_some_and(|host| host.ends_with(domain)) {
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
mod tests {
    use super::*;

    #[test]
    fn normalize_name_succeeds() {
        assert_eq!(normalize_name("Test Project"), "test-project");
        assert_eq!(normalize_name("Test  Project  "), "test-project");
        assert_eq!(normalize_name("Test___Project"), "test-project");
        assert_eq!(normalize_name("Test-Project-"), "test-project");
        assert_eq!(normalize_name("Test--Project"), "test-project");
        assert_eq!(normalize_name("Test/Project"), "test-project");
        assert_eq!(normalize_name("Test@Project"), "test-project");
        assert_eq!(normalize_name("a 🙂 b 🙂 "), "a-b");

        assert_eq!(normalize_name("中文项目"), "中文项目");
        assert_eq!(normalize_name("日本語プロジェクト"), "日本語プロジェクト");
        assert_eq!(normalize_name("한국어 프로젝트"), "한국어-프로젝트");
        assert_eq!(normalize_name("Проект"), "проект");
        assert_eq!(normalize_name("مشروع"), "مشروع");
        assert_eq!(normalize_name("中文 Project"), "中文-project");
        assert_eq!(normalize_name("Test_中文_Project"), "test-中文-project");
        assert_eq!(normalize_name("Test---中文"), "test-中文");
        assert_eq!(normalize_name("Test/中文"), "test-中文");
        assert_eq!(normalize_name("Test@中文#Project"), "test-中文-project");
    }

    #[test]
    fn validate_url_succeeds() {
        validate_url(
            "crunchbase",
            Some("https://www.crunchbase.com/organization/test".to_string()).as_ref(),
        )
        .unwrap();

        for (kind, domain) in &[
            ("facebook", "facebook.com"),
            ("flickr", "flickr.com"),
            ("github", "github.com"),
            ("instagram", "instagram.com"),
            ("linkedin", "linkedin.com"),
            ("stack_overflow", "stackoverflow.com"),
            ("twitch", "twitch.tv"),
            ("twitter", "twitter.com"),
            ("twitter", "x.com"),
            ("youtube", "youtube.com"),
        ] {
            validate_url(kind, Some(format!("https://{domain}/test")).as_ref()).unwrap();
        }
    }

    #[test]
    #[should_panic(expected = "relative URL without a base")]
    fn validate_url_error_parsing() {
        validate_url("", Some("invalid url".to_string()).as_ref()).unwrap();
    }

    #[test]
    #[should_panic(expected = "invalid scheme")]
    fn validate_url_invalid_scheme() {
        validate_url("", Some("oci://hostname/path".to_string()).as_ref()).unwrap();
    }

    #[test]
    #[should_panic(expected = "invalid crunchbase url")]
    fn validate_url_invalid_crunchbase_url() {
        validate_url(
            "crunchbase",
            Some("https://www.crunchbase.com/test".to_string()).as_ref(),
        )
        .unwrap();
    }

    #[test]
    fn validate_url_invalid_domain() {
        let url = "https://example.com/test".to_string();
        for kind in &[
            "facebook",
            "flickr",
            "github",
            "instagram",
            "linkedin",
            "stack_overflow",
            "twitch",
            "twitter",
            "youtube",
        ] {
            let error = validate_url(kind, Some(url.clone()).as_ref()).unwrap_err().to_string();
            let expected_error = format!("invalid {kind} url");
            assert!(error.starts_with(expected_error.as_str()));
        }
    }
}

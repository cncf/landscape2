use super::*;

#[test]
fn test_crunchbase_permalink_extracts_permalink() {
    for (url, expected_permalink) in [
        ("https://www.crunchbase.com/organization/test", Some("test")),
        ("https://www.crunchbase.com/organization/test/", Some("test")),
        (
            "https://www.crunchbase.com/organization/test-org_1",
            Some("test-org_1"),
        ),
        ("https://www.crunchbase.com/organization/test?tab=funding", None),
        ("https://www.crunchbase.com/organization/test/people", None),
        ("https://www.crunchbase.com/person/test", None),
        ("https://wwwXcrunchbase.com/organization/test", None),
        ("http://www.crunchbase.com/organization/test", None),
    ] {
        assert_eq!(crunchbase_permalink(url), expected_permalink, "url: {url}");
    }
}

#[test]
fn test_github_repository_parses_owner_and_repo() {
    for (url, expected_repository) in [
        ("https://github.com/owner/repo", Some(("owner", "repo"))),
        ("https://github.com/owner/repo/", Some(("owner", "repo"))),
        ("https://github.com/owner/repo.git", Some(("owner", "repo"))),
        ("https://github.com/owner/repo.name", Some(("owner", "repo.name"))),
        (
            "https://github.com/my-org_1/my.repo-2.git",
            Some(("my-org_1", "my.repo-2")),
        ),
        ("https://github.com/owner/repo?tab=readme", None),
        ("https://github.com/owner/repo/tree/main", None),
        ("https://github.com/owner", None),
        ("https://notgithub.com/owner/repo", None),
        ("http://github.com/owner/repo", None),
    ] {
        assert_eq!(github_repository(url), expected_repository, "url: {url}");
    }
}

#[test]
fn test_image_output_path_hashes_location_and_lowercases_extension() {
    assert_eq!(
        image_output_path(" https://example.com/images/Logo.SVG "),
        "images/460b68d2a562211c.svg"
    );
}

#[test]
fn test_image_output_path_same_file_name_in_different_dirs_differs() {
    assert_eq!(image_output_path("a/logo.svg"), "images/d1ae2b75a99c025e.svg");
    assert_eq!(image_output_path("b/logo.svg"), "images/e218502906370d2f.svg");
}

#[test]
fn test_image_output_path_url_ignores_query() {
    // Setup a url whose query looks like a file name with another extension
    let location = "https://example.com/images/logo.png?name=logo.svg";

    // Run the path computation
    let path = image_output_path(location);

    // Check the extension comes from the url path, and the name from the whole location
    let digest = hex::encode(Sha256::digest(location.as_bytes()));
    assert_eq!(path, format!("images/{}.png", &digest[..16]));
}

#[test]
fn test_image_output_path_without_extension_has_no_suffix() {
    for location in [
        "https://example.com/images/",
        "https://example.com/logo",
        "images/logo",
    ] {
        let digest = hex::encode(Sha256::digest(location.as_bytes()));
        assert_eq!(
            image_output_path(location),
            format!("images/{}", &digest[..16]),
            "location: {location}"
        );
    }
}

#[test]
fn test_is_url_detects_http_and_https() {
    for (value, expected) in [
        ("http://example.com/logo.svg", true),
        ("https://example.com/logo.svg", true),
        ("images/logo.svg", false),
        ("/images/logo.svg", false),
        ("ftp://example.com/logo.svg", false),
        ("httpx://example.com/logo.svg", false),
    ] {
        assert_eq!(is_url(value), expected, "value: {value}");
    }
}

#[test]
fn test_markdown_to_html_escapes_raw_html_and_unsafe_links() {
    let html = markdown_to_html("**Hello** <script>alert(1)</script> [x](javascript:alert(1))");
    assert_eq!(
        html,
        r#"<p><strong>Hello</strong> &lt;script&gt;alert(1)&lt;/script&gt; <a href="">x</a></p>"#
    );
}

#[test]
fn test_normalize_name_keeps_current_output() {
    for (name, expected_normalized_name) in [
        // Latin names
        ("Test Project", "test-project"),
        ("Test  Project  ", "test-project"),
        ("Test___Project", "test-project"),
        ("Test-Project-", "test-project"),
        ("Test--Project", "test-project"),
        ("Test/Project", "test-project"),
        ("Test@Project", "test-project"),
        (" Foo", "-foo"),
        ("-Lead", "-lead"),
        ("(Beta) Tools", "-beta-tools"),
        ("C++", "c++"),
        // Non-latin and mixed names
        ("中文项目", "中文项目"),
        ("云原生计算基金会", "云原生计算基金会"),
        ("日本語プロジェクト", "日本語プロジェクト"),
        ("한국어 프로젝트", "한국어-프로젝트"),
        ("Проект", "проект"),
        ("مشروع", "مشروع"),
        ("中文 Project", "中文-project"),
        ("Test_中文_Project", "test-中文-project"),
        ("Test---中文", "test-中文"),
        ("Test/中文", "test-中文"),
        ("Test@中文#Project", "test-中文-project"),
        // Combining marks (Devanagari vowel signs and virama, NFD accent)
        ("हिन्दी", "ह-न-द"),
        ("Cafe\u{301}", "cafe"),
        // Astral-plane letters and emojis
        ("𝐀𝐁𝐂 𐐀𐐨", "𝐀𝐁𝐂-𐐨𐐨"),
        ("a 🙂 b 🙂 ", "a-b"),
        ("Rocket 🚀 Launch", "rocket-launch"),
        // Case mappings (uppercase final sigma, multi-char lowercase)
        ("ΟΔΥΣΣΕΥΣ", "οδυσσευσ"),
        ("İstanbul", "i\u{307}stanbul"),
    ] {
        assert_eq!(normalize_name(name), expected_normalized_name, "name: {name}");
    }
}

#[test]
fn test_validate_url_accepts_every_kind() {
    // Check a valid crunchbase url
    validate_url("crunchbase", Some("https://www.crunchbase.com/organization/test")).unwrap();

    // Check a valid url for each kind with expected domains
    for (kind, domain) in [
        ("bluesky", "bsky.app"),
        ("facebook", "facebook.com"),
        ("flickr", "flickr.com"),
        ("github", "github.com"),
        ("instagram", "instagram.com"),
        ("linkedin", "linkedin.com"),
        ("pinterest", "pinterest.com"),
        ("reddit", "reddit.com"),
        ("stack_overflow", "stackoverflow.com"),
        ("twitch", "twitch.tv"),
        ("twitter", "twitter.com"),
        ("twitter", "x.com"),
        ("youtube", "youtube.com"),
    ] {
        validate_url(kind, Some(format!("https://{domain}/test").as_str())).unwrap();
    }
}

#[test]
fn test_validate_url_accepts_http() {
    validate_url("github", Some("http://github.com/owner/repo")).unwrap();
}

#[test]
fn test_validate_url_accepts_mailto_for_other_link() {
    validate_url("other_link", Some("mailto:team@example.com")).unwrap();
}

#[test]
fn test_validate_url_accepts_none() {
    validate_url("github", None).unwrap();
}

#[test]
fn test_validate_url_accepts_subdomain() {
    validate_url("github", Some("https://www.github.com/owner/repo")).unwrap();
}

#[test]
fn test_validate_url_rejects_invalid_crunchbase_url() {
    let err = validate_url("crunchbase", Some("https://www.crunchbase.com/test")).unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        r"invalid crunchbase url: expecting: ^https://www\.crunchbase\.com/organization/(?P<permalink>[^/?#]+)/?$"
    );
}

#[test]
fn test_validate_url_rejects_invalid_scheme() {
    let err = validate_url("", Some("oci://hostname/path")).unwrap_err();
    assert_eq!(format!("{err:#}"), "invalid  url: invalid scheme");
}

#[test]
fn test_validate_url_rejects_lookalike_domain() {
    for (kind, url, expected_err) in [
        (
            "github",
            "https://notgithub.com/owner/repo",
            "invalid github url: expecting https://github.com/...",
        ),
        (
            "twitter",
            "https://dropbox.com/test",
            "invalid twitter url: expecting https://twitter.com|x.com/...",
        ),
        (
            "twitter",
            "https://netflix.com/test",
            "invalid twitter url: expecting https://twitter.com|x.com/...",
        ),
        (
            "crunchbase",
            "https://wwwXcrunchbase.com/organization/test",
            r"invalid crunchbase url: expecting: ^https://www\.crunchbase\.com/organization/(?P<permalink>[^/?#]+)/?$",
        ),
    ] {
        // Run the validation and check the url is rejected
        let err = validate_url(kind, Some(url)).unwrap_err();
        assert_eq!(format!("{err:#}"), expected_err, "url: {url}");
    }
}

#[test]
fn test_validate_url_rejects_mailto_for_other_kinds() {
    let err = validate_url("mailing_list", Some("mailto:team@example.com")).unwrap_err();
    assert_eq!(format!("{err:#}"), "invalid mailing_list url: invalid scheme");
}

#[test]
fn test_validate_url_rejects_unparsable_url() {
    let err = validate_url("", Some("invalid url")).unwrap_err();
    assert_eq!(format!("{err:#}"), "invalid  url: relative URL without a base");
}

#[test]
fn test_validate_url_rejects_wrong_domain_for_every_kind() {
    for (kind, domains) in [
        ("bluesky", "bsky.app"),
        ("facebook", "facebook.com"),
        ("flickr", "flickr.com"),
        ("github", "github.com"),
        ("instagram", "instagram.com"),
        ("linkedin", "linkedin.com"),
        ("pinterest", "pinterest.com"),
        ("reddit", "reddit.com"),
        ("stack_overflow", "stackoverflow.com"),
        ("twitch", "twitch.tv"),
        ("twitter", "twitter.com|x.com"),
        ("youtube", "youtube.com"),
    ] {
        // Run the validation and check the expected domains are reported
        let err = validate_url(kind, Some("https://example.com/test")).unwrap_err();
        assert_eq!(
            format!("{err:#}"),
            format!("invalid {kind} url: expecting https://{domains}/...")
        );
    }
}

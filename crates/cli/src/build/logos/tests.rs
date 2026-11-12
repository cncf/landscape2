use std::fs;

use pretty_assertions::assert_eq;
use tempfile::TempDir;

use super::*;

/// SVG logo whose content fits in the `10 10 20 30` rectangle.
const RECT_SVG_BODY: &str = r#"<rect x="10" y="10" width="20" height="30" fill="black"/>"#;

#[tokio::test]
async fn test_prepare_logo_adjusts_root_viewbox_only() {
    // Setup a logo with a nested symbol declaring its own viewbox
    let svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox = "0 0 100 100"><symbol id="s" viewBox="0 0 10 10"><circle r="5"/></symbol>{RECT_SVG_BODY}</svg>"#
    );

    // Run the logo preparation
    let logo = prepare_svg(&svg, "logo.svg", &LogosViewbox::default()).await;

    // Check only the root viewbox is adjusted
    assert_eq!(
        String::from_utf8(logo.data).unwrap(),
        format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 10 20 30"><symbol id="s" viewBox="0 0 10 10"><circle r="5"/></symbol>{RECT_SVG_BODY}</svg>"#
        )
    );
}

#[tokio::test]
async fn test_prepare_logo_excluded_file_keeps_viewbox() {
    // Setup a logo excluded from the viewbox adjustment
    let svg =
        format!(r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{RECT_SVG_BODY}</svg>"#);
    let logos_viewbox = LogosViewbox {
        adjust: true,
        exclude: vec!["logo.svg".to_string()],
    };

    // Run the logo preparation
    let logo = prepare_svg(&svg, "logo.svg", &logos_viewbox).await;

    // Check the logo is left untouched
    assert_eq!(String::from_utf8(logo.data).unwrap(), svg);
}

#[tokio::test]
async fn test_prepare_logo_inserts_missing_root_viewbox() {
    // Setup a logo without a root viewbox
    let svg =
        format!(r#"<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">{RECT_SVG_BODY}</svg>"#);

    // Run the logo preparation
    let logo = prepare_svg(&svg, "logo.svg", &LogosViewbox::default()).await;

    // Check a viewbox is added to the root element
    assert_eq!(
        String::from_utf8(logo.data).unwrap(),
        format!(
            r#"<svg viewBox="10 10 20 30" xmlns="http://www.w3.org/2000/svg" width="100" height="100">{RECT_SVG_BODY}</svg>"#
        )
    );
}

#[tokio::test]
async fn test_prepare_logo_missing_file_returns_error() {
    // Setup an empty logos path
    let logos_dir = TempDir::new().unwrap();

    // Run the logo preparation
    let err = prepare_logo(
        &reqwest::Client::new(),
        &logos_source(logos_dir.path()),
        &LogosViewbox::default(),
        "missing.svg",
    )
    .await
    .unwrap_err();

    // Check the error names the missing file
    assert_eq!(
        format!("{err:#}"),
        format!(
            "error reading logo {}: No such file or directory (os error 2)",
            logos_dir.path().join("missing.svg").display()
        )
    );
}

#[tokio::test]
async fn test_prepare_logo_one_line_two_titles_keeps_content() {
    // Setup a logo with two titles on the same line
    let svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg"><title>A</title>{RECT_SVG_BODY}<title>B</title></svg>"#
    );

    // Run the logo preparation
    let logo = prepare_svg(&svg, "logo.svg", &no_viewbox_adjustment()).await;

    // Check both titles are removed and the content between them is kept
    assert_eq!(
        String::from_utf8(logo.data).unwrap(),
        format!(r#"<svg xmlns="http://www.w3.org/2000/svg">{RECT_SVG_BODY}</svg>"#)
    );
}

#[tokio::test]
async fn test_prepare_logo_png_bytes_unchanged_with_lowercase_extension() {
    // Setup a PNG logo with an uppercase extension
    let logos_dir = TempDir::new().unwrap();
    let png = fs::read("src/testdata/logos/sample.png").unwrap();
    fs::write(logos_dir.path().join("logo.PNG"), &png).unwrap();

    // Run the logo preparation
    let logo = prepare_logo(
        &reqwest::Client::new(),
        &logos_source(logos_dir.path()),
        &LogosViewbox::default(),
        "logo.PNG",
    )
    .await
    .unwrap();

    // Check the logo bytes are kept and the extension is lowercased
    assert_eq!(logo.digest, hex::encode(Sha256::digest(&png)));
    assert_eq!(logo.extension, "png");
    assert!(logo.data == png, "png bytes changed");
}

#[tokio::test]
async fn test_prepare_logo_removes_multiline_title() {
    // Setup a logo with a title spanning multiple lines
    let svg = format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\"><title>\nMulti\nline\n</title>{RECT_SVG_BODY}</svg>"
    );

    // Run the logo preparation
    let logo = prepare_svg(&svg, "logo.svg", &no_viewbox_adjustment()).await;

    // Check the title is removed
    assert_eq!(
        String::from_utf8(logo.data).unwrap(),
        format!(r#"<svg xmlns="http://www.w3.org/2000/svg">{RECT_SVG_BODY}</svg>"#)
    );
}

#[tokio::test]
async fn test_prepare_logo_removes_title_with_attributes() {
    // Setup a logo with a title carrying attributes
    let svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg"><title id="t" lang="en">Logo</title>{RECT_SVG_BODY}</svg>"#
    );

    // Run the logo preparation
    let logo = prepare_svg(&svg, "logo.svg", &no_viewbox_adjustment()).await;

    // Check the title is removed
    assert_eq!(
        String::from_utf8(logo.data).unwrap(),
        format!(r#"<svg xmlns="http://www.w3.org/2000/svg">{RECT_SVG_BODY}</svg>"#)
    );
}

#[tokio::test]
async fn test_prepare_logo_rewrites_single_quoted_viewbox() {
    // Setup a logo with a single-quoted root viewbox
    let svg =
        format!(r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox='0 0 100 100'>{RECT_SVG_BODY}</svg>"#);

    // Run the logo preparation
    let logo = prepare_svg(&svg, "logo.svg", &LogosViewbox::default()).await;

    // Check the viewbox is rewritten
    assert_eq!(
        String::from_utf8(logo.data).unwrap(),
        format!(r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 10 20 30">{RECT_SVG_BODY}</svg>"#)
    );
}

#[tokio::test]
async fn test_prepare_logo_same_svg_different_titles_same_digest() {
    // Setup two logos that only differ in their titles
    let svg_a = format!(r#"<svg xmlns="http://www.w3.org/2000/svg"><title>A</title>{RECT_SVG_BODY}</svg>"#);
    let svg_b = format!(r#"<svg xmlns="http://www.w3.org/2000/svg"><title>B</title>{RECT_SVG_BODY}</svg>"#);

    // Run the logos preparation
    let logo_a = prepare_svg(&svg_a, "a.svg", &LogosViewbox::default()).await;
    let logo_b = prepare_svg(&svg_b, "b.svg", &LogosViewbox::default()).await;

    // Check both logos get the same digest
    assert_eq!(logo_a.digest, logo_b.digest);
    assert_eq!(logo_a.extension, "svg");
}

#[tokio::test]
async fn test_get_logo_rejects_parent_dir_and_absolute_paths() {
    // Setup a logos path
    let logos_dir = TempDir::new().unwrap();
    let logos_source = logos_source(logos_dir.path());

    for file_name in [
        "../logo.svg",
        "dir/../../logo.svg",
        "/etc/passwd",
        "dir\\logo.svg",
    ] {
        // Run the logo retrieval
        let err = get_logo(&reqwest::Client::new(), &logos_source, file_name).await.unwrap_err();

        // Check the logo path is rejected
        assert_eq!(
            format!("{err:#}"),
            format!("invalid logo path: {file_name}"),
            "file name: {file_name}"
        );
    }
}

#[cfg(unix)]
#[tokio::test]
async fn test_get_logo_rejects_symlink_outside_logos_path() {
    // Setup a logo symlink pointing to a file outside the logos path
    let tmp_dir = TempDir::new().unwrap();
    let logos_path = tmp_dir.path().join("logos");
    fs::create_dir(&logos_path).unwrap();
    fs::write(tmp_dir.path().join("secret.svg"), "<svg/>").unwrap();
    std::os::unix::fs::symlink(tmp_dir.path().join("secret.svg"), logos_path.join("link.svg")).unwrap();

    // Run the logo retrieval
    let err = get_logo(&reqwest::Client::new(), &logos_source(&logos_path), "link.svg")
        .await
        .unwrap_err();

    // Check the symlink is rejected
    assert_eq!(
        format!("{err:#}"),
        "logo path is outside the logos path: link.svg"
    );
}

#[tokio::test]
async fn test_get_logo_url_non_ok_status_returns_error() {
    // Setup server expectations
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("GET", "/logos/logo.svg").with_status(404).expect(1).create_async().await;

    // Run the logo retrieval
    let err = get_logo(&reqwest::Client::new(), &logos_url(&server.url()), "logo.svg")
        .await
        .unwrap_err();

    // Check the status is reported
    assert_eq!(
        format!("{err:#}"),
        "unexpected status code getting logo logo.svg: 404 Not Found"
    );
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_logo_url_percent_encodes_path_segments() {
    // Setup server expectations
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", "/logos/my%20dir/my%20logo%23.svg")
        .with_status(200)
        .with_body("<svg/>")
        .expect(1)
        .create_async()
        .await;

    // Run the logo retrieval
    let logo = get_logo(
        &reqwest::Client::new(),
        &logos_url(&server.url()),
        "my dir/my logo#.svg",
    )
    .await
    .unwrap();

    // Check the logo is fetched from the encoded url
    assert_eq!(logo, b"<svg/>");
    mock.assert_async().await;
}

// Helpers.

/// Returns a logos source reading the logos from the local path provided.
fn logos_source(logos_path: &Path) -> LogosSource {
    LogosSource {
        logos_path: Some(logos_path.to_path_buf()),
        logos_url: None,
    }
}

/// Returns a logos source fetching the logos from the `logos` path of the
/// server url provided.
fn logos_url(server_url: &str) -> LogosSource {
    LogosSource {
        logos_path: None,
        logos_url: Some(format!("{server_url}/logos/")),
    }
}

/// Returns a logos viewbox configuration that disables the adjustment.
fn no_viewbox_adjustment() -> LogosViewbox {
    LogosViewbox {
        adjust: false,
        exclude: vec![],
    }
}

/// Writes the SVG logo provided to a temporary logos path and prepares it.
async fn prepare_svg(svg: &str, file_name: &str, logos_viewbox: &LogosViewbox) -> Logo {
    let logos_dir = TempDir::new().unwrap();
    fs::write(logos_dir.path().join(file_name), svg).unwrap();
    prepare_logo(
        &reqwest::Client::new(),
        &logos_source(logos_dir.path()),
        logos_viewbox,
        file_name,
    )
    .await
    .unwrap()
}

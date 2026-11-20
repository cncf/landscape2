use std::{fs, path::PathBuf};

use axum::{
    body::{self, Body},
    http::{
        Request, StatusCode,
        header::{CACHE_CONTROL, IF_MODIFIED_SINCE, LAST_MODIFIED, LOCATION},
    },
    response::Response,
};
use pretty_assertions::assert_eq;
use tempfile::TempDir;
use tower::ServiceExt;

use super::*;

/// Base path used by the build output fixture.
const BASE_PATH: &str = "/landscape";

/// Cache control header value of the responses that can be cached.
const LONG_CACHE: &str = "max-age=31536000";

/// Cache control header value of the responses that must not be cached.
const NO_CACHE: &str = "no-cache, no-store, must-revalidate";

#[tokio::test]
async fn test_serve_missing_index_returns_error() {
    // Setup a directory that is not a build output
    let tmp_dir = TempDir::new().unwrap();
    let args = ServeArgs {
        addr: "127.0.0.1:0".to_string(),
        graceful_shutdown: false,
        landscape_dir: Some(tmp_dir.path().to_path_buf()),
        silent: true,
    };

    // Run the server and check it refuses the directory
    let err = serve(&args).await.unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        format!(
            "{} is not a landscape build output (index.html not found)",
            tmp_dir.path().display()
        )
    );
}

#[test]
fn test_cache_control_for_maps_prefixes() {
    let cases = [
        ("", NO_CACHE),
        ("assets", NO_CACHE),
        ("assets/app.js", LONG_CACHE),
        ("data/base.json", NO_CACHE),
        ("embed/assets/embed.js", LONG_CACHE),
        ("embed/embed.html", NO_CACHE),
        ("guide", NO_CACHE),
        ("index.html", NO_CACHE),
        ("logos/x.svg", LONG_CACHE),
        ("screenshot", NO_CACHE),
    ];
    for (path, expected) in cases {
        assert_eq!(cache_control_for(path), expected, "path: {path}");
    }
}

#[tokio::test]
async fn test_router_base_path_asset_returns_ok() {
    // Run the request
    let resp = get(
        router(&fixture_dir(), Some(BASE_PATH)),
        "/landscape/assets/app.js",
    )
    .await;

    // Check the asset is served with the long cache
    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(resp.headers()[CACHE_CONTROL], LONG_CACHE);
    assert_eq!(body_text(resp).await, fixture_file("assets/app.js"));
}

#[tokio::test]
async fn test_router_base_path_deep_route_returns_index() {
    for uri in ["/landscape/", "/landscape/guide"] {
        // Run the request
        let resp = get(router(&fixture_dir(), Some(BASE_PATH)), uri).await;

        // Check the index is served and not cached
        assert_eq!(resp.status(), StatusCode::OK, "uri: {uri}");
        assert_eq!(resp.headers()[CACHE_CONTROL], NO_CACHE, "uri: {uri}");
        assert_eq!(body_text(resp).await, fixture_file("index.html"), "uri: {uri}");
    }
}

#[tokio::test]
async fn test_router_base_path_directory_redirects_under_base_path() {
    let cases = [
        ("/landscape/logos", "/landscape/logos/"),
        ("/landscape/logos?x=1", "/landscape/logos/?x=1"),
        (
            "http://localhost/landscape/logos",
            "http://localhost/landscape/logos/",
        ),
        ("/logos", "/logos/"),
    ];
    for (uri, expected_location) in cases {
        // Run the request
        let resp = get(router(&fixture_dir(), Some(BASE_PATH)), uri).await;

        // Check the request is redirected to the directory with a trailing
        // slash, keeping the base path requested
        assert_eq!(resp.status(), StatusCode::TEMPORARY_REDIRECT, "uri: {uri}");
        assert_eq!(resp.headers()[LOCATION], expected_location, "uri: {uri}");
    }
}

#[tokio::test]
async fn test_router_base_path_root_redirects_to_base_path() {
    for uri in ["/", "/landscape"] {
        // Run the request
        let resp = get(router(&fixture_dir(), Some(BASE_PATH)), uri).await;

        // Check the request is redirected to the base path, with no cache
        assert_eq!(resp.status(), StatusCode::TEMPORARY_REDIRECT, "uri: {uri}");
        assert_eq!(resp.headers()[LOCATION], "/landscape/", "uri: {uri}");
        assert_eq!(resp.headers()[CACHE_CONTROL], NO_CACHE, "uri: {uri}");
    }
}

#[tokio::test]
async fn test_router_base_path_root_redirects_to_base_path_keeping_query() {
    for uri in ["/?item=x", "/landscape?item=x"] {
        // Run the request
        let resp = get(router(&fixture_dir(), Some(BASE_PATH)), uri).await;

        // Check the request is redirected to the base path, keeping the query
        assert_eq!(resp.status(), StatusCode::TEMPORARY_REDIRECT, "uri: {uri}");
        assert_eq!(resp.headers()[LOCATION], "/landscape/?item=x", "uri: {uri}");
    }
}

#[tokio::test]
async fn test_router_existing_asset_returns_ok_with_long_cache() {
    // Run the request
    let resp = get(router(&fixture_dir(), None), "/assets/app.js").await;

    // Check the asset is served with the long cache
    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(resp.headers()[CACHE_CONTROL], LONG_CACHE);
    assert_eq!(body_text(resp).await, fixture_file("assets/app.js"));
}

#[tokio::test]
async fn test_router_missing_asset_returns_not_found_without_long_cache() {
    for uri in ["/assets/missing.js", "/logos/missing.svg"] {
        // Run the request
        let resp = get(router(&fixture_dir(), None), uri).await;

        // Check a plain not found response is returned, with no cache
        assert_eq!(resp.status(), StatusCode::NOT_FOUND, "uri: {uri}");
        assert_eq!(resp.headers()[CACHE_CONTROL], NO_CACHE, "uri: {uri}");
        assert_eq!(body_text(resp).await, "", "uri: {uri}");
    }
}

#[tokio::test]
async fn test_router_not_modified_keeps_cache_control() {
    let cases = [
        (None, "/assets/app.js", LONG_CACHE),
        (None, "/index.html", NO_CACHE),
        (None, "/logos/x.svg", LONG_CACHE),
        (Some(BASE_PATH), "/landscape/assets/app.js", LONG_CACHE),
    ];
    for (base_path, uri, expected_cache_control) in cases {
        // Run a request to get the file last modification date, and then a
        // conditional one with it
        let resp = get(router(&fixture_dir(), base_path), uri).await;
        let last_modified = resp.headers()[LAST_MODIFIED].clone();
        let req = Request::get(uri).header(IF_MODIFIED_SINCE, last_modified).body(Body::empty()).unwrap();
        let resp = router(&fixture_dir(), base_path).oneshot(req).await.unwrap();

        // Check the not modified response has the same cache control header
        // as the successful one
        assert_eq!(resp.status(), StatusCode::NOT_MODIFIED, "uri: {uri}");
        assert_eq!(
            resp.headers()[CACHE_CONTROL],
            expected_cache_control,
            "uri: {uri}"
        );
    }
}

#[tokio::test]
async fn test_router_root_returns_index() {
    // Run the request
    let resp = get(router(&fixture_dir(), None), "/").await;

    // Check the index is served and not cached
    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(resp.headers()[CACHE_CONTROL], NO_CACHE);
    assert_eq!(body_text(resp).await, fixture_file("index.html"));
}

#[tokio::test]
async fn test_router_screenshot_route_served_at_root() {
    // Run the request on a router with a base path
    let resp = get(router(&fixture_dir(), Some(BASE_PATH)), "/screenshot").await;

    // Check the index is served, as the screenshot route is not prefixed
    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(resp.headers()[CACHE_CONTROL], NO_CACHE);
    assert_eq!(body_text(resp).await, fixture_file("index.html"));
}

#[tokio::test]
async fn test_router_spa_route_returns_index_with_ok() {
    for uri in ["/guide", "/stats", "/screenshot"] {
        // Run the request
        let resp = get(router(&fixture_dir(), None), uri).await;

        // Check the index is served with a successful status, and not cached
        assert_eq!(resp.status(), StatusCode::OK, "uri: {uri}");
        assert_eq!(resp.headers()[CACHE_CONTROL], NO_CACHE, "uri: {uri}");
        assert_eq!(body_text(resp).await, fixture_file("index.html"), "uri: {uri}");
    }
}

#[tokio::test]
async fn test_serve_with_listener_accepts_requests_immediately() {
    // Setup the listener on a port picked by the system and launch the server
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let server = tokio::spawn(serve_with_listener(listener, router(&fixture_dir(), None)));

    // Run a request right away, without waiting for the server
    let resp = reqwest::get(format!("http://{addr}/")).await.unwrap();

    // Check the index is served
    assert_eq!(resp.status(), reqwest::StatusCode::OK);
    assert_eq!(resp.text().await.unwrap(), fixture_file("index.html"));
    server.abort();
}

// Helpers.

/// Returns the body of the response provided as text.
async fn body_text(resp: Response) -> String {
    let bytes = body::to_bytes(resp.into_body(), usize::MAX).await.unwrap();
    String::from_utf8(bytes.to_vec()).unwrap()
}

/// Returns the path of the build output fixture.
fn fixture_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/testdata/build")
}

/// Returns the content of the build output fixture file provided.
fn fixture_file(path: &str) -> String {
    fs::read_to_string(fixture_dir().join(path)).unwrap()
}

/// Sends a GET request for the uri provided to the router.
async fn get(router: Router, uri: &str) -> Response {
    let req = Request::get(uri).body(Body::empty()).unwrap();
    router.oneshot(req).await.unwrap()
}

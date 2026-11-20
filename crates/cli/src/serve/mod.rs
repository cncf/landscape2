//! This module defines the functionality of the serve CLI subcommand.

use std::{
    env, fs,
    net::SocketAddr,
    path::{Path, PathBuf},
    sync::Arc,
};

use anyhow::{Context, Result, bail};
use axum::{
    Router,
    body::Body,
    extract::{Request, State},
    handler::Handler,
    http::{
        HeaderValue, StatusCode, Uri,
        header::{CACHE_CONTROL, CONTENT_TYPE},
    },
    middleware::{self, Next},
    response::{IntoResponse, Redirect, Response},
    routing::get,
};
use tokio::{net::TcpListener, signal};
use tower_http::services::ServeDir;
use tracing::{error, info, instrument};

/// Cache control header value of the responses that can be cached for long
/// (their file names change when their content does).
const LONG_CACHE_CONTROL: &str = "max-age=31536000";

/// Site relative path prefixes of the files that can be cached for long.
const LONG_CACHE_PREFIXES: [&str; 3] = ["assets/", "embed/assets/", "logos/"];

/// Cache control header value of the responses that must not be cached.
const NO_CACHE_CONTROL: &str = "no-cache, no-store, must-revalidate";

/// Serve arguments.
#[derive(clap::Args)]
pub struct ServeArgs {
    /// Address the web server will listen on.
    #[arg(long, default_value = "127.0.0.1:8000")]
    pub addr: String,

    /// Whether the server should stop gracefully or not.
    #[arg(long, default_value_t = false)]
    pub graceful_shutdown: bool,

    /// Location of the landscape website files (build subcommand output).
    /// The current path will be used when none is provided.
    #[arg(long)]
    pub landscape_dir: Option<PathBuf>,

    /// Enable silent mode.
    #[arg(long, default_value_t = false)]
    pub silent: bool,
}

/// Serve landscape website.
///
/// The base path the landscape was built with is read from the build output
/// (`data/base.json`), and the landscape is served under it as well as at the
/// root.
///
/// # Errors
/// Returns an error if the directory is not a landscape build output, or if
/// the server cannot bind or start.
#[instrument(skip_all)]
pub async fn serve(args: &ServeArgs) -> Result<()> {
    // Resolve the landscape directory and check it is a build output
    let landscape_dir = match &args.landscape_dir {
        Some(landscape_dir) => landscape_dir.clone(),
        None => env::current_dir().context("error getting current directory")?,
    };
    if !landscape_dir.join("index.html").is_file() {
        bail!(
            "{} is not a landscape build output (index.html not found)",
            landscape_dir.display()
        );
    }

    // Setup router, using the base path the landscape was built with
    let base_path = read_base_path(&landscape_dir)?;
    let router = router(&landscape_dir, base_path.as_deref());

    // Setup and launch HTTP server
    let addr: SocketAddr = args.addr.parse().with_context(|| format!("invalid address {}", args.addr))?;
    let listener = TcpListener::bind(addr).await.with_context(|| format!("error binding to {addr}"))?;
    if !args.silent {
        info!("http server running (press ctrl+c to stop)");
        println!(
            "\n🔗 Landscape available at: http://{addr}{}/\n",
            base_path.as_deref().unwrap_or_default()
        );
    }
    if args.graceful_shutdown {
        axum::serve(listener, router).with_graceful_shutdown(shutdown_signal()).await?;
    } else {
        serve_with_listener(listener, router).await?;
    }

    Ok(())
}

/// Returns the cache control header value for the site relative path (without
/// a leading slash) provided.
pub(crate) fn cache_control_for(path: &str) -> &'static str {
    if LONG_CACHE_PREFIXES.iter().any(|prefix| path.starts_with(prefix)) {
        LONG_CACHE_CONTROL
    } else {
        NO_CACHE_CONTROL
    }
}

/// Returns the router used to serve the landscape website files located in
/// the directory provided.
///
/// The website is always served at the root, as the screenshot route is not
/// prefixed with the base path in the web application. When a base path is
/// provided, the website is also served under it, and both the root and the
/// base path redirect to the base path with a trailing slash (keeping the
/// query). Paths that do not match any file are web application routes when
/// their last segment has no extension (the index is returned), and missing
/// files otherwise.
pub(crate) fn router(landscape_dir: &Path, base_path: Option<&str>) -> Router {
    // Setup the website service, falling back to the index for the routes
    let index_path = Arc::new(landscape_dir.join("index.html"));
    let website = ServeDir::new(landscape_dir).fallback(spa_fallback.with_state(index_path));

    // Serve the website under the base path, redirecting to it, when provided
    let mut router = Router::new();
    if let Some(base_path) = base_path {
        let base_path_url = format!("{base_path}/");
        let redirect = get({
            let base_path_url = base_path_url.clone();
            move |uri: Uri| async move {
                // Keep the query, as links to the landscape may include one
                // (for example, `?item=<id>` from the embeds)
                match uri.query() {
                    Some(query) => Redirect::temporary(&format!("{base_path_url}?{query}")),
                    None => Redirect::temporary(&base_path_url),
                }
            }
        });
        // Website service nested under the base path, which prefixes its
        // directory redirects with it
        let website_under_base_path = website.clone().redirect_path_prefix(base_path);
        router = router
            .route("/", redirect.clone())
            .route(base_path, redirect)
            .nest_service(&base_path_url, website_under_base_path);
    }

    // Serve the website at the root, setting the cache control header
    let base_path: Option<Arc<str>> = base_path.map(Arc::from);
    router.fallback_service(website).layer(middleware::from_fn_with_state(
        base_path,
        set_cache_control_header,
    ))
}

/// Serves the router provided on the listener provided until the server
/// stops. The listener is already bound, so requests are accepted right away.
///
/// # Errors
/// Returns an error if the server fails.
pub(crate) async fn serve_with_listener(listener: TcpListener, router: Router) -> Result<()> {
    axum::serve(listener, router).await.context("error running http server")
}

/// Reads the base path the landscape in the directory provided was built
/// with from its base dataset (`data/base.json`).
fn read_base_path(landscape_dir: &Path) -> Result<Option<String>> {
    // Read and parse the base dataset
    let path = landscape_dir.join("data").join("base.json");
    let raw = fs::read_to_string(&path).with_context(|| format!("error reading {}", path.display()))?;
    let base: serde_json::Value =
        serde_json::from_str(&raw).with_context(|| format!("error parsing {}", path.display()))?;

    // Extract the base path, when set
    let base_path = base
        .get("base_path")
        .and_then(serde_json::Value::as_str)
        .map(|base_path| base_path.trim_end_matches('/'))
        .filter(|base_path| !base_path.is_empty())
        .map(ToString::to_string);

    Ok(base_path)
}

/// Middleware that sets the cache control header in the response, based on
/// the site relative path requested (the base path provided is stripped). The
/// long cache is only used on successful and not modified responses.
async fn set_cache_control_header(
    State(base_path): State<Option<Arc<str>>>,
    req: Request,
    next: Next,
) -> impl IntoResponse {
    // Prepare header value (based on the site relative path requested)
    let cache_control = cache_control_for(site_relative_path(req.uri().path(), base_path.as_deref()));

    // Execute next handler
    let mut resp = next.run(req).await;

    // Set header using value prepared above, never caching unsuccessful
    // responses. Not modified responses get the same header as the successful
    // ones, as caches update the stored response headers from them
    let cache_control = if resp.status().is_success() || resp.status() == StatusCode::NOT_MODIFIED {
        cache_control
    } else {
        NO_CACHE_CONTROL
    };
    resp.headers_mut().insert(CACHE_CONTROL, HeaderValue::from_static(cache_control));

    resp
}

/// Return a future that will complete when the program is asked to stop via a
/// ctrl+c or terminate signal.
async fn shutdown_signal() {
    // Setup signal handlers
    let ctrl_c = async {
        signal::ctrl_c().await.expect("failed to install ctrl+c signal handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install terminate signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    // Wait for any of the signals
    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
}

/// Returns the site relative path (without the base path provided and the
/// leading slash) of the request path provided.
fn site_relative_path<'a>(path: &'a str, base_path: Option<&str>) -> &'a str {
    let path = base_path
        .and_then(|base_path| path.strip_prefix(base_path))
        .filter(|rest| rest.is_empty() || rest.starts_with('/'))
        .unwrap_or(path);
    path.strip_prefix('/').unwrap_or(path)
}

/// Fallback of the website service, used when the path requested does not
/// match any file. Web application routes (paths whose last segment has no
/// extension) get the index with a successful status, and the rest get a
/// plain not found response.
async fn spa_fallback(State(index_path): State<Arc<PathBuf>>, uri: Uri) -> Response {
    // Missing files are not found
    let last_segment = uri.path().rsplit('/').next().unwrap_or_default();
    if last_segment.contains('.') {
        return StatusCode::NOT_FOUND.into_response();
    }

    // Web application routes get the index
    match tokio::fs::read(index_path.as_ref()).await {
        Ok(index) => (
            [(CONTENT_TYPE, HeaderValue::from_static("text/html; charset=utf-8"))],
            Body::from(index),
        )
            .into_response(),
        Err(err) => {
            error!(%err, path = %index_path.display(), "error reading index");
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}

#[cfg(test)]
mod tests;

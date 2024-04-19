//! This module defines the functionality of the serve CLI subcommand.

use anyhow::Result;
use axum::{
    extract::Request,
    http::{header::CACHE_CONTROL, HeaderValue},
    middleware::{self, Next},
    response::IntoResponse,
    Router,
};
use std::{env, net::SocketAddr, path::PathBuf};
use tokio::{net::TcpListener, signal};
use tower_http::services::{ServeDir, ServeFile};
use tracing::{info, instrument};

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
#[instrument(skip_all)]
pub async fn serve(args: &ServeArgs) -> Result<()> {
    // Setup router
    let landscape_dir = args.landscape_dir.clone().unwrap_or(env::current_dir()?);
    let index_path = landscape_dir.join("index.html");
    let router: Router<()> = Router::new()
        .nest_service(
            "/",
            ServeDir::new(&landscape_dir).not_found_service(ServeFile::new(&index_path)),
        )
        .fallback_service(ServeFile::new(index_path))
        .route_layer(middleware::from_fn(set_cache_control_header));

    // Setup and launch HTTP server
    let addr: SocketAddr = args.addr.parse()?;
    let listener = TcpListener::bind(addr).await?;
    if !args.silent {
        info!("http server running (press ctrl+c to stop)");
        println!("\n🔗 Landscape available at: http://{addr}\n");
    }
    if args.graceful_shutdown {
        axum::serve(listener, router).with_graceful_shutdown(shutdown_signal()).await?;
    } else {
        axum::serve(listener, router).await?;
    };

    Ok(())
}

/// Middleware that sets the cache control header in the response.
async fn set_cache_control_header(req: Request, next: Next) -> impl IntoResponse {
    // Prepare header value (based on the request uri)
    let cache_control = match req.uri().to_string() {
        u if u.starts_with("/assets/") => "max-age=31536000",
        u if u.starts_with("/embed/assets/") => "max-age=31536000",
        u if u.starts_with("/logos/") => "max-age=31536000",
        _ => "no-cache, no-store, must-revalidate",
    };

    // Execute next handler
    let mut resp = next.run(req).await;

    // Set header using value prepared above
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

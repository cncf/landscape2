//! This module defines the functionality of the serve CLI subcommand.

use crate::ServeArgs;
use anyhow::Result;
use axum::{
    http::{HeaderValue, Request},
    middleware::{self, Next},
    response::IntoResponse,
    Router, Server,
};
use reqwest::header::CACHE_CONTROL;
use std::{env, net::SocketAddr};
use tokio::signal;
use tower_http::services::{ServeDir, ServeFile};
use tracing::{info, instrument};

/// Serve landscape website.
#[instrument(skip_all)]
pub(crate) async fn serve(args: &ServeArgs) -> Result<()> {
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
    if !args.silent {
        info!("http server running (press ctrl+c to stop)");
        println!("\n🔗 Landscape available at: http://{addr}\n");
    }
    if args.graceful_shutdown {
        Server::bind(&addr)
            .serve(router.into_make_service())
            .with_graceful_shutdown(shutdown_signal())
            .await?;
    } else {
        Server::bind(&addr).serve(router.into_make_service()).await?;
    };

    Ok(())
}

/// Middleware that sets the cache control header in the response.
pub(crate) async fn set_cache_control_header<B>(req: Request<B>, next: Next<B>) -> impl IntoResponse {
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

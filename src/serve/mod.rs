//! This module defines the functionality of the serve CLI subcommand.

use crate::ServeArgs;
use anyhow::Result;
use axum::{http::HeaderValue, routing::get_service, Router, Server};
use reqwest::header::CACHE_CONTROL;
use std::{env, net::SocketAddr};
use tokio::signal;
use tower_http::{
    services::{ServeDir, ServeFile},
    set_header::SetResponseHeader,
};
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
            get_service(SetResponseHeader::overriding(
                ServeDir::new(&landscape_dir),
                CACHE_CONTROL,
                HeaderValue::try_from(&args.cache_control)?,
            )),
        )
        .fallback_service(get_service(SetResponseHeader::overriding(
            ServeFile::new(index_path),
            CACHE_CONTROL,
            HeaderValue::try_from(&args.cache_control)?,
        )));

    // Setup and launch HTTP server
    let addr: SocketAddr = args.addr.parse()?;
    info!("http server running (press ctrl+c to stop)");
    println!("\n🔗 Landscape available at: http://{addr}\n");
    if args.graceful_shutdown {
        Server::bind(&addr)
            .serve(router.into_make_service())
            .with_graceful_shutdown(shutdown_signal())
            .await?;
        info!("http server stopped");
    } else {
        Server::bind(&addr).serve(router.into_make_service()).await?;
    };

    Ok(())
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

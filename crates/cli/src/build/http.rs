//! This module provides the HTTP clients used to fetch data from external
//! services during the build.

use std::time::Duration;

use anyhow::Result;
use reqwest::header::HeaderMap;
use reqwest_middleware::{ClientBuilder, ClientWithMiddleware};
use reqwest_retry::{RetryTransientMiddleware, policies::ExponentialBackoff};

/// Maximum time to wait for a connection to be established.
const HTTP_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// Maximum time to wait for a request to complete, body included.
const HTTP_TIMEOUT: Duration = Duration::from_secs(60);

/// User agent sent in all requests.
pub(crate) const USER_AGENT: &str = concat!(env!("CARGO_PKG_NAME"), "/", env!("CARGO_PKG_VERSION"));

/// Create a new HTTP client with timeouts, the landscape2 user agent and the
/// default headers provided.
pub(crate) fn new_http_client(headers: HeaderMap) -> Result<reqwest::Client> {
    let http_client = reqwest::Client::builder()
        .connect_timeout(HTTP_CONNECT_TIMEOUT)
        .default_headers(headers)
        .timeout(HTTP_TIMEOUT)
        .user_agent(USER_AGENT)
        .build()?;
    Ok(http_client)
}

/// Wrap the HTTP client provided in a middleware that retries transient
/// failures (connection errors, timeouts, 408, 429 and 5xx responses) up to
/// `max_retries` times, with exponential backoff between attempts.
pub(crate) fn with_retries(http_client: reqwest::Client, max_retries: u32) -> ClientWithMiddleware {
    let retry_policy = ExponentialBackoff::builder().build_with_max_retries(max_retries);
    ClientBuilder::new(http_client)
        .with(RetryTransientMiddleware::new_with_policy(retry_policy))
        .build()
}

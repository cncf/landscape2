//! This module defines some types used to represent the information collected
//! from GitHub for each of the landscape items repositories (when applicable),
//! as well as the functionality used to collect that information.

use std::{
    collections::{BTreeMap, btree_map::Entry},
    env,
    time::Duration,
};

use anyhow::{Context, Result, format_err};
use async_trait::async_trait;
use chrono::{DateTime, TimeDelta, Utc};
use deadpool::unmanaged::Pool;
use futures::stream::{self, StreamExt};
use landscape2_core::{
    data::{Commit, Contributors, GithubData, LandscapeData, Release, RepositoryGithubData},
    util::github_repository,
};
#[cfg(test)]
use mockall::automock;
use octorust::{
    ClientError,
    auth::Credentials,
    types::{CommitDataType, FullRepository, ParticipationStats},
};
use reqwest::{
    StatusCode,
    header::{self, HeaderMap, HeaderName, HeaderValue},
};
use reqwest_middleware::ClientWithMiddleware;
use tracing::{debug, instrument, warn};

use super::{
    cache::{CACHE_MAX_AGE, Cache, merge_for_write, select_cached},
    http::{USER_AGENT, new_http_client, with_retries},
};

/// GitHub API base url.
const GITHUB_API_URL: &str = "https://api.github.com";

/// GitHub REST API version requested.
const GITHUB_API_VERSION: &str = "2022-11-28";

/// File used to cache data collected from GitHub.
const GITHUB_CACHE_FILE: &str = "github.json";

/// How long the GitHub data in the cache is valid.
const GITHUB_CACHE_TTL: TimeDelta = TimeDelta::days(7);

/// Maximum number of retries of the requests that fail transiently.
const GITHUB_MAX_RETRIES: u32 = 3;

/// Maximum number of retries while GitHub computes the participation stats.
const GITHUB_PARTICIPATION_STATS_MAX_RETRIES: u32 = 3;

/// Delay before the first retry while GitHub computes the participation
/// stats (doubled on each retry).
const GITHUB_RETRY_DELAY: Duration = Duration::from_secs(2);

/// Environment variable containing a comma separated list of GitHub tokens.
const GITHUB_TOKENS: &str = "GITHUB_TOKENS";

/// Collect GitHub data for each of the items repositories in the landscape,
/// reusing cached data whenever possible.
#[instrument(skip_all, err)]
pub(crate) async fn collect_github_data(cache: &Cache, landscape_data: &LandscapeData) -> Result<GithubData> {
    debug!("collecting repositories information from github (this may take a while)");

    // Setup GitHub API clients pool if any tokens have been provided
    let tokens = env::var(GITHUB_TOKENS).map_or_default(|raw| parse_tokens(&raw));
    let gh_pool: Option<Pool<DynGH>> = if tokens.is_empty() {
        warn!("github tokens not provided: only cached information will be used");
        None
    } else {
        let mut gh_clients: Vec<DynGH> = vec![];
        for token in &tokens {
            gh_clients.push(Box::new(GHApi::new(token, GHApiConfig::default())?));
        }
        Some(Pool::from(gh_clients))
    };

    Ok(collect_github_data_with(cache, landscape_data, gh_pool, Utc::now()).await)
}

/// Collect GitHub data for each of the items repositories in the landscape
/// using the clients pool provided (if any), reusing cached data whenever
/// possible.
///
/// Expired cached entries are refreshed when possible. When a refresh fails,
/// or no clients are available, the expired entry is used instead. The cache
/// file is only written when some data was fetched in this run, merging the
/// entries used with the existing ones.
async fn collect_github_data_with(
    cache: &Cache,
    landscape_data: &LandscapeData,
    gh_pool: Option<Pool<DynGH>>,
    now: DateTime<Utc>,
) -> GithubData {
    // Collect urls of the repositories to process, along with the branch
    // declared for them (the first declaration wins)
    let mut branches: BTreeMap<&str, Option<&str>> = BTreeMap::new();
    for item in &landscape_data.items {
        for repo in item.repositories.iter().flatten() {
            if github_repository(&repo.url).is_none() {
                continue;
            }
            let branch = repo.branch.as_deref();
            match branches.entry(repo.url.as_str()) {
                Entry::Vacant(entry) => {
                    entry.insert(branch);
                }
                Entry::Occupied(mut entry) => match (*entry.get(), branch) {
                    (None, Some(_)) => {
                        entry.insert(branch);
                    }
                    (Some(first_branch), Some(other_branch)) if first_branch != other_branch => {
                        warn!(
                            url = %repo.url,
                            branch = first_branch,
                            ignored_branch = other_branch,
                            "conflicting branches declared for repository: using the first one"
                        );
                    }
                    _ => {}
                },
            }
        }
    }
    let urls: Vec<&str> = branches.keys().copied().collect();

    // Read cached entries and select the fresh ones
    let cached: GithubData = cache.read_entries(GITHUB_CACHE_FILE);
    let (mut github_data, misses) = select_cached(&cached, &urls, now, GITHUB_CACHE_TTL);

    // Fetch the repositories without fresh cached data from GitHub
    let gh_pool = gh_pool.as_ref();
    let concurrency = gh_pool.map_or(1, |gh_pool| gh_pool.status().max_size);
    let results: Vec<(&str, Result<RepositoryGithubData>)> = stream::iter(misses)
        .map(|url| {
            let branch = branches.get(url).copied().flatten();
            let previous = cached.get(url);
            async move {
                let result = match gh_pool {
                    Some(gh_pool) => match gh_pool.get().await {
                        Ok(gh) => collect_repository_data(&**gh, url, branch, previous, now).await,
                        Err(err) => Err(format_err!("error getting github client: {err}")),
                    },
                    None => Err(format_err!("github tokens not provided")),
                };
                (url, result)
            }
        })
        .buffer_unordered(concurrency)
        .collect()
        .await;

    // Use the fetched data, falling back to the stale cached data on failure
    // (failures are only logged when tokens were provided)
    let mut fetched_count = 0;
    let mut stale_count = 0;
    for (url, result) in results {
        match result {
            Ok(repository_data) => {
                github_data.insert(url.to_string(), repository_data);
                fetched_count += 1;
            }
            Err(err) => {
                if let Some(stale_repository_data) = cached.get(url) {
                    if gh_pool.is_some() {
                        warn!(%url, err = %format_args!("{err:#}"), "using stale cached data");
                    }
                    github_data.insert(url.to_string(), stale_repository_data.clone());
                    stale_count += 1;
                } else if gh_pool.is_some() {
                    warn!(%url, err = %format_args!("{err:#}"), "no github data available for repository");
                }
            }
        }
    }
    if stale_count > 0 {
        warn!(stale_count, "stale cached github data used for some repositories");
    }

    // Write the merged entries to the cache when some data was fetched
    if fetched_count > 0 {
        let entries = merge_for_write(cached, &github_data, now, CACHE_MAX_AGE);
        if let Err(err) = cache.write_entries(GITHUB_CACHE_FILE, entries) {
            warn!(%err, "error writing github cache file");
        }
    }

    debug!("done!");
    github_data
}

/// Collect repository data from GitHub.
///
/// Commits are read from the branch provided, or from the repository default
/// branch when none is declared. The previous (cached) data of the repository
/// is used for the information GitHub cannot provide at the moment.
#[instrument(skip_all, err)]
async fn collect_repository_data(
    gh: &dyn GH,
    repo_url: &str,
    branch: Option<&str>,
    previous: Option<&RepositoryGithubData>,
    now: DateTime<Utc>,
) -> Result<RepositoryGithubData> {
    // Get the repository details
    let (owner, repo) = get_owner_and_repo(repo_url)?;
    let gh_repo = gh.get_repository(owner, repo).await?;
    let ref_ = branch.unwrap_or(&gh_repo.default_branch);

    // Collect the remaining information from GitHub
    let contributors_count = gh.get_contributors_count(owner, repo).await?;
    let first_commit = gh.get_first_commit(owner, repo, ref_).await?;
    let languages = gh.get_languages(owner, repo).await?;
    let latest_commit = gh.get_latest_commit(owner, repo, ref_).await?;
    let latest_release = gh.get_latest_release(owner, repo).await?;
    let participation_stats = gh.get_participation_stats(owner, repo).await?;

    // Keep the previous contributors count when GitHub cannot provide it
    let contributors_count = match (contributors_count, previous) {
        (Some(count), _) => count,
        (None, Some(previous)) => previous.contributors.count,
        (None, None) => {
            warn!(%repo_url, "contributors count not available: using 0");
            0
        }
    };

    // Reuse the previous participation stats while GitHub computes them,
    // storing the entry already expired so that it is refreshed next build
    let (generated_at, participation_stats) = if let Some(participation_stats) = participation_stats {
        (now, participation_stats)
    } else {
        warn!(%repo_url, "participation stats not ready yet: entry will be refreshed next build");
        let participation_stats = previous.map_or_default(|p| p.participation_stats.clone());
        (now - GITHUB_CACHE_TTL, participation_stats)
    };

    // Prepare repository instance using the information collected
    Ok(RepositoryGithubData {
        contributors: Contributors {
            count: contributors_count,
            url: format!("https://github.com/{owner}/{repo}/graphs/contributors"),
        },
        description: gh_repo.description,
        generated_at,
        latest_commit,
        participation_stats,
        stars: gh_repo.stargazers_count,
        url: gh_repo.html_url,

        first_commit,
        languages,
        latest_release,
        // License name reported by GitHub ("Other" for the licenses it cannot
        // identify)
        license: gh_repo.license.map(|license| license.name),
        topics: gh_repo.topics,
    })
}

/// Type alias to represent a GH trait object.
type DynGH = Box<dyn GH + Send + Sync>;

/// Trait that defines some operations a GH implementation must support.
///
/// The lint allowed only applies to the fields of the generated `MockGH`.
#[cfg_attr(test, automock)]
#[async_trait]
#[cfg_attr(test, allow(clippy::struct_field_names))]
trait GH {
    /// Get number of repository contributors, or `None` when GitHub cannot
    /// provide it (i.e. the contributors list is too large).
    async fn get_contributors_count(&self, owner: &str, repo: &str) -> Result<Option<usize>>;

    /// Get first commit.
    async fn get_first_commit(&self, owner: &str, repo: &str, ref_: &str) -> Result<Option<Commit>>;

    /// Get languages used in repository, or `None` when there are none.
    async fn get_languages(&self, owner: &str, repo: &str) -> Result<Option<BTreeMap<String, i64>>>;

    /// Get latest commit.
    async fn get_latest_commit(&self, owner: &str, repo: &str, ref_: &str) -> Result<Commit>;

    /// Get latest release.
    async fn get_latest_release(&self, owner: &str, repo: &str) -> Result<Option<Release>>;

    /// Get the weekly commits count over the last year, or `None` when GitHub
    /// is still computing it.
    async fn get_participation_stats(&self, owner: &str, repo: &str) -> Result<Option<Vec<i64>>>;

    /// Get repository.
    async fn get_repository(&self, owner: &str, repo: &str) -> Result<FullRepository>;
}

/// GH implementation backed by the GitHub API.
struct GHApi {
    /// Authorization header sent in the requests made with the HTTP client.
    auth_header: HeaderValue,
    /// GitHub API client configuration.
    config: GHApiConfig,
    /// octorust GitHub API client.
    gh_client: octorust::Client,
    /// HTTP client used for the requests the octorust client cannot make.
    http_client: ClientWithMiddleware,
}

impl GHApi {
    /// Create a new GHApi instance.
    fn new(token: &str, config: GHApiConfig) -> Result<Self> {
        // Prepare the authorization header, keeping the token out of logs
        let mut auth_header =
            HeaderValue::from_str(&format!("Bearer {token}")).context("invalid GITHUB_TOKENS entry")?;
        auth_header.set_sensitive(true);

        // Setup HTTP client (shared with the octorust client, so that there
        // is only one connection pool per token)
        let mut headers = HeaderMap::new();
        headers.insert(
            header::ACCEPT,
            HeaderValue::from_static("application/vnd.github+json"),
        );
        headers.insert(
            HeaderName::from_static("x-github-api-version"),
            HeaderValue::from_static(GITHUB_API_VERSION),
        );
        let http_client = with_retries(new_http_client(headers)?, config.max_retries);

        // Setup octorust GitHub API client
        let mut gh_client = octorust::Client::custom(
            USER_AGENT,
            Credentials::Token(token.to_string()),
            http_client.clone(),
        );
        gh_client.with_host_override(&config.api_url);

        Ok(Self {
            auth_header,
            config,
            gh_client,
            http_client,
        })
    }
}

#[async_trait]
impl GH for GHApi {
    /// [`GH::get_contributors_count`].
    #[instrument(skip(self), err)]
    async fn get_contributors_count(&self, owner: &str, repo: &str) -> Result<Option<usize>> {
        // Request the first contributors page
        let url = format!("{}/repos/{owner}/{repo}/contributors", self.config.api_url);
        let response = self
            .http_client
            .head(url)
            .query(&[("anon", "true"), ("per_page", "1")])
            .header(header::AUTHORIZATION, self.auth_header.clone())
            .send()
            .await?;
        match response.status() {
            // The repository has no contributors
            StatusCode::NO_CONTENT => Ok(Some(0)),
            // The contributors list is too large to be computed
            StatusCode::FORBIDDEN => Ok(None),
            // One contributor per page: the last page is the contributors count
            _ => {
                let response = response.error_for_status()?;
                Ok(Some(get_last_page(response.headers())?.unwrap_or(1)))
            }
        }
    }

    /// [`GH::get_first_commit`].
    #[instrument(skip(self), err)]
    async fn get_first_commit(&self, owner: &str, repo: &str, ref_: &str) -> Result<Option<Commit>> {
        // Get last commits page
        let url = format!("{}/repos/{owner}/{repo}/commits", self.config.api_url);
        let response = self
            .http_client
            .head(url)
            .query(&[("per_page", "1"), ("sha", ref_)])
            .header(header::AUTHORIZATION, self.auth_header.clone())
            .send()
            .await?
            .error_for_status()?;
        let last_page = i64::try_from(get_last_page(response.headers())?.unwrap_or(1))?;

        // Get first repository commit and return it if found
        let first_commit = self
            .gh_client
            .repos()
            .list_commits(owner, repo, ref_, "", "", None, None, 1, last_page)
            .await?
            .body
            .pop()
            .map(new_commit_from);
        Ok(first_commit)
    }

    /// [`GH::get_languages`].
    #[instrument(skip(self), err)]
    async fn get_languages(&self, owner: &str, repo: &str) -> Result<Option<BTreeMap<String, i64>>> {
        let url = format!("{}/repos/{owner}/{repo}/languages", self.config.api_url);
        let languages: BTreeMap<String, i64> = self
            .http_client
            .get(url)
            .header(header::AUTHORIZATION, self.auth_header.clone())
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(Some(languages).filter(|languages| !languages.is_empty()))
    }

    /// [`GH::get_latest_commit`].
    #[instrument(skip(self), err)]
    async fn get_latest_commit(&self, owner: &str, repo: &str, ref_: &str) -> Result<Commit> {
        let response = self.gh_client.repos().get_commit(owner, repo, 1, 1, ref_).await?;
        Ok(new_commit_from(response.body))
    }

    /// [`GH::get_latest_release`].
    #[instrument(skip(self), err)]
    async fn get_latest_release(&self, owner: &str, repo: &str) -> Result<Option<Release>> {
        match self.gh_client.repos().get_latest_release(owner, repo).await {
            Ok(response) => Ok(Some(new_release_from(response.body))),
            Err(ClientError::HttpError { status, .. }) if status == StatusCode::NOT_FOUND => Ok(None),
            Err(err) => Err(err.into()),
        }
    }

    /// [`GH::get_participation_stats`].
    #[instrument(skip(self), err)]
    async fn get_participation_stats(&self, owner: &str, repo: &str) -> Result<Option<Vec<i64>>> {
        let url = format!("{}/repos/{owner}/{repo}/stats/participation", self.config.api_url);
        let mut retry_delay = self.config.retry_delay;
        for attempt in 0..=GITHUB_PARTICIPATION_STATS_MAX_RETRIES {
            // Wait before retrying, doubling the delay each time
            if attempt > 0 {
                tokio::time::sleep(retry_delay).await;
                retry_delay *= 2;
            }

            // Request the stats, retrying while GitHub is computing them
            let response = self
                .http_client
                .get(&url)
                .header(header::AUTHORIZATION, self.auth_header.clone())
                .send()
                .await?
                .error_for_status()?;
            if response.status() == StatusCode::ACCEPTED {
                continue;
            }
            let participation_stats: ParticipationStats = response.json().await?;
            return Ok(Some(participation_stats.all));
        }
        Ok(None)
    }

    /// [`GH::get_repository`].
    #[instrument(skip(self), err)]
    async fn get_repository(&self, owner: &str, repo: &str) -> Result<FullRepository> {
        let response = self.gh_client.repos().get(owner, repo).await?;
        Ok(response.body)
    }
}

/// Configuration of the GitHub API client.
#[derive(Debug)]
struct GHApiConfig {
    /// GitHub API base url.
    api_url: String,
    /// Maximum number of retries of the requests that fail transiently.
    max_retries: u32,
    /// Delay before the first retry while GitHub computes the participation
    /// stats (doubled on each retry).
    retry_delay: Duration,
}

impl Default for GHApiConfig {
    /// Returns the configuration used to access the GitHub API.
    fn default() -> Self {
        Self {
            api_url: GITHUB_API_URL.to_string(),
            max_retries: GITHUB_MAX_RETRIES,
            retry_delay: GITHUB_RETRY_DELAY,
        }
    }
}

/// Return the last page of results available from the headers provided.
fn get_last_page(headers: &HeaderMap) -> Result<Option<usize>> {
    if let Some(link_header) = headers.get(header::LINK) {
        let rels = parse_link_header::parse_with_rel(link_header.to_str()?)?;
        if let Some(last_page_url) = rels.get("last")
            && let Some(last_page) = last_page_url.queries.get("page")
        {
            return Ok(Some(last_page.parse()?));
        }
    }
    Ok(None)
}

/// Extract the owner and repository from the repository url provided.
fn get_owner_and_repo(repo_url: &str) -> Result<(&str, &str)> {
    github_repository(repo_url).ok_or_else(|| format_err!("invalid repository url"))
}

/// Create a new commit instance from the octorust commit data provided.
///
/// A missing or invalid author date results in a commit without timestamp.
fn new_commit_from(value: CommitDataType) -> Commit {
    let ts = value.commit.author.and_then(|author| match DateTime::parse_from_rfc3339(&author.date) {
        Ok(date) => Some(date.into()),
        Err(err) => {
            warn!(%err, date = %author.date, url = %value.html_url, "invalid commit date");
            None
        }
    });
    Commit {
        url: value.html_url,
        ts,
    }
}

/// Create a new release instance from the octorust release data provided.
fn new_release_from(value: octorust::types::Release) -> Release {
    Release {
        url: value.html_url,
        ts: value.published_at,
    }
}

/// Split the comma separated list of GitHub tokens provided, trimming them
/// and dropping the empty entries.
fn parse_tokens(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(str::trim)
        .filter(|token| !token.is_empty())
        .map(ToString::to_string)
        .collect()
}

#[cfg(test)]
mod tests;

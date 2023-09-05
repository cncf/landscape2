//! This module defines some types used to represent the information collected
//! from GitHub for each of the landscape items repositories (when applicable),
//! as well as the functionality used to collect that information.

use super::{cache::Cache, LandscapeData};
use anyhow::{format_err, Result};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use deadpool::unmanaged::{Object, Pool};
use futures::stream::{self, StreamExt};
use lazy_static::lazy_static;
#[cfg(test)]
use mockall::automock;
use octorust::auth::Credentials;
use octorust::types::{FullRepository, ParticipationStats};
use regex::Regex;
use reqwest::header;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use tracing::{debug, instrument, warn};

/// File used to cache data collected from GitHub.
const GITHUB_CACHE_FILE: &str = "github.json";

/// How long the GitHub data in the cache is valid (in days).
const GITHUB_CACHE_TTL: i64 = 7;

/// Environment variable containing a comma separated list of GitHub tokens.
const GITHUB_TOKENS: &str = "GITHUB_TOKENS";

/// Collect GitHub data for each of the items repositories in the landscape,
/// reusing cached data whenever possible.
#[instrument(skip_all, err)]
pub(crate) async fn collect_github_data(cache: &Cache, landscape_data: &LandscapeData) -> Result<GithubData> {
    debug!("collecting repositories information from github (this may take a while)");

    // Read cached data (if available)
    let mut cached_data: Option<GithubData> = None;
    if let Ok(Some(json_data)) = cache.read(GITHUB_CACHE_FILE) {
        if let Ok(github_data) = serde_json::from_slice(&json_data) {
            cached_data = Some(github_data);
        }
    };

    // Setup GitHub API clients pool if any tokens have been provided
    let tokens: Option<Vec<String>> = match env::var(GITHUB_TOKENS) {
        Ok(tokens) if !tokens.is_empty() => Some(tokens.split(',').map(ToString::to_string).collect()),
        Ok(_) | Err(_) => None,
    };
    let gh_pool: Option<Pool<DynGH>> = if let Some(tokens) = &tokens {
        let mut gh_clients: Vec<DynGH> = vec![];
        for token in tokens {
            let gh = Box::new(GHApi::new(token)?);
            gh_clients.push(gh);
        }
        Some(Pool::from(gh_clients))
    } else {
        warn!("github tokens not provided: no information will be collected from github");
        None
    };

    // Collect urls of the repositories to process
    let mut urls = vec![];
    for item in &landscape_data.items {
        if let Some(repositories) = &item.repositories {
            for repo in repositories {
                urls.push(&repo.url);
            }
        }
    }
    urls.sort();
    urls.dedup();

    // Collect repositories information from GitHub, reusing cached data when available
    let concurrency = if let Some(tokens) = tokens {
        tokens.len()
    } else {
        1
    };
    let github_data: GithubData = stream::iter(urls)
        .map(|url| async {
            let url = url.clone();
            if let Some(cached_repo) = cached_data.as_ref().and_then(|cache| {
                cache.get(&url).and_then(|repo| {
                    if repo.generated_at + chrono::Duration::days(GITHUB_CACHE_TTL) > Utc::now() {
                        Some(repo)
                    } else {
                        None
                    }
                })
            }) {
                // Use cached data when available if it hasn't expired yet
                (url, Ok(cached_repo.clone()))
            } else {
                // Otherwise we pull it from GitHub if any tokens were provided
                if let Some(gh_pool) = &gh_pool {
                    let gh = gh_pool.get().await.expect("token -when available-");
                    (url.clone(), Repository::new(gh, &url).await)
                } else {
                    (url.clone(), Err(format_err!("no tokens provided")))
                }
            }
        })
        .buffer_unordered(concurrency)
        .collect::<HashMap<String, Result<Repository>>>()
        .await
        .into_iter()
        .filter_map(|(url, result)| {
            if let Ok(github_data) = result {
                Some((url, github_data))
            } else {
                None
            }
        })
        .collect();

    // Write data (in json format) to cache
    cache.write(GITHUB_CACHE_FILE, &serde_json::to_vec_pretty(&github_data)?)?;

    Ok(github_data)
}

/// Type alias to represent some repositories' GitHub data.
pub(crate) type GithubData = HashMap<RepositoryUrl, Repository>;

/// Type alias to represent a GitHub repository url.
pub(crate) type RepositoryUrl = String;

/// Repository information collected from GitHub.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Repository {
    pub contributors: Contributors,
    pub description: String,
    pub first_commit: Commit,
    pub generated_at: DateTime<Utc>,
    pub latest_commit: Commit,
    pub participation_stats: Vec<i64>,
    pub stars: i64,
    pub url: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub languages: Option<HashMap<String, i64>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_release: Option<Release>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
}

impl Repository {
    /// Create a new Repository instance from information available on GitHub.
    async fn new(gh: Object<DynGH>, repo_url: &str) -> Result<Self> {
        // Collect some information from GitHub
        let (owner, repo) = get_owner_and_repo(repo_url)?;
        let gh_repo = gh.get_repository(&owner, &repo).await?;
        let contributors_count = gh.get_contributors_count(&owner, &repo).await?;
        let first_commit = gh.get_first_commit(&owner, &repo, &gh_repo.default_branch).await?;
        let languages = gh.get_languages(&owner, &repo).await?;
        let latest_commit = gh.get_latest_commit(&owner, &repo, &gh_repo.default_branch).await?;
        let latest_release = gh.get_latest_release(&owner, &repo).await?;
        let participation_stats = gh.get_participation_stats(&owner, &repo).await?.all;

        // Prepare repository instance using the information collected
        Ok(Repository {
            generated_at: Utc::now(),
            contributors: Contributors {
                count: contributors_count,
                url: format!("https://github.com/{owner}/{repo}/graphs/contributors"),
            },
            description: gh_repo.description,
            first_commit,
            languages,
            latest_commit,
            latest_release,
            license: gh_repo.license.and_then(|l| {
                if l.name == "NOASSERTION" {
                    None
                } else {
                    Some(l.name)
                }
            }),
            participation_stats,
            stars: gh_repo.stargazers_count,
            url: gh_repo.html_url,
        })
    }
}

/// Commit information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Commit {
    pub ts: Option<DateTime<Utc>>,
    pub url: String,
}

impl From<octorust::types::CommitDataType> for Commit {
    fn from(value: octorust::types::CommitDataType) -> Self {
        let mut commit = Commit {
            url: value.html_url,
            ts: None,
        };
        if let Some(author) = value.commit.author {
            commit.ts = Some(DateTime::parse_from_rfc3339(&author.date).expect("date to be valid").into());
        }
        commit
    }
}

/// Contributors information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Contributors {
    pub count: usize,
    pub url: String,
}

/// Release information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Release {
    pub ts: Option<DateTime<Utc>>,
    pub url: String,
}

impl From<octorust::types::Release> for Release {
    fn from(value: octorust::types::Release) -> Self {
        Self {
            ts: value.published_at,
            url: value.html_url,
        }
    }
}

/// GitHub API base url.
const GITHUB_API_URL: &str = "https://api.github.com";

/// Type alias to represent a GH trait object.
type DynGH = Box<dyn GH + Send + Sync>;

/// Trait that defines some operations a GH implementation must support.
#[async_trait]
#[cfg_attr(test, automock)]
trait GH {
    /// Get number of repository contributors.
    async fn get_contributors_count(&self, owner: &str, repo: &str) -> Result<usize>;

    /// Get first commit.
    async fn get_first_commit(&self, owner: &str, repo: &str, ref_: &str) -> Result<Commit>;

    /// Get languages used in repository.
    async fn get_languages(&self, owner: &str, repo: &str) -> Result<Option<HashMap<String, i64>>>;

    /// Get latest commit.
    async fn get_latest_commit(&self, owner: &str, repo: &str, ref_: &str) -> Result<Commit>;

    /// Get latest release.
    async fn get_latest_release(&self, owner: &str, repo: &str) -> Result<Option<Release>>;

    /// Get participation stats.
    async fn get_participation_stats(&self, owner: &str, repo: &str) -> Result<ParticipationStats>;

    /// Get repository.
    async fn get_repository(&self, owner: &str, repo: &str) -> Result<FullRepository>;
}

/// GH implementation backed by the GitHub API.
struct GHApi {
    gh_client: octorust::Client,
    http_client: reqwest::Client,
}

impl GHApi {
    /// Create a new GHApi instance.
    fn new(token: &str) -> Result<Self> {
        // Setup octorust GitHub API client
        let user_agent = format!("{}/{}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"));
        let gh_client = octorust::Client::new(user_agent.clone(), Credentials::Token(token.to_string()))?;

        // Setup HTTP client ready to make requests to the GitHub API
        // (for some operations that cannot be done with the octorust client)
        let mut headers = header::HeaderMap::new();
        headers.insert(
            header::ACCEPT,
            header::HeaderValue::from_str("application/vnd.github+json").unwrap(),
        );
        headers.insert(
            header::AUTHORIZATION,
            header::HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
        );
        headers.insert(
            "X-GitHub-Api-Version",
            header::HeaderValue::from_str("2022-11-28").unwrap(),
        );
        let http_client =
            reqwest::Client::builder().user_agent(user_agent).default_headers(headers).build()?;

        Ok(Self {
            gh_client,
            http_client,
        })
    }
}

#[async_trait]
impl GH for GHApi {
    /// [GH::get_contributors_count]
    #[instrument(fields(?owner, ?repo), skip_all, err)]
    async fn get_contributors_count(&self, owner: &str, repo: &str) -> Result<usize> {
        let mut count = 1;
        let url = format!("{GITHUB_API_URL}/repos/{owner}/{repo}/contributors?per_page=1&anon=true");
        let response = self.http_client.head(url).send().await?;
        if let Some(link_header) = response.headers().get("link") {
            let rels = parse_link_header::parse_with_rel(link_header.to_str()?)?;
            if let Some(last_page_url) = rels.get("last") {
                if let Some(value) = last_page_url.queries.get("page") {
                    count = value.parse()?;
                }
            }
        }
        Ok(count)
    }

    /// [GH::get_first_commit]
    #[instrument(fields(?owner, ?repo, ?ref_), skip_all, err)]
    async fn get_first_commit(&self, owner: &str, repo: &str, ref_: &str) -> Result<Commit> {
        // Get last commits page
        let mut last_page = 1;
        let url = format!("{GITHUB_API_URL}/repos/{owner}/{repo}/commits?sha={ref_}&per_page=1");
        let response = self.http_client.head(url).send().await?;
        if let Some(link_header) = response.headers().get("link") {
            let rels = parse_link_header::parse_with_rel(link_header.to_str()?)?;
            if let Some(last_page_url) = rels.get("last") {
                if let Some(value) = last_page_url.queries.get("page") {
                    last_page = value.parse()?;
                }
            }
        }

        // Get first repository commit
        let commit: Commit = self
            .gh_client
            .repos()
            .list_commits(owner, repo, ref_, "", "", None, None, 1, last_page)
            .await?
            .pop()
            .expect("one commit to exist")
            .into();

        Ok(commit)
    }

    /// [GH::get_languages]
    #[instrument(fields(?owner, ?repo), skip_all, err)]
    async fn get_languages(&self, owner: &str, repo: &str) -> Result<Option<HashMap<String, i64>>> {
        let url = format!("{GITHUB_API_URL}/repos/{owner}/{repo}/languages");
        let languages: HashMap<String, i64> = self.http_client.get(url).send().await?.json().await?;
        Ok(Some(languages))
    }

    /// [GH::get_latest_commit]
    #[instrument(fields(?owner, ?repo, ?ref_), skip_all, err)]
    async fn get_latest_commit(&self, owner: &str, repo: &str, ref_: &str) -> Result<Commit> {
        let commit: Commit = self.gh_client.repos().get_commit(owner, repo, 1, 1, ref_).await?.into();
        Ok(commit)
    }

    /// [GH::get_latest_release]
    #[instrument(fields(?owner, ?repo), skip_all, err)]
    async fn get_latest_release(&self, owner: &str, repo: &str) -> Result<Option<Release>> {
        match self.gh_client.repos().get_latest_release(owner, repo).await {
            Ok(release) => Ok(Some(release.into())),
            Err(err) => {
                if err.to_string().to_lowercase().contains("not found") {
                    return Ok(None);
                }
                Err(err)
            }
        }
    }

    /// [GH::get_participation_stats]
    #[instrument(fields(?owner, ?repo), skip_all, err)]
    async fn get_participation_stats(&self, owner: &str, repo: &str) -> Result<ParticipationStats> {
        self.gh_client.repos().get_participation_stats(owner, repo).await
    }

    /// [GH::get_repository]
    #[instrument(fields(?owner, ?repo), skip_all, err)]
    async fn get_repository(&self, owner: &str, repo: &str) -> Result<FullRepository> {
        self.gh_client.repos().get(owner, repo).await
    }
}

lazy_static! {
    /// GitHub repository url regular expression.
    pub(crate) static ref GITHUB_REPO_URL: Regex =
        Regex::new("^https://github.com/(?P<owner>[^/]+)/(?P<repo>[^/]+)/?$")
            .expect("exprs in GITHUB_REPO_URL to be valid");
}

/// Extract the owner and repository from the repository url provided.
fn get_owner_and_repo(repo_url: &str) -> Result<(String, String)> {
    let c = GITHUB_REPO_URL.captures(repo_url).ok_or_else(|| format_err!("invalid repository url"))?;
    Ok((c["owner"].to_string(), c["repo"].to_string()))
}

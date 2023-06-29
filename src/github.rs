//! This modules defines some types used to represent the information collected
//! from GitHub for each of the landscape items repositories (when applicable),
//! as well as the functionality used to collect that information.

use anyhow::{format_err, Result};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use deadpool::unmanaged::Object;
use lazy_static::lazy_static;
#[cfg(test)]
use mockall::automock;
use octorust::auth::Credentials;
use octorust::types::{FullRepository, ParticipationStats};
use regex::Regex;
use reqwest::header;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::instrument;

/// Repository information collected from GitHub.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Repository {
    pub contributors: Contributors,
    pub description: String,
    pub first_commit: Commit,

    /// Represents the moment at which this instance was generated
    pub generated_at: DateTime<Utc>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub languages: Option<HashMap<String, i64>>,

    pub latest_commit: Commit,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_release: Option<Release>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,

    pub participation_stats: Vec<i64>,
    pub stars: i64,
    pub url: String,
}

impl Repository {
    /// Create a new Repository instance from information available on GitHub.
    pub(crate) async fn new(gh: Object<DynGH>, repo_url: &str) -> Result<Self> {
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
    ts: Option<DateTime<Utc>>,
    url: String,
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
    count: usize,
    url: String,
}

/// Release information.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Release {
    ts: Option<DateTime<Utc>>,
    url: String,
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
pub(crate) type DynGH = Box<dyn GH + Send + Sync>;

/// Trait that defines some operations a GH implementation must support.
#[async_trait]
#[cfg_attr(test, automock)]
pub(crate) trait GH {
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
pub struct GHApi {
    gh_client: octorust::Client,
    http_client: reqwest::Client,
}

impl GHApi {
    /// Create a new GHApi instance.
    pub fn new(token: &str) -> Result<Self> {
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
    static ref GITHUB_REPO_URL: Regex = Regex::new("^https://github.com/(?P<owner>[^/]+)/(?P<repo>[^/]+)/?$")
        .expect("exprs in GITHUB_REPO_URL to be valid");
}

/// Extract the owner and repository from the repository url provided.
fn get_owner_and_repo(repo_url: &str) -> Result<(String, String)> {
    let c = GITHUB_REPO_URL.captures(repo_url).ok_or_else(|| format_err!("invalid repository url"))?;
    Ok((c["owner"].to_string(), c["repo"].to_string()))
}

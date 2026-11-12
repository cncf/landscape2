//! This module defines the functionality to generate the `items.csv`
//! file from the information available in the landscape.

use std::io;

use anyhow::Result;
use chrono::NaiveDate;
use landscape2_core::data::{self, DATE_FORMAT, LandscapeData};
use serde::Serialize;

/// Item information used for each record in the CSV file.
///
/// The order in which the values in Item are defined is the order in which
/// they appear in the CSV file as headers. The file is a public output
/// documented in `docs/api.md`, so new columns are appended at the end.
#[derive(Default, Serialize)]
struct Item {
    /// Item name.
    name: String,
    /// Name of the organization the item belongs to (from Crunchbase).
    organization: Option<String>,
    /// Homepage url.
    homepage: String,
    /// Logo path, relative to the landscape url.
    logo: String,
    /// Twitter url, falling back to the Crunchbase one.
    twitter: Option<String>,
    /// Crunchbase url of the organization the item belongs to.
    crunchbase_url: Option<String>,
    /// Total funding raised by the organization, in USD (from Crunchbase).
    funding: Option<i64>,
    /// Members category subcategory of the organization the item belongs to.
    member: Option<String>,
    /// Relation with the foundation: the project maturity, or `member`.
    relation: Option<String>,
    /// Technical Advisory Groups (TAG) the item is associated to, joined with commas.
    tag: Option<String>,
    /// Primary repository license: the data file override, or the one detected by GitHub.
    license: Option<String>,
    /// Headquarters location: the Crunchbase city, region and country available, joined with commas.
    headquarters: Option<String>,
    /// Item description.
    description: Option<String>,
    /// Organization description (from Crunchbase).
    crunchbase_description: Option<String>,
    /// Organization homepage url (from Crunchbase).
    crunchbase_homepage: Option<String>,
    /// City where the organization is headquartered (from Crunchbase).
    crunchbase_city: Option<String>,
    /// Region where the organization is headquartered (from Crunchbase).
    crunchbase_region: Option<String>,
    /// Country where the organization is headquartered (from Crunchbase).
    crunchbase_country: Option<String>,
    /// Organization Twitter url (from Crunchbase).
    crunchbase_twitter: Option<String>,
    /// Organization LinkedIn url (from Crunchbase).
    crunchbase_linkedin: Option<String>,
    /// Organization stock ticker (from Crunchbase).
    crunchbase_ticker: Option<String>,
    /// Kind of organization data (`funding` when its total funding is known).
    crunchbase_kind: Option<String>,
    /// Minimum number of employees of the organization (from Crunchbase).
    crunchbase_min_employees: Option<i64>,
    /// Maximum number of employees of the organization (from Crunchbase).
    crunchbase_max_employees: Option<i64>,
    /// Name of the item's primary category.
    category: String,
    /// Name of the item's primary subcategory.
    subcategory: String,
    /// Whether the item is open source.
    oss: Option<bool>,
    /// Primary repository url (from GitHub).
    github_repo: Option<String>,
    /// Primary repository number of stars (from GitHub).
    github_stars: Option<i64>,
    /// Primary repository description (from GitHub).
    github_description: Option<String>,
    /// Date of the primary repository latest commit (from GitHub).
    github_latest_commit_date: Option<String>,
    /// Url of the primary repository latest commit (from GitHub).
    github_latest_commit_link: Option<String>,
    /// Date of the primary repository latest release (from GitHub).
    github_latest_release_date: Option<String>,
    /// Url of the primary repository latest release (from GitHub).
    github_latest_release_link: Option<String>,
    /// Date of the primary repository first commit (from GitHub).
    github_start_commit_date: Option<String>,
    /// Url of the primary repository first commit (from GitHub).
    github_start_commit_link: Option<String>,
    /// Primary repository number of contributors (from GitHub).
    github_contributors_count: Option<usize>,
    /// Url of the primary repository contributors page (from GitHub).
    github_contributors_link: Option<String>,
    /// Date at which the project was accepted in the foundation.
    accepted: Option<String>,
    /// Date at which the project moved to incubating.
    incubation: Option<String>,
    /// Date at which the project moved to graduated.
    graduated: Option<String>,
    /// Dev stats url.
    dev_stats_url: Option<String>,
    /// Artwork url.
    artwork_url: Option<String>,
    /// Blog url.
    blog_url: Option<String>,
    /// Mailing list url.
    mailing_list_url: Option<String>,
    /// Slack url.
    slack_url: Option<String>,
    /// YouTube url.
    youtube_url: Option<String>,
    /// Channel to discuss topics related to the item.
    chat_channel: Option<String>,
    /// Date of the latest security audit (by date, not by list position).
    last_audit_date: Option<String>,
    /// Url of the latest security audit report.
    last_audit_url: Option<String>,
    /// Item identifier.
    id: String,
}

impl From<&data::Item> for Item {
    #[allow(clippy::too_many_lines)]
    fn from(di: &data::Item) -> Self {
        // Helper closure to format dates
        let fmt_date = |date: NaiveDate| date.format(DATE_FORMAT).to_string();

        // Setup item
        let mut item: Item = Item {
            accepted: di.accepted_at.map(fmt_date),
            artwork_url: di.artwork_url.clone(),
            blog_url: di.blog_url.clone(),
            category: di.category.clone(),
            chat_channel: di.chat_channel.clone(),
            crunchbase_url: di.crunchbase_url.clone(),
            description: di.description.clone(),
            dev_stats_url: di.devstats_url.clone(),
            graduated: di.graduated_at.map(fmt_date),
            homepage: di.homepage_url.clone(),
            id: di.id.clone(),
            incubation: di.incubating_at.map(fmt_date),
            logo: di.logo.clone(),
            mailing_list_url: di.mailing_list_url.clone(),
            member: di.member_subcategory.clone(),
            name: di.name.clone(),
            oss: di.oss,
            slack_url: di.slack_url.clone(),
            subcategory: di.subcategory.clone(),
            youtube_url: di.youtube_url.clone(),
            ..Default::default()
        };

        // Crunchbase values
        if let Some(organization) = &di.crunchbase_data {
            item.crunchbase_city.clone_from(&organization.city);
            item.crunchbase_country.clone_from(&organization.country);
            item.crunchbase_description.clone_from(&organization.description);
            item.crunchbase_homepage.clone_from(&organization.homepage_url);
            item.crunchbase_kind.clone_from(&organization.kind);
            item.crunchbase_linkedin.clone_from(&organization.linkedin_url);
            item.crunchbase_max_employees = organization.num_employees_max;
            item.crunchbase_min_employees = organization.num_employees_min;
            item.crunchbase_region.clone_from(&organization.region);
            item.crunchbase_ticker.clone_from(&organization.ticker);
            item.crunchbase_twitter.clone_from(&organization.twitter_url);
            item.funding = organization.funding;
            item.organization.clone_from(&organization.name);
        }

        // Twitter
        if di.twitter_url.is_some() {
            item.twitter.clone_from(&di.twitter_url);
        } else if item.crunchbase_twitter.is_some() {
            item.twitter.clone_from(&item.crunchbase_twitter);
        }

        // Relation
        if let Some(maturity) = &di.maturity {
            item.relation = Some(maturity.clone());
        } else if di.member_subcategory.is_some() {
            item.relation = Some(String::from("member"));
        }

        // Tag
        if let Some(tags) = &di.tag {
            item.tag = Some(tags.join(","));
        }

        // Primary repository and GitHub data
        if let Some(repo) = di.primary_repository() {
            item.license.clone_from(&repo.license); // License override

            if let Some(gh_data) = &repo.github_data {
                item.github_contributors_count = Some(gh_data.contributors.count);
                item.github_contributors_link = Some(gh_data.contributors.url.clone());
                item.github_description = Some(gh_data.description.clone());
                item.github_latest_commit_link = Some(gh_data.latest_commit.url.clone());
                item.github_repo = Some(gh_data.url.clone());
                item.github_stars = Some(gh_data.stars);

                if let Some(commit) = &gh_data.first_commit {
                    item.github_start_commit_link = Some(commit.url.clone());

                    if let Some(date) = commit.ts {
                        item.github_start_commit_date = Some(fmt_date(date.date_naive()));
                    }
                }

                if let Some(date) = gh_data.latest_commit.ts {
                    item.github_latest_commit_date = Some(fmt_date(date.date_naive()));
                }

                if let Some(release) = &gh_data.latest_release {
                    if let Some(date) = release.ts {
                        item.github_latest_release_date = Some(fmt_date(date.date_naive()));
                    }
                    item.github_latest_release_link = Some(release.url.clone());
                }

                if item.license.is_none()
                    && let Some(license) = &gh_data.license
                {
                    item.license = Some(license.clone());
                }
            }
        }

        // Last audit values (the latest by date)
        if let Some(audits) = &di.audits
            && let Some(last_audit) = audits.iter().max_by_key(|a| a.date)
        {
            item.last_audit_date = Some(fmt_date(last_audit.date));
            item.last_audit_url = Some(String::from(&last_audit.url));
        }

        // Headquarters
        let mut hq: Vec<String> = Vec::new();
        if let Some(city) = &item.crunchbase_city {
            hq.push(city.clone());
        }
        if let Some(region) = &item.crunchbase_region {
            hq.push(region.clone());
        }
        if let Some(country) = &item.crunchbase_country {
            hq.push(country.clone());
        }
        if !hq.is_empty() {
            item.headquarters = Some(hq.join(", "));
        }

        item
    }
}

/// Generate CSV file with some information about each item.
pub(crate) fn generate_items_csv<W: io::Write>(
    mut w: csv::Writer<W>,
    landscape_data: &LandscapeData,
) -> Result<()> {
    let mut items: Vec<Item> = landscape_data.items.iter().map(Item::from).collect();
    items.sort_by_cached_key(|i| i.name.to_lowercase());
    items.iter().try_for_each(|i| w.serialize(i))?;
    w.flush()?;

    Ok(())
}

#[cfg(test)]
mod tests;

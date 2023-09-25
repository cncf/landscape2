//! This module defines the functionality to generate the `items.csv`
//! file from the information available in the landscape.

use super::{data, LandscapeData};
use crate::build::data::DATE_FORMAT;
use anyhow::Result;
use chrono::NaiveDate;
use serde::Serialize;
use std::fs::File;

/// Item information used for each record in the CSV file.
///
/// The order in which the values in Item are defined is the order in which
/// they will be appear in the CSV file as headers.
#[derive(Default, Serialize)]
struct Item {
    name: String,
    organization: Option<String>,
    homepage: String,
    logo: String,
    twitter: Option<String>,
    crunchbase_url: Option<String>,
    funding: Option<i64>,
    member: Option<String>,
    relation: Option<String>,
    license: Option<String>,
    headquarters: Option<String>,
    description: Option<String>,
    crunchbase_description: Option<String>,
    crunchbase_homepage: Option<String>,
    crunchbase_city: Option<String>,
    crunchbase_region: Option<String>,
    crunchbase_country: Option<String>,
    crunchbase_twitter: Option<String>,
    crunchbase_linkedin: Option<String>,
    crunchbase_ticker: Option<String>,
    crunchbase_kind: Option<String>,
    crunchbase_min_employees: Option<i64>,
    crunchbase_max_employees: Option<i64>,
    category: String,
    subcategory: String,
    oss: Option<bool>,
    github_repo: Option<String>,
    github_stars: Option<i64>,
    github_description: Option<String>,
    github_latest_commit_date: Option<String>,
    github_latest_commit_link: Option<String>,
    github_latest_release_date: Option<String>,
    github_latest_release_link: Option<String>,
    github_start_commit_date: Option<String>,
    github_start_commit_link: Option<String>,
    github_contributors_count: Option<usize>,
    github_contributors_link: Option<String>,
    accepted: Option<String>,
    incubation: Option<String>,
    graduated: Option<String>,
    dev_stats_url: Option<String>,
    artwork_url: Option<String>,
    blog_url: Option<String>,
    mailing_list_url: Option<String>,
    slack_url: Option<String>,
    youtube_url: Option<String>,
    chat_channel: Option<String>,
    last_audit_date: Option<String>,
    last_audit_url: Option<String>,
}

impl From<&data::Item> for Item {
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
            description: di.description().cloned(),
            dev_stats_url: di.devstats_url.clone(),
            graduated: di.graduated_at.map(fmt_date),
            homepage: di.homepage_url.clone(),
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
            item.crunchbase_city = organization.city.clone();
            item.crunchbase_country = organization.country.clone();
            item.crunchbase_description = organization.description.clone();
            item.crunchbase_homepage = organization.homepage_url.clone();
            item.crunchbase_kind = organization.kind.clone();
            item.crunchbase_linkedin = organization.linkedin_url.clone();
            item.crunchbase_max_employees = organization.num_employees_max;
            item.crunchbase_min_employees = organization.num_employees_min;
            item.crunchbase_region = organization.region.clone();
            item.crunchbase_ticker = organization.ticker.clone();
            item.crunchbase_twitter = organization.twitter_url.clone();
            item.funding = organization.funding;
            item.organization = organization.name.clone();
        }

        // Twitter
        if di.twitter_url.is_some() {
            item.twitter = di.twitter_url.clone();
        } else if item.crunchbase_twitter.is_some() {
            item.twitter = item.crunchbase_twitter.clone();
        }

        // Relation
        if let Some(maturity) = &di.maturity {
            item.relation = Some(maturity.to_string());
        } else if di.member_subcategory.is_some() {
            item.relation = Some(String::from("member"));
        }

        // GitHub values
        if let Some(repo) = di.primary_repository() {
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

                if let Some(license) = &gh_data.license {
                    item.license = Some(license.clone());
                }
            }
        }

        // Last audit values
        if let Some(audits) = &di.audits {
            if let Some(last_audit) = audits.last() {
                item.last_audit_date = Some(fmt_date(last_audit.date));
                item.last_audit_url = Some(String::from(&last_audit.url));
            }
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
pub(crate) fn generate_items_csv(mut w: csv::Writer<File>, landscape_data: &LandscapeData) -> Result<()> {
    let mut items: Vec<Item> = landscape_data.items.iter().map(Item::from).collect();
    items.sort_by_key(|i| i.name.to_lowercase());
    items.iter().try_for_each(|i| w.serialize(i))?;
    w.flush()?;

    Ok(())
}

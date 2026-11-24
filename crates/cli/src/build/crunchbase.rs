//! This module defines some types used to represent the information collected
//! from Crunchbase for each of the landscape items (when applicable), as well
//! as the functionality used to collect that information.

use std::{env, sync::Arc, time::Duration};

use anyhow::{Context, Result, bail, format_err};
use async_trait::async_trait;
use chrono::{DateTime, Months, NaiveDate, TimeDelta, Utc};
use futures::stream::{self, StreamExt};
use landscape2_core::{
    data::{Acquisition, CrunchbaseData, FundingRound, LandscapeData, Organization},
    util::crunchbase_permalink,
};
use leaky_bucket::RateLimiter;
#[cfg(test)]
use mockall::automock;
use reqwest::{
    StatusCode,
    header::{HeaderMap, HeaderName, HeaderValue},
};
use reqwest_middleware::ClientWithMiddleware;
use serde::{Deserialize, Serialize};
use tracing::{debug, instrument, warn};

use super::{
    cache::{CACHE_MAX_AGE, Cache, merge_for_write, select_cached},
    http::{new_http_client, with_retries},
};

/// Environment variable containing the Crunchbase API key.
const CRUNCHBASE_API_KEY: &str = "CRUNCHBASE_API_KEY";

/// Crunchbase API base url.
const CRUNCHBASE_API_URL: &str = "https://api.crunchbase.com/v4/data";

/// File used to cache data collected from Crunchbase.
const CRUNCHBASE_CACHE_FILE: &str = "crunchbase.json";

/// How long the Crunchbase data in the cache is valid.
const CRUNCHBASE_CACHE_TTL: TimeDelta = TimeDelta::days(7);

/// Maximum number of organizations to fetch concurrently from Crunchbase (the
/// rate limiter still caps the requests rate).
const CRUNCHBASE_MAX_CONCURRENCY: usize = 4;

/// Maximum number of retries of the requests that fail transiently (429 and
/// 5xx responses included).
const CRUNCHBASE_MAX_RETRIES: u32 = 3;

/// Interval for the rate limiter used when sending requests to the CB API.
const CRUNCHBASE_RATE_LIMITER_INTERVAL: Duration = Duration::from_millis(300);

/// Collect Crunchbase data for each of the items orgs in the landscape,
/// reusing cached data whenever possible.
#[instrument(skip_all, err)]
pub(crate) async fn collect_crunchbase_data(
    cache: &Cache,
    landscape_data: &LandscapeData,
) -> Result<CrunchbaseData> {
    debug!("collecting organizations information from crunchbase (this may take a while)");

    // Setup Crunchbase API client if an api key was provided
    let api_key = env::var(CRUNCHBASE_API_KEY).map_or_default(|api_key| api_key.trim().to_string());
    let cb: Option<DynCB> = if api_key.is_empty() {
        warn!("crunchbase api key not provided: only cached information will be used");
        None
    } else {
        Some(Arc::new(CBApi::new(&api_key, CRUNCHBASE_API_URL)?))
    };

    Ok(collect_crunchbase_data_with(cache, landscape_data, cb, Utc::now()).await)
}

/// Collect Crunchbase data for each of the items orgs in the landscape using
/// the client provided (if any), reusing cached data whenever possible.
///
/// Expired cached entries are refreshed when possible. When a refresh fails,
/// or no client is available, the expired entry is used instead. The cache
/// file is only written when some data was fetched in this run, merging the
/// entries used with the existing ones.
async fn collect_crunchbase_data_with(
    cache: &Cache,
    landscape_data: &LandscapeData,
    cb: Option<DynCB>,
    now: DateTime<Utc>,
) -> CrunchbaseData {
    // Collect items Crunchbase urls
    let mut urls: Vec<&str> =
        landscape_data.items.iter().filter_map(|item| item.crunchbase_url.as_deref()).collect();
    urls.sort_unstable();
    urls.dedup();

    // Read cached entries and select the fresh ones
    let cached: CrunchbaseData = cache.read_entries(CRUNCHBASE_CACHE_FILE);
    let (mut crunchbase_data, misses) = select_cached(&cached, &urls, now, CRUNCHBASE_CACHE_TTL);

    // Fetch the organizations without fresh cached data from Crunchbase
    let cb = cb.as_deref();
    let limiter = &RateLimiter::builder().initial(1).interval(CRUNCHBASE_RATE_LIMITER_INTERVAL).build();
    let results: Vec<(&str, Result<Organization>)> = stream::iter(misses)
        .map(|url| async move {
            let result = match cb {
                Some(cb) => {
                    limiter.acquire_one().await;
                    collect_organization_data(cb, url, now).await
                }
                None => Err(format_err!("crunchbase api key not provided")),
            };
            (url, result)
        })
        .buffer_unordered(CRUNCHBASE_MAX_CONCURRENCY)
        .collect()
        .await;

    // Use the fetched data, falling back to the stale cached data on failure
    // (failures are only logged one by one when an api key was provided)
    let mut fetched_count = 0;
    let mut missing_count = 0;
    let mut stale_count = 0;
    for (url, result) in results {
        match result {
            Ok(organization) => {
                crunchbase_data.insert(url.to_string(), organization);
                fetched_count += 1;
            }
            Err(err) => {
                if let Some(stale_organization) = cached.get(url) {
                    if cb.is_some() {
                        warn!(%url, err = %format_args!("{err:#}"), "using stale cached data");
                    }
                    crunchbase_data.insert(url.to_string(), stale_organization.clone());
                    stale_count += 1;
                } else {
                    if cb.is_some() {
                        warn!(
                            %url,
                            err = %format_args!("{err:#}"),
                            "no crunchbase data available for organization"
                        );
                    }
                    missing_count += 1;
                }
            }
        }
    }

    // Summarize the organizations without fresh data
    if missing_count > 0 {
        warn!(
            missing_count,
            "no crunchbase data available for some organizations"
        );
    }
    if stale_count > 0 {
        warn!(
            stale_count,
            "stale cached crunchbase data used for some organizations"
        );
    }

    // Write the merged entries to the cache when some data was fetched
    if fetched_count > 0 {
        let entries = merge_for_write(cached, &crunchbase_data, now, CACHE_MAX_AGE);
        if let Err(err) = cache.write_entries(CRUNCHBASE_CACHE_FILE, entries) {
            warn!(%err, "error writing crunchbase cache file");
        }
    }

    debug!("done!");
    crunchbase_data
}

/// Collect organization data from Crunchbase.
#[instrument(skip_all, err)]
async fn collect_organization_data(cb: &dyn CB, cb_url: &str, now: DateTime<Utc>) -> Result<Organization> {
    // Collect some information from Crunchbase
    let permalink = get_permalink(cb_url)?;
    let cb_org = cb.get_organization(permalink).await?;

    // Prepare acquisitions (only those announced in the last 6 years)
    let min_announced_on = now.date_naive().checked_sub_months(Months::new(72));
    let acquisitions = cb_org
        .cards
        .acquiree_acquisitions
        .map(|cb_acquisitions| {
            cb_acquisitions
                .into_iter()
                .map(new_acquisition_from)
                .filter(|a: &Acquisition| {
                    a.announced_on
                        .zip(min_announced_on)
                        .is_some_and(|(announced_on, min_announced_on)| announced_on >= min_announced_on)
                })
                .collect()
        })
        .filter(|vec: &Vec<Acquisition>| !vec.is_empty());

    // Prepare categories, skipping those without value
    let categories = cb_org
        .properties
        .categories
        .map(|categories| categories.into_iter().filter_map(|c| c.value).collect())
        .filter(|vec: &Vec<String>| !vec.is_empty());

    // Prepare funding rounds
    let funding_rounds = cb_org
        .cards
        .raised_funding_rounds
        .map(|cb_funding_rounds| cb_funding_rounds.into_iter().map(new_funding_round_from).collect())
        .filter(|vec: &Vec<FundingRound>| !vec.is_empty());

    // Prepare number of employees
    let (num_employees_min, num_employees_max) = match cb_org.properties.num_employees_enum {
        Some(value) => match value.as_str() {
            "c_00001_00010" => (Some(1), Some(10)),
            "c_00011_00050" => (Some(11), Some(50)),
            "c_00051_00100" => (Some(51), Some(100)),
            "c_00101_00250" => (Some(101), Some(250)),
            "c_00251_00500" => (Some(251), Some(500)),
            "c_00501_01000" => (Some(501), Some(1000)),
            "c_01001_05000" => (Some(1001), Some(5000)),
            "c_05001_10000" => (Some(5001), Some(10000)),
            "c_10001_max" => (Some(10001), None),
            _ => (None, None),
        },
        None => (None, None),
    };

    // Prepare organization instance using the information collected
    let headquarters_address = cb_org.cards.headquarters_address.as_ref();
    Ok(Organization {
        generated_at: now,

        acquisitions,
        categories,
        city: get_location_value(headquarters_address, "city"),
        company_type: cb_org.properties.company_type,
        country: get_location_value(headquarters_address, "country"),
        description: cb_org.properties.short_description,
        funding: cb_org.properties.funding_total.as_ref().and_then(|f| f.value_usd),
        funding_rounds,
        homepage_url: cb_org.properties.website.and_then(|v| v.value),
        kind: cb_org.properties.funding_total.map(|_| "funding".to_string()),
        linkedin_url: cb_org.properties.linkedin.and_then(|v| v.value),
        name: cb_org.properties.name,
        num_employees_max,
        num_employees_min,
        region: get_location_value(headquarters_address, "region"),
        stock_exchange: cb_org.properties.stock_exchange_symbol,
        ticker: cb_org.properties.stock_symbol.and_then(|v| v.value),
        twitter_url: cb_org.properties.twitter.and_then(|v| v.value),
    })
}

/// Type alias to represent a CB trait object.
type DynCB = Arc<dyn CB + Send + Sync>;

/// Trait that defines some operations a CB implementation must support.
#[cfg_attr(test, automock)]
#[async_trait]
trait CB {
    /// Get organization information.
    async fn get_organization(&self, permalink: &str) -> Result<CBOrganizationEntity>;
}

/// CB implementation backed by the Crunchbase API.
struct CBApi {
    /// Crunchbase API base url.
    api_url: String,
    /// HTTP client ready to make requests to the Crunchbase API.
    http_client: ClientWithMiddleware,
}

impl CBApi {
    /// Create a new CBApi instance.
    fn new(key: &str, api_url: &str) -> Result<Self> {
        // Prepare the api key header, keeping the key out of logs
        let mut key_header = HeaderValue::from_str(key).context("invalid CRUNCHBASE_API_KEY value")?;
        key_header.set_sensitive(true);

        // Setup HTTP client ready to make requests to the Crunchbase API
        let mut headers = HeaderMap::new();
        headers.insert(HeaderName::from_static("x-cb-user-key"), key_header);
        let http_client = with_retries(new_http_client(headers)?, CRUNCHBASE_MAX_RETRIES);

        Ok(Self {
            api_url: api_url.to_string(),
            http_client,
        })
    }
}

#[async_trait]
impl CB for CBApi {
    /// [`CB::get_organization`].
    #[instrument(skip(self), err)]
    async fn get_organization(&self, permalink: &str) -> Result<CBOrganizationEntity> {
        // Prepare the request url with the cards and fields needed
        let cards = &[
            "acquiree_acquisitions",
            "headquarters_address",
            "raised_funding_rounds",
        ]
        .join(",");
        let fields = &[
            "categories",
            "company_type",
            "funding_total",
            "linkedin",
            "name",
            "num_employees_enum",
            "short_description",
            "stock_exchange_symbol",
            "stock_symbol",
            "twitter",
            "website",
        ]
        .join(",");
        let url = format!(
            "{}/entities/organizations/{permalink}?card_ids={cards}&field_ids={fields}",
            self.api_url
        );

        // Request the organization, failing on non-OK statuses
        let response = self.http_client.get(url).send().await?;
        if response.status() != StatusCode::OK {
            bail!("unexpected status code: {}", response.status());
        }

        // Decode the organization entity
        let org_entity: CBOrganizationEntity = response.json().await?;
        Ok(org_entity)
    }
}

/// Identifier of an acquired organization.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBAcquireeIdentifier {
    /// Acquired organization permalink.
    permalink: Option<String>,
    /// Acquired organization name.
    value: Option<String>,
}

/// Acquisition made by an organization.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBAcquisition {
    /// Acquired organization.
    acquiree_identifier: Option<CBAcquireeIdentifier>,
    /// Date the acquisition was announced on.
    announced_on: Option<CBAcquisitionAnnouncedOn>,
    /// Acquisition price.
    price: Option<CBAcquisitionPrice>,
}

/// Date an acquisition was announced on.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBAcquisitionAnnouncedOn {
    /// Announcement date.
    value: Option<NaiveDate>,
}

/// Price of an acquisition.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBAcquisitionPrice {
    /// Price in USD.
    value_usd: Option<u64>,
}

/// Address of an organization.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBAddress {
    /// Locations (city, region, country...) of the address.
    location_identifiers: Option<Vec<CBLocationIdentifier>>,
}

/// Cards (related entities) of an organization.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBCards {
    /// Acquisitions made by the organization.
    acquiree_acquisitions: Option<Vec<CBAcquisition>>,
    /// Headquarters addresses (the first one is used).
    headquarters_address: Option<Vec<CBAddress>>,
    /// Funding rounds raised by the organization.
    raised_funding_rounds: Option<Vec<CBFundingRound>>,
}

/// Identifier of an entity (i.e. a category).
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBEntityIdentifier {
    /// Entity name.
    value: Option<String>,
}

/// Funding round raised by an organization.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBFundingRound {
    /// Date the funding round was announced on.
    announced_on: Option<NaiveDate>,
    /// Investment type (i.e. `series_a`).
    investment_type: Option<String>,
    /// Money raised.
    money_raised: Option<CBMoneyRaised>,
}

/// Total funding amount.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBFundingTotal {
    /// Amount in USD.
    value_usd: Option<i64>,
}

/// Location of an address.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBLocationIdentifier {
    /// Location type (i.e. `city`, `region` or `country`).
    location_type: Option<String>,
    /// Location name.
    value: Option<String>,
}

/// Money raised in a funding round.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBMoneyRaised {
    /// Amount in USD.
    value_usd: Option<u64>,
}

/// Organization fields returned by the Crunchbase API.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBOrganization {
    /// Industry categories.
    categories: Option<Vec<CBEntityIdentifier>>,
    /// Company type (i.e. `for_profit`).
    company_type: Option<String>,
    /// Total funding amount.
    funding_total: Option<CBFundingTotal>,
    /// LinkedIn profile url.
    linkedin: Option<CBValue>,
    /// Organization name.
    name: Option<String>,
    /// Number of employees range (i.e. `c_00011_00050`).
    num_employees_enum: Option<String>,
    /// Short description.
    short_description: Option<String>,
    /// Stock exchange where the organization is listed.
    stock_exchange_symbol: Option<String>,
    /// Stock ticker symbol.
    stock_symbol: Option<CBValue>,
    /// Twitter profile url.
    twitter: Option<CBValue>,
    /// Website url.
    website: Option<CBValue>,
}

/// Organization entity returned by the Crunchbase API.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBOrganizationEntity {
    /// Cards (related entities) requested.
    cards: CBCards,
    /// Fields requested.
    properties: CBOrganization,
}

/// Wrapper of a single value.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
struct CBValue {
    /// Value.
    value: Option<String>,
}

/// Return the location value for the location type provided if available,
/// using the first headquarters address.
fn get_location_value(headquarters_address: Option<&Vec<CBAddress>>, location_type: &str) -> Option<String> {
    headquarters_address
        .and_then(|addresses| addresses.first())
        .and_then(|address| address.location_identifiers.as_ref())
        .and_then(|identifiers| {
            identifiers.iter().find(|i| i.location_type.as_deref() == Some(location_type))
        })
        .and_then(|i| i.value.clone())
}

/// Extract the organization permalink from the crunchbase url provided.
fn get_permalink(cb_url: &str) -> Result<&str> {
    crunchbase_permalink(cb_url).ok_or_else(|| format_err!("invalid crunchbase url"))
}

/// Create a new Acquisition instance from the Crunchbase data provided.
fn new_acquisition_from(cba: CBAcquisition) -> Acquisition {
    Acquisition {
        acquiree_cb_permalink: cba.acquiree_identifier.as_ref().and_then(|i| i.permalink.clone()),
        acquiree_name: cba.acquiree_identifier.and_then(|i| i.value),
        announced_on: cba.announced_on.and_then(|a| a.value),
        price: cba.price.and_then(|p| p.value_usd),
    }
}

/// Create a new FundingRound instance from the Crunchbase data provided.
fn new_funding_round_from(cbfr: CBFundingRound) -> FundingRound {
    FundingRound {
        amount: cbfr.money_raised.and_then(|p| p.value_usd),
        announced_on: cbfr.announced_on,
        kind: cbfr.investment_type,
    }
}

#[cfg(test)]
mod tests;

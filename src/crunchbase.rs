//! This module defines some types used to represent the information collected
//! from Crunchbase for each of the landscape items (when applicable), as well
//! as the functionality used to collect that information.

use anyhow::{format_err, Result};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use lazy_static::lazy_static;
#[cfg(test)]
use mockall::automock;
use regex::Regex;
use reqwest::{header, StatusCode};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::instrument;

/// Organization information collected from Crunchbase.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Organization {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub city: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub company_type: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub country: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub funding: Option<i64>,

    /// Represents the moment at which this instance was generated
    pub generated_at: DateTime<Utc>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub homepage_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub linkedin_url: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_employees_max: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_employees_min: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub region: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub stock_exchange: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub ticker: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub twitter_url: Option<String>,
}

impl Organization {
    /// Create a new Organization instance from information obtained from the
    /// Crunchbase API.
    pub(crate) async fn new(cb: DynCB, cb_url: &str) -> Result<Self> {
        // Collec some information from Crunchbase
        let permalink = get_permalink(cb_url)?;
        let cb_org = cb.get_organization(&permalink).await?;

        // Prepare organization instance using the information collected
        let (num_employees_max, num_employees_min) = match cb_org.properties.num_employees_enum {
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
        Ok(Organization {
            generated_at: Utc::now(),
            city: get_location_value(&cb_org.cards.headquarters_address, "city"),
            company_type: cb_org.properties.company_type,
            country: get_location_value(&cb_org.cards.headquarters_address, "country"),
            description: cb_org.properties.short_description,
            funding: cb_org.properties.funding_total.and_then(|f| f.value_usd),
            homepage_url: cb_org.properties.website.and_then(|v| v.value),
            categories: cb_org.properties.categories.and_then(|c| c.into_iter().map(|c| c.value).collect()),
            kind: None,
            linkedin_url: cb_org.properties.linkedin.and_then(|v| v.value),
            name: cb_org.properties.name,
            num_employees_max,
            num_employees_min,
            region: get_location_value(&cb_org.cards.headquarters_address, "region"),
            stock_exchange: cb_org.properties.stock_exchange_symbol,
            ticker: cb_org.properties.stock_symbol.and_then(|v| v.value),
            twitter_url: cb_org.properties.twitter.and_then(|v| v.value),
        })
    }
}

/// Crunchbase API base url.
const CRUNCHBASE_API_URL: &str = "https://api.crunchbase.com/api/v4";

/// Type alias to represent a CB trait object.
pub(crate) type DynCB = Arc<dyn CB + Send + Sync>;

/// Trait that defines some operations a CB implementation must support.
#[async_trait]
#[cfg_attr(test, automock)]
pub(crate) trait CB {
    /// Get organization information.
    async fn get_organization(&self, permalink: &str) -> Result<CBOrganizationEntity>;
}

/// CB implementation backed by the Crunchbase API.
pub struct CBApi {
    http_client: reqwest::Client,
}

impl CBApi {
    /// Create a new CBApi instance.
    pub fn new(key: &str) -> Result<Self> {
        // Setup HTTP client ready to make requests to the Crunchbase API
        let user_agent = format!("{}/{}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"));
        let mut headers = header::HeaderMap::new();
        headers.insert("X-cb-user-key", header::HeaderValue::from_str(key).unwrap());
        let http_client =
            reqwest::Client::builder().user_agent(user_agent).default_headers(headers).build()?;

        Ok(Self { http_client })
    }
}

#[async_trait]
impl CB for CBApi {
    /// [CB::get_organization]
    #[instrument(fields(?permalink), skip_all, err)]
    async fn get_organization(&self, permalink: &str) -> Result<CBOrganizationEntity> {
        let cards = &["headquarters_address"].join(",");
        let fields = &[
            "num_employees_enum",
            "linkedin",
            "twitter",
            "name",
            "website",
            "short_description",
            "funding_total",
            "stock_symbol",
            "stock_exchange_symbol",
            "categories",
            "company_type",
        ]
        .join(",");
        let url = format!(
            "{CRUNCHBASE_API_URL}/entities/organizations/{permalink}?card_ids={cards}&field_ids={fields}"
        );
        let response = self.http_client.get(url).send().await?;
        if response.status() != StatusCode::OK {
            return Err(format_err!("unexpected status code: {:?}", response.status()));
        }
        let org_entity: CBOrganizationEntity = response.json().await?;
        Ok(org_entity)
    }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct CBOrganizationEntity {
    properties: CBOrganization,
    cards: CBCards,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct CBOrganization {
    categories: Option<Vec<CBEntityIdentifier>>,
    company_type: Option<String>,
    funding_total: Option<CBFundingTotal>,
    linkedin: Option<CBValue>,
    name: Option<String>,
    num_employees_enum: Option<String>,
    short_description: Option<String>,
    stock_exchange_symbol: Option<String>,
    stock_symbol: Option<CBValue>,
    twitter: Option<CBValue>,
    website: Option<CBValue>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct CBEntityIdentifier {
    value: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct CBFundingTotal {
    value_usd: Option<i64>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct CBValue {
    value: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct CBCards {
    headquarters_address: Option<Vec<CBAddress>>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct CBAddress {
    location_identifiers: Option<Vec<CBLocationIdentifier>>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct CBLocationIdentifier {
    location_type: Option<String>,
    value: Option<String>,
}

/// Return the location value for the location type provided if available.
fn get_location_value(headquarters_address: &Option<Vec<CBAddress>>, location_type: &str) -> Option<String> {
    headquarters_address
        .as_ref()
        .and_then(|addresses| addresses.iter().next())
        .and_then(|address| address.location_identifiers.as_ref())
        .and_then(|identifiers| {
            identifiers
                .iter()
                .find(|i| i.location_type.as_deref().unwrap_or("") == location_type)
                .map(|i| i.value.clone().unwrap_or_default())
        })
}

lazy_static! {
    static ref CRUNCHBASE_URL: Regex =
        Regex::new("^https://www.crunchbase.com/organization/(?P<permalink>[^/]+)/?$")
            .expect("exprs in CRUNCHBASE_URL to be valid");
}

/// Extract the organization permalink from the crunchbase url provided.
fn get_permalink(cb_url: &str) -> Result<String> {
    let c = CRUNCHBASE_URL.captures(cb_url).ok_or_else(|| format_err!("invalid crunchbase url"))?;
    Ok(c["permalink"].to_string())
}

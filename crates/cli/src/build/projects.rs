//! This module defines the functionality to generate the `projects.md` and
//! `projects.csv` files from the information available in the landscape.

use std::fs::File;

use anyhow::Result;
use askama::Template;
use chrono::NaiveDate;
use landscape2_core::data::{DATE_FORMAT, LandscapeData};
use serde::{Deserialize, Serialize};

/// Project information used to generate the projects.md and projects.csv files.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub(crate) struct Project {
    pub accepted_at: String,
    pub archived_at: String,
    pub graduated_at: String,
    pub homepage_url: String,
    pub incubating_at: String,
    pub last_security_audit: String,
    pub maturity: String,
    pub name: String,
    pub num_security_audits: String,
    pub sandbox_at: String,
    pub tag: String,
}

/// Collect projects from the landscape data.
pub(crate) fn collect_projects(landscape_data: &LandscapeData) -> Vec<Project> {
    // Helper closure to format dates
    let fmt_date = |date: &Option<NaiveDate>| {
        let Some(date) = date else {
            return String::new();
        };
        date.format(DATE_FORMAT).to_string()
    };

    let mut projects: Vec<Project> = landscape_data
        .items
        .iter()
        .cloned()
        .filter_map(|item| {
            // Prepare maturity (projects must have it)
            let maturity = item.maturity?;

            // Prepare sandbox date
            let sandbox_at = if item.accepted_at == item.incubating_at {
                None
            } else {
                item.accepted_at
            };

            // Prepare security audits info
            let last_security_audit = item.audits.as_ref().and_then(|a| a.last().map(|a| a.date));
            let num_security_audits = item.audits.as_ref().map(Vec::len);

            // Create project instance and return it
            let project = Project {
                accepted_at: fmt_date(&item.accepted_at),
                archived_at: fmt_date(&item.archived_at),
                graduated_at: fmt_date(&item.graduated_at),
                homepage_url: item.homepage_url,
                incubating_at: fmt_date(&item.incubating_at),
                maturity: maturity.to_string(),
                name: item.name.to_lowercase(),
                num_security_audits: num_security_audits.unwrap_or_default().to_string(),
                last_security_audit: fmt_date(&last_security_audit),
                sandbox_at: fmt_date(&sandbox_at),
                tag: item.tag.unwrap_or_default().join(","),
            };
            Some(project)
        })
        .collect();

    // Sort projects
    projects.sort_by(|a, b| a.name.cmp(&b.name));

    projects
}

/// Template for the projects.md file.
#[derive(Debug, Clone, Template)]
#[template(path = "projects.md")]
pub(crate) struct ProjectsMd<'a> {
    pub projects: &'a [Project],
}

/// Generate CSV file with some information about each project.
pub(crate) fn generate_projects_csv(mut w: csv::Writer<File>, projects: &[Project]) -> Result<()> {
    // Write headers
    w.write_record([
        "project_name",
        "maturity",
        "tag",
        "accepted_date",
        "sandbox_date",
        "incubating_date",
        "graduated_date",
        "archived_date",
        "num_security_audits",
        "last_security_audit_date",
    ])?;

    // Write one record for each project
    for p in projects {
        w.write_record([
            &p.name,
            &p.maturity,
            &p.tag,
            &p.accepted_at,
            &p.sandbox_at,
            &p.incubating_at,
            &p.graduated_at,
            &p.archived_at,
            &p.num_security_audits,
            &p.last_security_audit,
        ])?;
    }

    w.flush()?;
    Ok(())
}

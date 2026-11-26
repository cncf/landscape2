//! This module defines the functionality to generate the `projects.md` and
//! `projects.csv` files from the information available in the landscape.
//!
//! Both files are public outputs documented in `docs/api.md`. New CSV columns
//! are appended at the end, so positional consumers keep working.

use std::io;

use anyhow::Result;
use askama::Template;
use chrono::NaiveDate;
use landscape2_core::data::{DATE_FORMAT, LandscapeData};

/// Project information used to generate the projects.md and projects.csv files.
///
/// Dates are formatted using `DATE_FORMAT`, and are empty when not set.
#[derive(Debug, Default, PartialEq)]
pub(crate) struct Project {
    /// Date at which the project was accepted in the foundation.
    pub accepted_at: String,
    /// Date at which the project was archived.
    pub archived_at: String,
    /// Date at which the project moved to graduated.
    pub graduated_at: String,
    /// Homepage url.
    pub homepage_url: String,
    /// Item identifier.
    pub id: String,
    /// Date at which the project moved to incubating.
    pub incubating_at: String,
    /// Date of the latest security audit (by date, not by list position).
    pub last_security_audit: String,
    /// Maturity of the project (e.g. `graduated`).
    pub maturity: String,
    /// Name of the project, lowercased.
    pub name: String,
    /// Number of security audits the project has undergone.
    pub num_security_audits: String,
    /// Date at which the project joined the sandbox level, empty when it was
    /// accepted directly at the incubating level.
    pub sandbox_at: String,
    /// Technical Advisory Groups (TAG) the project is associated to, joined
    /// with commas.
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
        .filter_map(|item| {
            // Prepare maturity (projects must have it)
            let maturity = item.maturity.clone()?;

            // Prepare sandbox date
            let sandbox_at = if item.accepted_at == item.incubating_at {
                None
            } else {
                item.accepted_at
            };

            // Prepare security audits info (the last audit is the latest by date)
            let last_security_audit =
                item.audits.as_ref().and_then(|a| a.iter().max_by_key(|a| a.date).map(|a| a.date));
            let num_security_audits = item.audits.as_ref().map(Vec::len);

            // Create project instance and return it
            let project = Project {
                accepted_at: fmt_date(&item.accepted_at),
                archived_at: fmt_date(&item.archived_at),
                graduated_at: fmt_date(&item.graduated_at),
                homepage_url: item.homepage_url.clone(),
                id: item.id.clone(),
                incubating_at: fmt_date(&item.incubating_at),
                last_security_audit: fmt_date(&last_security_audit),
                maturity,
                name: item.name.to_lowercase(),
                num_security_audits: num_security_audits.unwrap_or_default().to_string(),
                sandbox_at: fmt_date(&sandbox_at),
                tag: item.tag.as_deref().unwrap_or_default().join(","),
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
    /// Projects listed in the table, in order.
    pub projects: &'a [Project],
}

/// Generate CSV file with some information about each project.
pub(crate) fn generate_projects_csv<W: io::Write>(mut w: csv::Writer<W>, projects: &[Project]) -> Result<()> {
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
        "id",
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
            &p.id,
        ])?;
    }

    w.flush()?;
    Ok(())
}

/// Askama filters used by the projects.md template.
#[allow(clippy::inline_always, clippy::unnecessary_wraps, clippy::unused_self)]
mod filters {
    use std::fmt::Display;

    /// Filter to escape the markdown characters that would break a table cell
    /// or a link text (`\`, `|`, `[` and `]`).
    #[askama::filter_fn]
    pub(crate) fn md_text(value: impl Display, _: &dyn askama::Values) -> askama::Result<String> {
        let value = value.to_string();
        let mut escaped = String::with_capacity(value.len());
        for c in value.chars() {
            if matches!(c, '\\' | '|' | '[' | ']') {
                escaped.push('\\');
            }
            escaped.push(c);
        }
        Ok(escaped)
    }

    /// Filter to percent-encode the characters that would break a markdown
    /// link destination or a table cell (space, `(`, `)` and `|`).
    #[askama::filter_fn]
    pub(crate) fn md_url(value: impl Display, _: &dyn askama::Values) -> askama::Result<String> {
        let value = value.to_string();
        let mut encoded = String::with_capacity(value.len());
        for c in value.chars() {
            match c {
                ' ' => encoded.push_str("%20"),
                '(' => encoded.push_str("%28"),
                ')' => encoded.push_str("%29"),
                '|' => encoded.push_str("%7C"),
                _ => encoded.push(c),
            }
        }
        Ok(encoded)
    }
}

#[cfg(test)]
mod tests;

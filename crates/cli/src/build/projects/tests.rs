use askama::Template;
use chrono::NaiveDate;
use landscape2_core::data::{Item, ItemAudit};
use pretty_assertions::assert_eq;

use super::*;

/// Header row of the projects.csv file.
const CSV_HEADER: &str = "project_name,maturity,tag,accepted_date,sandbox_date,incubating_date,graduated_date,archived_date,num_security_audits,last_security_audit_date,id";

/// Markdown table header and alignment rows of the projects.md file.
const TABLE_HEADER: &str = "\
| **project_name** | **maturity** | **tag** | **accepted_date** | **sandbox_date** | **incubating_date** | **graduated_date** | **archived_date** | **num_security_audits** | **last_security_audit_date** |
| :--------------- | :----------: | :-----: | :---------------: | :--------------: | :-----------------: | :----------------: | :---------------: | :---------------------: | :--------------------------: |";

#[test]
fn test_collect_projects_last_audit_is_latest_date() {
    // Setup a project whose audits are not sorted by date
    let landscape_data = LandscapeData {
        items: vec![Item {
            audits: Some(vec![audit(2021, 5, 1), audit(2023, 6, 1), audit(2022, 1, 1)]),
            ..project_item("Project", "sandbox")
        }],
        ..Default::default()
    };

    // Run the projects collection
    let projects = collect_projects(&landscape_data);

    // Check the last audit is the one with the latest date
    assert_eq!(projects.len(), 1);
    assert_eq!(projects[0].last_security_audit, "2023-06-01");
    assert_eq!(projects[0].num_security_audits, "3");
}

#[test]
fn test_collect_projects_sandbox_empty_when_accepted_equals_incubating() {
    // Setup a project accepted directly at the incubating level
    let landscape_data = LandscapeData {
        items: vec![Item {
            accepted_at: Some(date(2020, 1, 1)),
            incubating_at: Some(date(2020, 1, 1)),
            ..project_item("Project", "incubating")
        }],
        ..Default::default()
    };

    // Run the projects collection
    let projects = collect_projects(&landscape_data);

    // Check the project has no sandbox date
    assert_eq!(projects.len(), 1);
    assert_eq!(projects[0].accepted_at, "2020-01-01");
    assert_eq!(projects[0].incubating_at, "2020-01-01");
    assert_eq!(projects[0].sandbox_at, "");
}

#[test]
fn test_collect_projects_skips_non_projects() {
    // Setup a landscape with a project and an item without maturity
    let landscape_data = LandscapeData {
        items: vec![
            Item {
                maturity: None,
                ..project_item("Member", "sandbox")
            },
            Item {
                accepted_at: Some(date(2020, 1, 1)),
                archived_at: Some(date(2024, 1, 1)),
                graduated_at: Some(date(2023, 1, 1)),
                incubating_at: Some(date(2022, 1, 1)),
                tag: Some(vec!["app-delivery".to_string(), "security".to_string()]),
                ..project_item("Project", "graduated")
            },
        ],
        ..Default::default()
    };

    // Run the projects collection
    let projects = collect_projects(&landscape_data);

    // Check only the project is collected
    assert_eq!(
        projects,
        vec![Project {
            accepted_at: "2020-01-01".to_string(),
            archived_at: "2024-01-01".to_string(),
            graduated_at: "2023-01-01".to_string(),
            homepage_url: "https://project.example".to_string(),
            id: "category--subcategory--project".to_string(),
            incubating_at: "2022-01-01".to_string(),
            last_security_audit: String::new(),
            maturity: "graduated".to_string(),
            name: "project".to_string(),
            num_security_audits: "0".to_string(),
            sandbox_at: "2020-01-01".to_string(),
            tag: "app-delivery,security".to_string(),
        }]
    );
}

#[test]
fn test_projects_md_escapes_markdown_special_characters() {
    // Setup a project whose name and url contain markdown special characters
    let projects = [Project {
        homepage_url: "https://example.com/a (b)|c".to_string(),
        maturity: "sandbox".to_string(),
        name: r"a|b [c] \d".to_string(),
        ..Default::default()
    }];

    // Run the template rendering
    let md = ProjectsMd { projects: &projects }.render().unwrap();

    // Check the name and url are escaped in the project row
    assert_eq!(
        md.lines().nth(4),
        Some(r"| [a\|b \[c\] \\d](https://example.com/a%20%28b%29%7Cc) | sandbox |  |  |  |  |  |  |  |  |")
    );
}

#[test]
fn test_projects_md_renders_header_only_without_projects() {
    let md = ProjectsMd { projects: &[] }.render().unwrap();

    assert_eq!(md.trim_end(), format!("## Projects\n\n{TABLE_HEADER}"));
}

#[test]
fn test_projects_md_renders_tag_column() {
    // Setup a project with every column set
    let projects = [Project {
        accepted_at: "2020-01-01".to_string(),
        archived_at: "2024-01-01".to_string(),
        graduated_at: "2023-01-01".to_string(),
        homepage_url: "https://project.example".to_string(),
        id: "category--subcategory--project".to_string(),
        incubating_at: "2022-01-01".to_string(),
        last_security_audit: "2023-06-01".to_string(),
        maturity: "graduated".to_string(),
        name: "project".to_string(),
        num_security_audits: "2".to_string(),
        sandbox_at: "2020-01-01".to_string(),
        tag: "app-delivery,security".to_string(),
    }];

    // Run the template rendering
    let md = ProjectsMd { projects: &projects }.render().unwrap();

    // Check the tag column follows the maturity one in the header and the row
    assert_eq!(
        md.trim_end(),
        format!(
            "## Projects\n\n{TABLE_HEADER}\n| [project](https://project.example) | graduated | app-delivery,security | 2020-01-01 | 2020-01-01 | 2022-01-01 | 2023-01-01 | 2024-01-01 | 2 | 2023-06-01 |"
        )
    );
}

#[test]
fn test_projects_md_renders_zero_and_two_projects() {
    // Setup two projects, one of them with a pipe in its name
    let projects = two_projects();

    // Run the template rendering with no projects and with both projects
    let md_zero = ProjectsMd { projects: &[] }.render().unwrap();
    let md_two = ProjectsMd { projects: &projects }.render().unwrap();

    // Check no project rows are rendered without projects
    assert_eq!(md_zero.trim_end(), format!("## Projects\n\n{TABLE_HEADER}"));

    // Check a row is rendered for each project, escaping the pipe
    assert_eq!(
        md_two.trim_end(),
        format!(
            "## Projects\n\n{TABLE_HEADER}\n\
             | [alpha](https://alpha.example) | graduated | security | 2019-01-01 | 2019-01-01 | 2020-01-01 | 2021-01-01 |  | 2 | 2022-02-02 |\n\
             | [beta\\|gamma](https://beta.example) | sandbox |  | 2023-01-01 | 2023-01-01 |  |  |  | 0 |  |"
        )
    );
}

#[test]
fn test_generate_projects_csv_writes_header_and_rows() {
    // Setup two projects, one of them with a pipe in its name
    let projects = two_projects();

    // Run the CSV generation
    let mut csv = vec![];
    generate_projects_csv(csv::Writer::from_writer(&mut csv), &projects).unwrap();

    // Check the header and a record for each project are written
    assert_eq!(
        String::from_utf8(csv).unwrap(),
        format!(
            "{CSV_HEADER}\n\
             alpha,graduated,security,2019-01-01,2019-01-01,2020-01-01,2021-01-01,,2,2022-02-02,category--subcategory--alpha\n\
             beta|gamma,sandbox,,2023-01-01,2023-01-01,,,,0,,category--subcategory--beta-gamma\n"
        )
    );
}

#[test]
fn test_projects_csv_header_ends_with_id() {
    // Run the CSV generation without projects
    let mut csv = vec![];
    generate_projects_csv(csv::Writer::from_writer(&mut csv), &[]).unwrap();

    // Check the header is written in order, with the id column last
    let csv = String::from_utf8(csv).unwrap();
    assert_eq!(csv, format!("{CSV_HEADER}\n"));
    assert!(CSV_HEADER.ends_with(",last_security_audit_date,id"));
}

// Helpers.

/// Returns a security audit done on the date provided.
fn audit(year: i32, month: u32, day: u32) -> ItemAudit {
    ItemAudit {
        date: date(year, month, day),
        kind: "security".to_string(),
        url: format!("https://audits.example/{year}-{month:02}-{day:02}.pdf"),
        vendor: "Vendor".to_string(),
    }
}

/// Returns the date provided, panicking when it is not valid.
fn date(year: i32, month: u32, day: u32) -> NaiveDate {
    NaiveDate::from_ymd_opt(year, month, day).unwrap()
}

/// Returns a project item with the name and maturity provided, and the
/// remaining required fields derived from its name.
fn project_item(name: &str, maturity: &str) -> Item {
    let normalized_name = name.to_lowercase();
    Item {
        category: "Category".to_string(),
        homepage_url: format!("https://{normalized_name}.example"),
        id: format!("category--subcategory--{normalized_name}"),
        logo: format!("logos/{normalized_name}.svg"),
        name: name.to_string(),
        subcategory: "Subcategory".to_string(),
        website: format!("https://{normalized_name}.example"),

        maturity: Some(maturity.to_string()),
        ..Default::default()
    }
}

/// Returns two projects, sorted by name: a graduated one with every date set
/// and a sandbox one whose name contains a pipe.
fn two_projects() -> Vec<Project> {
    vec![
        Project {
            accepted_at: "2019-01-01".to_string(),
            archived_at: String::new(),
            graduated_at: "2021-01-01".to_string(),
            homepage_url: "https://alpha.example".to_string(),
            id: "category--subcategory--alpha".to_string(),
            incubating_at: "2020-01-01".to_string(),
            last_security_audit: "2022-02-02".to_string(),
            maturity: "graduated".to_string(),
            name: "alpha".to_string(),
            num_security_audits: "2".to_string(),
            sandbox_at: "2019-01-01".to_string(),
            tag: "security".to_string(),
        },
        Project {
            accepted_at: "2023-01-01".to_string(),
            archived_at: String::new(),
            graduated_at: String::new(),
            homepage_url: "https://beta.example".to_string(),
            id: "category--subcategory--beta-gamma".to_string(),
            incubating_at: String::new(),
            last_security_audit: String::new(),
            maturity: "sandbox".to_string(),
            name: "beta|gamma".to_string(),
            num_security_audits: "0".to_string(),
            sandbox_at: "2023-01-01".to_string(),
            tag: String::new(),
        },
    ]
}

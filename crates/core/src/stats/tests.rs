use std::collections::BTreeMap;

use chrono::{NaiveDate, TimeZone};

use crate::data::{
    Acquisition, Contributors, FundingRound, Item, ItemAudit, Organization, Repository, RepositoryGithubData,
};

use super::*;

#[test]
fn test_stats_new_sets_generated_at_and_composes_sections() {
    // Setup a member and a project with Crunchbase and GitHub data
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![
            Item {
                category: "Members".to_string(),
                name: "Member".to_string(),
                subcategory: "Gold".to_string(),
                joined_at: NaiveDate::from_ymd_opt(2024, 4, 2),
                ..Default::default()
            },
            Item {
                category: "Category".to_string(),
                homepage_url: "https://project.url".to_string(),
                name: "Project".to_string(),
                subcategory: "Subcategory".to_string(),
                accepted_at: NaiveDate::from_ymd_opt(2024, 5, 1),
                crunchbase_data: Some(Organization {
                    funding_rounds: Some(vec![FundingRound {
                        amount: Some(100),
                        announced_on: NaiveDate::from_ymd_opt(2025, 3, 1),
                        ..Default::default()
                    }]),
                    ..Default::default()
                }),
                crunchbase_url: Some("https://crunchbase.com/project".to_string()),
                maturity: Some("sandbox".to_string()),
                ..repository_item("https://repository.url", vec![1, 2, 3])
            },
        ],
    };
    let settings = LandscapeSettings {
        members_category: Some("Members".to_string()),
        ..Default::default()
    };

    // Run the stats generation
    let stats = Stats::new(&landscape_data, &settings, reference_time());

    // Check the reference time is recorded and every section is composed
    assert_eq!(stats.generated_at, reference_time());
    assert!(stats.members.is_some());
    assert_eq!(stats.members, MembersStats::new(&landscape_data, &settings));
    assert!(stats.organizations.is_some());
    assert_eq!(
        stats.organizations,
        OrganizationsStats::new(&landscape_data, reference_time())
    );
    assert!(stats.projects.is_some());
    assert_eq!(stats.projects, ProjectsStats::new(&landscape_data));
    assert!(stats.repositories.is_some());
    assert_eq!(stats.repositories, RepositoriesStats::new(&landscape_data));
}

#[test]
fn test_members_stats_new_counts_members_per_month_and_subcategory() {
    // Setup two members of the same subcategory joined in different months
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![
            Item {
                category: "Members".to_string(),
                name: "Member 1".to_string(),
                subcategory: "Subcategory".to_string(),
                joined_at: NaiveDate::from_ymd_opt(2024, 4, 2),
                ..Default::default()
            },
            Item {
                category: "Members".to_string(),
                name: "Member 2".to_string(),
                subcategory: "Subcategory".to_string(),
                joined_at: NaiveDate::from_ymd_opt(2024, 5, 2),
                ..Default::default()
            },
        ],
    };

    // Setup settings pointing to the members category
    let settings = LandscapeSettings {
        members_category: Some("Members".to_string()),
        ..Default::default()
    };

    // Run the members stats aggregation
    let members_stats = MembersStats::new(&landscape_data, &settings);

    // Check the monthly counts, running totals and subcategory counts
    let expected_members_stats = Some(MembersStats {
        members: 2,
        joined_at: vec![("2024-04".to_string(), 1), ("2024-05".to_string(), 1)].into_iter().collect(),
        joined_at_rt: vec![("2024-04".to_string(), 1), ("2024-05".to_string(), 2)].into_iter().collect(),
        subcategories: vec![("Subcategory".to_string(), 2)].into_iter().collect(),
    });
    pretty_assertions::assert_eq!(members_stats, expected_members_stats);
}

#[test]
fn test_members_stats_new_returns_none_without_matching_items() {
    // Setup an item outside the members category
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![Item {
            category: "Category".to_string(),
            name: "Item".to_string(),
            subcategory: "Subcategory".to_string(),
            joined_at: NaiveDate::from_ymd_opt(2024, 4, 2),
            ..Default::default()
        }],
    };
    let settings = LandscapeSettings {
        members_category: Some("Members".to_string()),
        ..Default::default()
    };

    // Run the members stats aggregation and check no stats are returned
    assert_eq!(MembersStats::new(&landscape_data, &settings), None);
}

#[test]
fn test_members_stats_new_returns_none_without_members_category() {
    // Setup a member item and settings without a members category
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![Item {
            category: "Members".to_string(),
            name: "Member".to_string(),
            subcategory: "Subcategory".to_string(),
            joined_at: NaiveDate::from_ymd_opt(2024, 4, 2),
            ..Default::default()
        }],
    };
    let settings = LandscapeSettings::default();

    // Run the members stats aggregation and check no stats are returned
    assert_eq!(MembersStats::new(&landscape_data, &settings), None);
}

#[test]
fn test_organizations_stats_new_aggregates_acquisitions_and_funding_rounds() {
    // Setup organizations with acquisitions and funding rounds, including a
    // duplicated crunchbase URL and a funding round out of the time window
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![
            Item {
                name: "Organization 1".to_string(),
                crunchbase_data: Some(Organization {
                    acquisitions: Some(vec![
                        Acquisition {
                            announced_on: NaiveDate::from_ymd_opt(2023, 5, 1),
                            price: Some(100),
                            ..Default::default()
                        },
                        Acquisition {
                            announced_on: NaiveDate::from_ymd_opt(2024, 5, 2),
                            price: Some(200),
                            ..Default::default()
                        },
                    ]),
                    funding_rounds: Some(vec![
                        FundingRound {
                            amount: Some(100),
                            announced_on: NaiveDate::from_ymd_opt(2023, 5, 1),
                            ..Default::default()
                        },
                        FundingRound {
                            amount: Some(200),
                            announced_on: NaiveDate::from_ymd_opt(2024, 5, 2),
                            ..Default::default()
                        },
                        FundingRound {
                            // This funding round will be ignored as it is out of the time window
                            amount: Some(1000),
                            announced_on: NaiveDate::from_ymd_opt(2016, 5, 1),
                            ..Default::default()
                        },
                    ]),
                    ..Default::default()
                }),
                crunchbase_url: Some("https://crunchbase.com/org1".to_string()),
                ..Default::default()
            },
            Item {
                name: "Organization 2".to_string(),
                crunchbase_data: Some(Organization {
                    acquisitions: Some(vec![Acquisition {
                        announced_on: NaiveDate::from_ymd_opt(2024, 5, 3),
                        price: Some(300),
                        ..Default::default()
                    }]),
                    funding_rounds: Some(vec![FundingRound {
                        amount: Some(300),
                        announced_on: NaiveDate::from_ymd_opt(2024, 5, 3),
                        ..Default::default()
                    }]),
                    ..Default::default()
                }),
                crunchbase_url: Some("https://crunchbase.com/org2".to_string()),
                ..Default::default()
            },
            Item {
                // This org will be ignored as it has the same crunchbase URL as the previous one
                name: "Organization 3".to_string(),
                crunchbase_data: Some(Organization {
                    acquisitions: Some(vec![Acquisition {
                        announced_on: NaiveDate::from_ymd_opt(2024, 5, 3),
                        price: Some(300),
                        ..Default::default()
                    }]),
                    ..Default::default()
                }),
                crunchbase_url: Some("https://crunchbase.com/org2".to_string()),
                ..Default::default()
            },
        ],
    };

    // Run the organizations stats aggregation
    let orgs_stats = OrganizationsStats::new(&landscape_data, reference_time());

    // Check the yearly acquisitions and funding rounds totals
    let expected_orgs_stats = Some(OrganizationsStats {
        acquisitions: vec![("2023".to_string(), 1), ("2024".to_string(), 2)].into_iter().collect(),
        acquisitions_price: vec![("2023".to_string(), 100), ("2024".to_string(), 500)].into_iter().collect(),
        funding_rounds: vec![("2023".to_string(), 1), ("2024".to_string(), 2)].into_iter().collect(),
        funding_rounds_money_raised: vec![("2023".to_string(), 100), ("2024".to_string(), 500)]
            .into_iter()
            .collect(),
    });
    assert_eq!(orgs_stats, expected_orgs_stats);
}

#[test]
fn test_organizations_stats_new_counts_funding_round_four_years_old() {
    // Setup an organization with a funding round four calendar years old
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![organization_item(
            vec![],
            vec![FundingRound {
                amount: Some(100),
                announced_on: NaiveDate::from_ymd_opt(2022, 1, 1),
                ..Default::default()
            }],
        )],
    };

    // Run the organizations stats aggregation
    let orgs_stats = OrganizationsStats::new(&landscape_data, reference_time());

    // Check the funding round is counted
    let expected_orgs_stats = Some(OrganizationsStats {
        funding_rounds: BTreeMap::from([("2022".to_string(), 1)]),
        funding_rounds_money_raised: BTreeMap::from([("2022".to_string(), 100)]),
        ..Default::default()
    });
    assert_eq!(orgs_stats, expected_orgs_stats);
}

#[test]
fn test_organizations_stats_new_counts_missing_amount_and_price_as_zero() {
    // Setup an organization with an acquisition and a funding round without amounts
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![organization_item(
            vec![Acquisition {
                announced_on: NaiveDate::from_ymd_opt(2025, 2, 1),
                price: None,
                ..Default::default()
            }],
            vec![FundingRound {
                amount: None,
                announced_on: NaiveDate::from_ymd_opt(2025, 3, 1),
                ..Default::default()
            }],
        )],
    };

    // Run the organizations stats aggregation
    let orgs_stats = OrganizationsStats::new(&landscape_data, reference_time());

    // Check both are counted with a zero amount
    let expected_orgs_stats = Some(OrganizationsStats {
        acquisitions: BTreeMap::from([("2025".to_string(), 1)]),
        acquisitions_price: BTreeMap::from([("2025".to_string(), 0)]),
        funding_rounds: BTreeMap::from([("2025".to_string(), 1)]),
        funding_rounds_money_raised: BTreeMap::from([("2025".to_string(), 0)]),
    });
    assert_eq!(orgs_stats, expected_orgs_stats);
}

#[test]
fn test_organizations_stats_new_skips_funding_round_five_years_old() {
    // Setup an organization with a funding round five calendar years old
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![organization_item(
            vec![],
            vec![FundingRound {
                amount: Some(100),
                announced_on: NaiveDate::from_ymd_opt(2021, 12, 31),
                ..Default::default()
            }],
        )],
    };

    // Run the organizations stats aggregation and check the round is skipped
    assert_eq!(OrganizationsStats::new(&landscape_data, reference_time()), None);
}

#[test]
fn test_organizations_stats_new_skips_rounds_without_announced_on() {
    // Setup an organization with an undated acquisition and funding round,
    // plus a dated funding round
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![organization_item(
            vec![Acquisition {
                announced_on: None,
                price: Some(100),
                ..Default::default()
            }],
            vec![
                FundingRound {
                    amount: Some(100),
                    announced_on: None,
                    ..Default::default()
                },
                FundingRound {
                    amount: Some(200),
                    announced_on: NaiveDate::from_ymd_opt(2025, 3, 1),
                    ..Default::default()
                },
            ],
        )],
    };

    // Run the organizations stats aggregation
    let orgs_stats = OrganizationsStats::new(&landscape_data, reference_time());

    // Check only the dated funding round is counted
    let expected_orgs_stats = Some(OrganizationsStats {
        funding_rounds: BTreeMap::from([("2025".to_string(), 1)]),
        funding_rounds_money_raised: BTreeMap::from([("2025".to_string(), 200)]),
        ..Default::default()
    });
    assert_eq!(orgs_stats, expected_orgs_stats);
}

#[test]
fn test_projects_stats_new_aggregates_maturity_and_audit_stats() {
    // Setup projects with maturity, audits and TAGs, including a duplicated
    // homepage URL and logo
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![
            Item {
                category: "Category 1".to_string(),
                homepage_url: "https://project1.com".to_string(),
                name: "Project 1".to_string(),
                subcategory: "Subcategory 1".to_string(),
                accepted_at: NaiveDate::from_ymd_opt(2024, 4, 2),
                audits: Some(vec![ItemAudit {
                    date: NaiveDate::from_ymd_opt(2024, 4, 2).unwrap(),
                    ..Default::default()
                }]),
                graduated_at: NaiveDate::from_ymd_opt(2024, 4, 20),
                incubating_at: NaiveDate::from_ymd_opt(2024, 4, 2),
                maturity: Some("graduated".to_string()),
                tag: Some(vec!["tag1".to_string()]),
                ..Default::default()
            },
            Item {
                category: "Category 1".to_string(),
                homepage_url: "https://project2.com".to_string(),
                name: "Project 2".to_string(),
                subcategory: "Subcategory 2".to_string(),
                accepted_at: NaiveDate::from_ymd_opt(2024, 5, 1),
                audits: Some(vec![ItemAudit {
                    date: NaiveDate::from_ymd_opt(2024, 5, 2).unwrap(),
                    ..Default::default()
                }]),
                incubating_at: NaiveDate::from_ymd_opt(2024, 5, 2),
                maturity: Some("incubating".to_string()),
                tag: Some(vec!["tag1".to_string()]),
                ..Default::default()
            },
            Item {
                // This project will be ignored as it has the same homepage URL and logo as the previous one
                category: "Category 1".to_string(),
                homepage_url: "https://project2.com".to_string(),
                name: "Project 3".to_string(),
                subcategory: "Subcategory 2".to_string(),
                accepted_at: NaiveDate::from_ymd_opt(2024, 5, 1),
                maturity: Some("incubating".to_string()),
                ..Default::default()
            },
        ],
    };

    // Run the projects stats aggregation
    let projects_stats = ProjectsStats::new(&landscape_data);

    // Check the acceptance, audit, category, maturity, promotion and TAG stats
    let expected_projects_stats = Some(ProjectsStats {
        projects: 2,
        accepted_at: vec![("2024-04".to_string(), 1), ("2024-05".to_string(), 1)].into_iter().collect(),
        accepted_at_rt: vec![("2024-04".to_string(), 1), ("2024-05".to_string(), 2)].into_iter().collect(),
        audits: vec![("2024-04".to_string(), 1), ("2024-05".to_string(), 1)].into_iter().collect(),
        audits_rt: vec![("2024-04".to_string(), 1), ("2024-05".to_string(), 2)].into_iter().collect(),
        category: vec![(
            "Category 1".to_string(),
            CategoryProjectsStats {
                projects: 2,
                subcategories: vec![("Subcategory 1".to_string(), 1), ("Subcategory 2".to_string(), 1)]
                    .into_iter()
                    .collect(),
            },
        )]
        .into_iter()
        .collect(),
        incubating_to_graduated: vec![("2024-04".to_string(), 1)].into_iter().collect(),
        maturity: vec![("graduated".to_string(), 1), ("incubating".to_string(), 1)].into_iter().collect(),
        sandbox_to_incubating: vec![("2024-05".to_string(), 1)].into_iter().collect(),
        tag: vec![("tag1".to_string(), 2)].into_iter().collect(),
    });
    pretty_assertions::assert_eq!(projects_stats, expected_projects_stats);
}

#[test]
fn test_projects_stats_new_returns_none_without_projects() {
    // Setup an item without maturity
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![Item {
            category: "Category".to_string(),
            name: "Item".to_string(),
            subcategory: "Subcategory".to_string(),
            accepted_at: NaiveDate::from_ymd_opt(2024, 4, 2),
            ..Default::default()
        }],
    };

    // Run the projects stats aggregation and check no stats are returned
    assert_eq!(ProjectsStats::new(&landscape_data), None);
}

#[test]
fn test_projects_stats_new_skips_graduation_at_acceptance() {
    // Setup a project accepted directly as graduated
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![Item {
            category: "Category".to_string(),
            name: "Project".to_string(),
            subcategory: "Subcategory".to_string(),
            accepted_at: NaiveDate::from_ymd_opt(2024, 4, 2),
            graduated_at: NaiveDate::from_ymd_opt(2024, 4, 2),
            maturity: Some("graduated".to_string()),
            ..Default::default()
        }],
    };

    // Run the projects stats aggregation
    let projects_stats = ProjectsStats::new(&landscape_data).unwrap();

    // Check no promotion to graduated was counted
    assert!(projects_stats.incubating_to_graduated.is_empty());
}

#[test]
fn test_projects_stats_new_skips_incubation_without_accepted_at() {
    // Setup an incubating project without acceptance date
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![Item {
            category: "Category".to_string(),
            name: "Project".to_string(),
            subcategory: "Subcategory".to_string(),
            incubating_at: NaiveDate::from_ymd_opt(2024, 4, 2),
            maturity: Some("incubating".to_string()),
            ..Default::default()
        }],
    };

    // Run the projects stats aggregation
    let projects_stats = ProjectsStats::new(&landscape_data).unwrap();

    // Check no promotion to incubating was counted
    assert!(projects_stats.sandbox_to_incubating.is_empty());
}

#[test]
#[expect(clippy::too_many_lines)]
fn test_repositories_stats_new_aggregates_repository_stats() {
    // Setup projects with repositories GitHub data, including an excluded
    // language, languages out of the top 10 and a duplicated repository URL
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![
            Item {
                name: "Project 1".to_string(),
                repositories: Some(vec![Repository {
                    url: "https://repository1.url".to_string(),
                    github_data: Some(RepositoryGithubData {
                        contributors: Contributors {
                            count: 1,
                            ..Default::default()
                        },
                        participation_stats: vec![1, 2, 3],
                        stars: 10,
                        languages: Some(
                            vec![
                                ("Rust".to_string(), 100),
                                ("Python".to_string(), 20),
                                ("Shell".to_string(), 100), // In EXCLUDED_LANGUAGES
                                ("otherlang1".to_string(), 5), // Out of top 10
                                ("otherlang2".to_string(), 10),
                                ("otherlang3".to_string(), 10),
                                ("otherlang4".to_string(), 10),
                                ("otherlang5".to_string(), 10),
                                ("otherlang6".to_string(), 10),
                                ("otherlang7".to_string(), 10),
                                ("otherlang8".to_string(), 10),
                                ("otherlang9".to_string(), 10),
                            ]
                            .into_iter()
                            .collect(),
                        ),
                        license: Some("Apache-2.0".to_string()),
                        ..Default::default()
                    }),
                    ..Default::default()
                }]),
                ..Default::default()
            },
            Item {
                name: "Project 2".to_string(),
                repositories: Some(vec![
                    Repository {
                        url: "https://repository2.url".to_string(),
                        github_data: Some(RepositoryGithubData {
                            contributors: Contributors {
                                count: 2,
                                ..Default::default()
                            },
                            participation_stats: vec![4, 5, 6],
                            stars: 20,
                            languages: Some(
                                vec![
                                    ("Rust".to_string(), 200),
                                    ("Python".to_string(), 100),
                                    ("otherlang2".to_string(), 10),
                                    ("otherlang3".to_string(), 10),
                                    ("otherlang4".to_string(), 10),
                                    ("otherlang5".to_string(), 10),
                                    ("otherlang6".to_string(), 10),
                                    ("otherlang7".to_string(), 10),
                                    ("otherlang8".to_string(), 10),
                                    ("otherlang9".to_string(), 10),
                                ]
                                .into_iter()
                                .collect(),
                            ),
                            license: Some("Apache-2.0".to_string()),
                            ..Default::default()
                        }),
                        license: Some("MIT".to_string()),
                        ..Default::default()
                    },
                    Repository {
                        // This repository will be ignored as it has the same URL as the previous one
                        url: "https://repository2.url".to_string(),
                        github_data: Some(RepositoryGithubData {
                            stars: 20,
                            ..Default::default()
                        }),
                        ..Default::default()
                    },
                ]),
                ..Default::default()
            },
        ],
    };

    // Run the repositories stats aggregation
    let repositories_stats = RepositoriesStats::new(&landscape_data);

    // Check the bytes, contributors, languages, licenses, participation and stars stats
    let expected_repositories_stats = Some(RepositoriesStats {
        bytes: 685,
        contributors: 3,
        repositories: 2,
        stars: 30,
        languages: vec![
            ("Rust".to_string(), 2),
            ("Python".to_string(), 2),
            ("otherlang2".to_string(), 2),
            ("otherlang3".to_string(), 2),
            ("otherlang4".to_string(), 2),
            ("otherlang5".to_string(), 2),
            ("otherlang6".to_string(), 2),
            ("otherlang7".to_string(), 2),
            ("otherlang8".to_string(), 2),
            ("otherlang9".to_string(), 2),
        ]
        .into_iter()
        .collect(),
        languages_bytes: vec![
            ("Rust".to_string(), 300),
            ("Python".to_string(), 120),
            ("otherlang2".to_string(), 20),
            ("otherlang3".to_string(), 20),
            ("otherlang4".to_string(), 20),
            ("otherlang5".to_string(), 20),
            ("otherlang6".to_string(), 20),
            ("otherlang7".to_string(), 20),
            ("otherlang8".to_string(), 20),
            ("otherlang9".to_string(), 20),
        ]
        .into_iter()
        .collect(),
        licenses: vec![("Apache-2.0".to_string(), 1), ("MIT".to_string(), 1)].into_iter().collect(),
        participation_stats: vec![5, 7, 9],
    });
    pretty_assertions::assert_eq!(repositories_stats, expected_repositories_stats);
}

#[test]
fn test_repositories_stats_new_breaks_top_language_ties_alphabetically() {
    // Setup nine languages used in two repositories, plus two languages tied
    // at the 10th place used only in the first one
    let top_languages = [
        "C",
        "C++",
        "Go",
        "JavaScript",
        "Python",
        "Ruby",
        "Rust",
        "Scala",
        "TypeScript",
    ];
    let second_languages: BTreeMap<String, i64> =
        top_languages.iter().map(|language| ((*language).to_string(), 100)).collect();
    let mut first_languages = second_languages.clone();
    first_languages.insert("Java".to_string(), 10);
    first_languages.insert("Kotlin".to_string(), 10);
    let mut first_item = repository_item("https://repository1.url", vec![]);
    let mut second_item = repository_item("https://repository2.url", vec![]);
    set_languages(&mut first_item, first_languages);
    set_languages(&mut second_item, second_languages);
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![first_item, second_item],
    };

    // Run the repositories stats aggregation
    let repositories_stats = RepositoriesStats::new(&landscape_data).unwrap();

    // Check the alphabetically first tied language takes the 10th place
    let mut expected_languages: Vec<&str> = top_languages.to_vec();
    expected_languages.push("Java");
    expected_languages.sort_unstable();
    assert_eq!(
        repositories_stats.languages.keys().map(String::as_str).collect::<Vec<_>>(),
        expected_languages
    );
    assert_eq!(
        repositories_stats.languages_bytes.keys().map(String::as_str).collect::<Vec<_>>(),
        expected_languages
    );
}

#[test]
fn test_repositories_stats_new_ignores_repository_without_github_data() {
    // Setup a repository without GitHub data followed by one with it
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![
            Item {
                name: "Project 1".to_string(),
                repositories: Some(vec![Repository {
                    url: "https://repository1.url".to_string(),
                    ..Default::default()
                }]),
                ..Default::default()
            },
            Item {
                name: "Project 2".to_string(),
                repositories: Some(vec![Repository {
                    url: "https://repository2.url".to_string(),
                    github_data: Some(RepositoryGithubData {
                        contributors: Contributors {
                            count: 2,
                            ..Default::default()
                        },
                        participation_stats: vec![1, 2, 3],
                        stars: 10,
                        license: Some("Apache-2.0".to_string()),
                        ..Default::default()
                    }),
                    ..Default::default()
                }]),
                ..Default::default()
            },
        ],
    };

    // Run the repositories stats aggregation
    let repositories_stats = RepositoriesStats::new(&landscape_data);

    // Check both repositories are counted but only one adds GitHub stats
    let expected_repositories_stats = Some(RepositoriesStats {
        contributors: 2,
        repositories: 2,
        stars: 10,
        licenses: BTreeMap::from([("Apache-2.0".to_string(), 1)]),
        participation_stats: vec![1, 2, 3],
        ..Default::default()
    });
    assert_eq!(repositories_stats, expected_repositories_stats);
}

#[test]
fn test_repositories_stats_new_participation_stats_empty_first() {
    // Setup a repository still computing its weekly stats followed by another one
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![
            repository_item("https://repository1.url", vec![]),
            repository_item("https://repository2.url", vec![1, 2, 3]),
        ],
    };

    // Run the repositories stats aggregation
    let repositories_stats = RepositoriesStats::new(&landscape_data).unwrap();

    // Check the weekly stats of the second repository are used
    assert_eq!(repositories_stats.participation_stats, vec![1, 2, 3]);
}

#[test]
fn test_repositories_stats_new_returns_none_without_repositories() {
    // Setup an item without repositories
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![Item {
            name: "Item".to_string(),
            ..Default::default()
        }],
    };

    // Run the repositories stats aggregation and check no stats are returned
    assert_eq!(RepositoriesStats::new(&landscape_data), None);
}

#[test]
fn test_repositories_stats_new_right_aligns_shorter_participation_stats() {
    // Setup a repository with three weeks of stats and another with only one
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![
            repository_item("https://repository1.url", vec![1, 2, 3]),
            repository_item("https://repository2.url", vec![1]),
        ],
    };

    // Run the repositories stats aggregation
    let repositories_stats = RepositoriesStats::new(&landscape_data).unwrap();

    // Check the shorter series is added to the most recent week
    assert_eq!(repositories_stats.participation_stats, vec![1, 2, 4]);
}

#[test]
fn test_repositories_stats_new_skips_empty_participation_stats() {
    // Setup repositories with weekly stats, the second one still being computed
    let landscape_data = LandscapeData {
        categories: vec![],
        items: vec![
            repository_item("https://repository1.url", vec![1, 2, 3]),
            repository_item("https://repository2.url", vec![]),
            repository_item("https://repository3.url", vec![4, 5, 6]),
        ],
    };

    // Run the repositories stats aggregation
    let repositories_stats = RepositoriesStats::new(&landscape_data).unwrap();

    // Check the empty weekly stats did not discard the previous ones
    assert_eq!(repositories_stats.participation_stats, vec![5, 7, 9]);
}

#[test]
fn test_increment_adds_to_existing_key() {
    // Setup an empty map
    let mut map = BTreeMap::new();

    // Run the increments, twice for one key and once for another
    increment(&mut map, &"key1", 1);
    increment(&mut map, &"key1", 1);
    increment(&mut map, &"key2", 1);

    // Check the existing key accumulated both increments
    assert_eq!(map.get(&"key1"), Some(&2));
    assert_eq!(map.get(&"key2"), Some(&1));
}

#[test]
fn test_calculate_running_total_accumulates_in_key_order() {
    // Setup monthly values
    let mut map = BTreeMap::new();
    map.insert("2024-01".to_string(), 1);
    map.insert("2024-02".to_string(), 2);
    map.insert("2024-03".to_string(), 3);

    // Run the running total calculation
    let rt = calculate_running_total(&map);

    // Check each month accumulates the previous ones
    assert_eq!(rt.get("2024-01"), Some(&1));
    assert_eq!(rt.get("2024-02"), Some(&3));
    assert_eq!(rt.get("2024-03"), Some(&6));
}

// Helpers.

/// Build an organization item with the acquisitions and funding rounds
/// provided.
fn organization_item(acquisitions: Vec<Acquisition>, funding_rounds: Vec<FundingRound>) -> Item {
    Item {
        name: "Organization".to_string(),
        crunchbase_data: Some(Organization {
            acquisitions: Some(acquisitions),
            funding_rounds: Some(funding_rounds),
            ..Default::default()
        }),
        crunchbase_url: Some("https://crunchbase.com/organization".to_string()),
        ..Default::default()
    }
}

/// Fixed reference time used as `now` by the stats tests.
fn reference_time() -> DateTime<Utc> {
    Utc.with_ymd_and_hms(2026, 6, 15, 0, 0, 0).unwrap()
}

/// Build an item with one repository with the weekly participation stats
/// provided.
fn repository_item(url: &str, participation_stats: Vec<i64>) -> Item {
    Item {
        name: url.to_string(),
        repositories: Some(vec![Repository {
            url: url.to_string(),
            github_data: Some(RepositoryGithubData {
                participation_stats,
                ..Default::default()
            }),
            ..Default::default()
        }]),
        ..Default::default()
    }
}

/// Set the languages of the GitHub data of the item's first repository.
fn set_languages(item: &mut Item, languages: BTreeMap<String, i64>) {
    let repository = &mut item.repositories.as_mut().unwrap()[0];
    repository.github_data.as_mut().unwrap().languages = Some(languages);
}

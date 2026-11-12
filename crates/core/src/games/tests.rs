use std::fs;

use crate::data;

use super::*;

/// Name of the games file served by the mock server.
const GAMES_FILE: &str = "games.yml";

/// Landscape games JSON schema.
const GAMES_SCHEMA_FILE: &str = "../../docs/config/schema/games.schema.json";

/// Landscape games fixture.
const TESTS_GAMES_FILE: &str = "src/testdata/games.yml";

#[test]
fn test_games_schema_limits_match_validation_constants() {
    // Setup the question schema
    let schema: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(GAMES_SCHEMA_FILE).unwrap()).unwrap();
    let question = schema.pointer("/properties/quiz/properties/questions/items/properties").unwrap();

    // Check the options and title limits match the validation constants
    let options = &question["options"];
    assert_eq!(options["maxItems"].as_u64(), Some(MAX_QUESTION_OPTIONS as u64));
    assert_eq!(options["minItems"].as_u64(), Some(MIN_QUESTION_OPTIONS as u64));
    assert_eq!(
        question["title"]["maxLength"].as_u64(),
        Some(MAX_QUESTION_TITLE_LEN as u64)
    );
}

#[test]
fn test_games_source_new_from_url_sets_games_url() {
    let url = "https://example.url/games.yml";
    let src = GamesSource::new_from_url(url.to_string());
    assert_eq!(
        src,
        GamesSource {
            games_file: None,
            games_url: Some(url.to_string()),
        }
    );
}

#[tokio::test]
async fn test_landscape_games_new_loads_url() {
    // Setup games file server
    let mut server = mockito::Server::new_async().await;
    let mock = server
        .mock("GET", format!("/{GAMES_FILE}").as_str())
        .with_status(200)
        .with_body_from_file(TESTS_GAMES_FILE)
        .create_async()
        .await;

    // Run the games load from the url source
    let src = GamesSource::new_from_url(format!("{}/{GAMES_FILE}", server.url()));
    let games = LandscapeGames::new(&src).await.unwrap().unwrap();

    // Check the games data was parsed and that the games file was requested
    assert_eq!(games.quiz.unwrap().questions[0].title, "Question title");
    mock.assert_async().await;
}

#[tokio::test]
async fn test_landscape_games_new_returns_none_without_source() {
    let src = GamesSource::default();
    assert!(LandscapeGames::new(&src).await.unwrap().is_none());
}

#[test]
fn test_landscape_games_check_items_matches_case_insensitively() {
    // Setup a question whose options use a different case than the items
    let games = games_with_question(Question {
        options: vec![
            QuestionOption {
                item: "ITEM 1".to_string(),
                correct: true,
                ..Default::default()
            },
            QuestionOption {
                item: "item 2".to_string(),
                category: Some("CATEGORY 1".to_string()),
                ..Default::default()
            },
            QuestionOption {
                item: "Item 3".to_string(),
                category: Some("category 1".to_string()),
                subcategory: Some("SUBCATEGORY 2".to_string()),
                ..Default::default()
            },
        ],
        ..valid_question()
    });

    // Run the check against the landscape data
    games.check_items(&landscape_data()).unwrap();
}

#[test]
fn test_landscape_games_check_items_rejects_unknown_item() {
    // Setup a valid first question and a second one with an option whose item
    // exists, but not in the category provided
    let games = LandscapeGames {
        quiz: Some(Quiz {
            questions: vec![
                Question {
                    options: vec![
                        QuestionOption {
                            item: "Item 1".to_string(),
                            correct: true,
                            ..Default::default()
                        },
                        QuestionOption {
                            item: "Item 2".to_string(),
                            ..Default::default()
                        },
                    ],
                    title: "Question 1".to_string(),
                },
                Question {
                    options: vec![
                        QuestionOption {
                            item: "Item 1".to_string(),
                            correct: true,
                            ..Default::default()
                        },
                        QuestionOption {
                            item: "Item 3".to_string(),
                            category: Some("Category 1".to_string()),
                            subcategory: Some("Subcategory 1".to_string()),
                            ..Default::default()
                        },
                    ],
                    title: "Question 2".to_string(),
                },
            ],
        }),
    };

    // Run the check and verify the question and option are reported
    let err = games.check_items(&landscape_data()).unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "question [1] is not valid: option [1] item [Item 3] in category [Category 1] / subcategory [Subcategory 1] not found in the landscape data"
    );
}

#[test]
fn test_landscape_games_new_from_yaml_adds_not_valid_context() {
    // Setup games data that is valid except for a question with one option
    let raw = r"
quiz:
  questions:
    - title: Question title
      options:
        - item: item1
          correct: true
";

    // Run the parsing and check the error
    let err = LandscapeGames::new_from_yaml(raw).unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "the landscape games file provided is not valid: question [0] is not valid: must have at least 2 options"
    );
}

#[test]
fn test_landscape_games_new_from_yaml_parses_fixture() {
    // Run the parsing of the games fixture
    let raw = fs::read_to_string(TESTS_GAMES_FILE).unwrap();
    let parsed = LandscapeGames::new_from_yaml(&raw).unwrap();

    // Check the whole games data and that no warnings were reported
    assert_eq!(
        parsed,
        Parsed {
            value: LandscapeGames {
                quiz: Some(Quiz {
                    questions: vec![Question {
                        options: vec![
                            QuestionOption {
                                item: "item1".to_string(),
                                category: None,
                                correct: true,
                                subcategory: None,
                            },
                            QuestionOption {
                                item: "item2".to_string(),
                                category: None,
                                correct: false,
                                subcategory: None,
                            },
                            QuestionOption {
                                item: "item3".to_string(),
                                category: None,
                                correct: false,
                                subcategory: None,
                            },
                        ],
                        title: "Question title".to_string(),
                    }],
                }),
            },
            warnings: vec![],
        }
    );
}

#[test]
fn test_landscape_games_new_from_yaml_rejects_invalid_yaml() {
    let err = LandscapeGames::new_from_yaml("quiz:\n  questions: [").unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "the landscape games file provided is not valid: invalid yaml file: did not find expected node content at line 3 column 1, while parsing a flow node"
    );
}

#[test]
fn test_landscape_games_new_from_yaml_rejects_missing_questions_key() {
    let err = LandscapeGames::new_from_yaml("quiz: {}\n").unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "the landscape games file provided is not valid: invalid yaml file: quiz: missing field `questions` at line 1 column 7"
    );
}

#[test]
fn test_landscape_games_new_from_yaml_warns_on_unknown_key() {
    // Setup valid games data with a misspelled correct key in two options
    let raw = r"
quiz:
  questions:
    - title: Question title
      options:
        - item: item1
          correct: true
        - item: item2
          corect: false
        - item: item3
          corect: false
";

    // Run the parsing and check the unknown key is reported once
    let parsed = LandscapeGames::new_from_yaml(raw).unwrap();
    assert_eq!(
        parsed.warnings,
        vec![
            "unknown key `quiz.questions[].options[].corect` (found 2 times, first at quiz.questions.0.options.1.corect)"
        ]
    );
}

#[test]
fn test_landscape_games_validate_accepts_200_ascii_char_title() {
    let games = games_with_question(Question {
        title: "a".repeat(200),
        ..valid_question()
    });

    games.validate().unwrap();
}

#[test]
fn test_landscape_games_validate_accepts_200_multibyte_char_title() {
    let games = games_with_question(Question {
        title: "文".repeat(200),
        ..valid_question()
    });

    games.validate().unwrap();
}

#[test]
fn test_landscape_games_validate_accepts_four_options() {
    // Setup a question with the maximum of four options
    let games = games_with_question(Question {
        options: vec![
            QuestionOption {
                item: "Option 1".to_string(),
                correct: true,
                ..Default::default()
            },
            QuestionOption {
                item: "Option 2".to_string(),
                ..Default::default()
            },
            QuestionOption {
                item: "Option 3".to_string(),
                ..Default::default()
            },
            QuestionOption {
                item: "Option 4".to_string(),
                ..Default::default()
            },
        ],
        ..valid_question()
    });

    // Run the validation and check it succeeds
    games.validate().unwrap();
}

#[test]
fn test_landscape_games_validate_accepts_valid_quiz() {
    // Setup a quiz with two valid questions, one using categories and subcategories
    let games = LandscapeGames {
        quiz: Some(Quiz {
            questions: vec![
                Question {
                    options: vec![
                        QuestionOption {
                            item: "Option 1".to_string(),
                            category: Some("Category 1".to_string()),
                            correct: true,
                            subcategory: Some("Subcategory 1".to_string()),
                        },
                        QuestionOption {
                            item: "Option 2".to_string(),
                            category: Some("Category 1".to_string()),
                            ..Default::default()
                        },
                        QuestionOption {
                            item: "Option 3".to_string(),
                            ..Default::default()
                        },
                    ],
                    title: "Question 1".to_string(),
                },
                Question {
                    title: "Question 2".to_string(),
                    ..valid_question()
                },
            ],
        }),
    };

    // Run the validation and check it succeeds
    games.validate().unwrap();
}

#[test]
fn test_landscape_games_validate_rejects_201_char_title() {
    // Setup a question with a title longer than 200 characters
    let games = games_with_question(Question {
        title: "a".repeat(201),
        ..valid_question()
    });

    // Run the validation and check the error
    let err = games.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "question [0] is not valid: title cannot be longer than 200 characters"
    );
}

#[test]
fn test_landscape_games_validate_rejects_duplicate_option() {
    // Setup a question with two options that only differ in case, plus an
    // option with the same item in another category, which is not a duplicate
    let games = games_with_question(Question {
        options: vec![
            QuestionOption {
                item: "Option 1".to_string(),
                correct: true,
                ..Default::default()
            },
            QuestionOption {
                item: "Option 1".to_string(),
                category: Some("Category 1".to_string()),
                ..Default::default()
            },
            QuestionOption {
                item: "Option 2".to_string(),
                category: Some("Category 1".to_string()),
                ..Default::default()
            },
            QuestionOption {
                item: "OPTION 2".to_string(),
                category: Some("category 1".to_string()),
                ..Default::default()
            },
        ],
        ..valid_question()
    });

    // Run the validation and check the error
    let err = games.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "question [0] is not valid: duplicate option [OPTION 2]"
    );
}

#[test]
fn test_landscape_games_validate_rejects_empty_option_category() {
    // Setup a question with an option with an empty category
    let games = games_with_question(Question {
        options: vec![
            QuestionOption {
                item: "Option 1".to_string(),
                correct: true,
                ..Default::default()
            },
            QuestionOption {
                item: "Option 2".to_string(),
                category: Some("   ".to_string()),
                ..Default::default()
            },
        ],
        ..valid_question()
    });

    // Run the validation and check the error
    let err = games.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "question [0] is not valid: category cannot be empty if provided"
    );
}

#[test]
fn test_landscape_games_validate_rejects_empty_option_item() {
    // Setup a question with an option with an empty item
    let games = games_with_question(Question {
        options: vec![
            QuestionOption {
                item: "Option 1".to_string(),
                correct: true,
                ..Default::default()
            },
            QuestionOption {
                item: "   ".to_string(),
                ..Default::default()
            },
        ],
        ..valid_question()
    });

    // Run the validation and check the error
    let err = games.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "question [0] is not valid: item cannot be empty"
    );
}

#[test]
fn test_landscape_games_validate_rejects_empty_option_subcategory() {
    // Setup a question with an option with a category and an empty subcategory
    let games = games_with_question(Question {
        options: vec![
            QuestionOption {
                item: "Option 1".to_string(),
                correct: true,
                ..Default::default()
            },
            QuestionOption {
                item: "Option 2".to_string(),
                category: Some("Category 1".to_string()),
                subcategory: Some("   ".to_string()),
                ..Default::default()
            },
        ],
        ..valid_question()
    });

    // Run the validation and check the error
    let err = games.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "question [0] is not valid: subcategory cannot be empty if provided"
    );
}

#[test]
fn test_landscape_games_validate_rejects_empty_quiz() {
    let games = LandscapeGames {
        quiz: Some(Quiz { questions: vec![] }),
    };

    let err = games.validate().unwrap_err();
    assert_eq!(format!("{err:#}"), "quiz must have at least one question");
}

#[test]
fn test_landscape_games_validate_rejects_empty_title() {
    // Setup a question with an empty title
    let games = games_with_question(Question {
        title: "   ".to_string(),
        ..valid_question()
    });

    // Run the validation and check the error
    let err = games.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "question [0] is not valid: title cannot be empty"
    );
}

#[test]
fn test_landscape_games_validate_rejects_five_options() {
    // Setup a question with five options
    let games = games_with_question(Question {
        options: vec![
            QuestionOption {
                item: "Option 1".to_string(),
                correct: true,
                ..Default::default()
            },
            QuestionOption {
                item: "Option 2".to_string(),
                ..Default::default()
            },
            QuestionOption {
                item: "Option 3".to_string(),
                ..Default::default()
            },
            QuestionOption {
                item: "Option 4".to_string(),
                ..Default::default()
            },
            QuestionOption {
                item: "Option 5".to_string(),
                ..Default::default()
            },
        ],
        ..valid_question()
    });

    // Run the validation and check the error
    let err = games.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "question [0] is not valid: must have at most 4 options"
    );
}

#[test]
fn test_landscape_games_validate_rejects_missing_correct_option() {
    // Setup a question without a correct option
    let games = games_with_question(Question {
        options: vec![
            QuestionOption {
                item: "Option 1".to_string(),
                ..Default::default()
            },
            QuestionOption {
                item: "Option 2".to_string(),
                ..Default::default()
            },
        ],
        ..valid_question()
    });

    // Run the validation and check the error
    let err = games.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "question [0] is not valid: must have exactly one correct option"
    );
}

#[test]
fn test_landscape_games_validate_rejects_one_option() {
    // Setup a question with a single option
    let games = games_with_question(Question {
        options: vec![QuestionOption {
            item: "Option 1".to_string(),
            correct: true,
            ..Default::default()
        }],
        ..valid_question()
    });

    // Run the validation and check the error
    let err = games.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "question [0] is not valid: must have at least 2 options"
    );
}

#[test]
fn test_landscape_games_validate_rejects_subcategory_without_category() {
    // Setup a question with an option with a subcategory but no category
    let games = games_with_question(Question {
        options: vec![
            QuestionOption {
                item: "Option 1".to_string(),
                correct: true,
                ..Default::default()
            },
            QuestionOption {
                item: "Option 2".to_string(),
                subcategory: Some("Subcategory 1".to_string()),
                ..Default::default()
            },
        ],
        ..valid_question()
    });

    // Run the validation and check the error
    let err = games.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "question [0] is not valid: subcategory cannot be provided without category"
    );
}

#[test]
fn test_landscape_games_validate_rejects_two_correct_options() {
    // Setup a question with two correct options
    let games = games_with_question(Question {
        options: vec![
            QuestionOption {
                item: "Option 1".to_string(),
                correct: true,
                ..Default::default()
            },
            QuestionOption {
                item: "Option 2".to_string(),
                correct: true,
                ..Default::default()
            },
        ],
        ..valid_question()
    });

    // Run the validation and check the error
    let err = games.validate().unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "question [0] is not valid: must have exactly one correct option"
    );
}

// Helpers.

/// Return games data with a quiz containing only the question provided.
fn games_with_question(question: Question) -> LandscapeGames {
    LandscapeGames {
        quiz: Some(Quiz {
            questions: vec![question],
        }),
    }
}

/// Return landscape data with three items in the same category, the last one
/// in a different subcategory.
fn landscape_data() -> LandscapeData {
    let item = |name: &str, subcategory: &str| data::Item {
        category: "Category 1".to_string(),
        name: name.to_string(),
        subcategory: subcategory.to_string(),
        ..Default::default()
    };
    LandscapeData {
        categories: vec![],
        items: vec![
            item("Item 1", "Subcategory 1"),
            item("Item 2", "Subcategory 1"),
            item("Item 3", "Subcategory 2"),
        ],
    }
}

/// Return a valid quiz question with two options, the first one correct.
fn valid_question() -> Question {
    Question {
        options: vec![
            QuestionOption {
                item: "Option 1".to_string(),
                correct: true,
                ..Default::default()
            },
            QuestionOption {
                item: "Option 2".to_string(),
                ..Default::default()
            },
        ],
        title: "Question 1".to_string(),
    }
}

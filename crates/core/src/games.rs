//! This module defines the types used to represent the landscape games data
//! that must be provided from a YAML file (games.yml).

use anyhow::{bail, format_err, Context, Result};
use clap::Args;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};
use tracing::{debug, instrument};
use wasm_bindgen::prelude::wasm_bindgen;

/// Maximum number of options a question can have.
const MAX_QUESTION_OPTIONS: usize = 4;

/// Minimum number of options a question can have.
const MIN_QUESTION_OPTIONS: usize = 2;

/// Landscape games data source.
#[derive(Args, Default, Debug, Clone, PartialEq)]
#[group(required = false, multiple = false)]
pub struct GamesSource {
    /// Landscape games data file local path.
    #[arg(long)]
    pub games_file: Option<PathBuf>,

    /// Landscape games data file url.
    #[arg(long)]
    pub games_url: Option<String>,
}

impl GamesSource {
    /// Create a new games data source from the url provided.
    #[must_use]
    pub fn new_from_url(url: String) -> Self {
        Self {
            games_file: None,
            games_url: Some(url),
        }
    }
}

/// Landscape games data.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct LandscapeGames {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quiz: Option<Quiz>,
}

impl LandscapeGames {
    /// Create a new landscape games instance from the source provided.
    #[instrument(skip_all, err)]
    pub async fn new(src: &GamesSource) -> Result<Option<Self>> {
        // Try from file
        if let Some(file) = &src.games_file {
            debug!(?file, "getting landscape games data from file");
            return Ok(Some(LandscapeGames::new_from_file(file)?));
        };

        // Try from url
        if let Some(url) = &src.games_url {
            debug!(?url, "getting landscape games data from url");
            return Ok(Some(LandscapeGames::new_from_url(url).await?));
        };

        Ok(None)
    }

    /// Create a new landscape games instance from the file provided.
    fn new_from_file(file: &Path) -> Result<Self> {
        let raw_data = fs::read_to_string(file)?;
        let games = LandscapeGames::new_from_yaml(&raw_data)?;

        Ok(games)
    }

    /// Create a new landscape games instance from the url provided.
    async fn new_from_url(url: &str) -> Result<Self> {
        let resp = reqwest::get(url).await?;
        if resp.status() != StatusCode::OK {
            bail!(
                "unexpected status code getting landscape games file: {}",
                resp.status()
            );
        }
        let raw_data = resp.text().await?;
        let games = LandscapeGames::new_from_yaml(&raw_data)?;

        Ok(games)
    }

    /// Create a new landscape games instance from the YAML string provided.
    fn new_from_yaml(s: &str) -> Result<Self> {
        // Parse YAML string and validate games data
        let games: LandscapeGames = serde_yaml::from_str(s).context("invalid yaml file")?;
        games.validate().context("the landscape games file provided is not valid")?;

        Ok(games)
    }

    /// Validate landscape games data.
    fn validate(&self) -> Result<()> {
        self.validate_quiz()?;

        Ok(())
    }

    /// Validate quiz game data.
    fn validate_quiz(&self) -> Result<()> {
        let Some(quiz) = &self.quiz else {
            return Ok(());
        };

        for (i, question) in quiz.questions.iter().enumerate() {
            let ctx = format!("question [{i}] is not valid");

            // Title cannot be empty
            if question.title.is_empty() {
                return Err(format_err!("title cannot be empty")).context(ctx);
            }

            // Title cannot be longer than 200 characters
            if question.title.len() > 200 {
                return Err(format_err!("title cannot be longer than 200 characters")).context(ctx);
            }

            // Maximum options
            if question.options.len() > MAX_QUESTION_OPTIONS {
                return Err(format_err!("must have at most {MAX_QUESTION_OPTIONS} options")).context(ctx);
            }

            // Minimum options
            if question.options.len() < MIN_QUESTION_OPTIONS {
                return Err(format_err!("must have at least {MIN_QUESTION_OPTIONS} options")).context(ctx);
            }

            // One option must be marked as correct (and only one)
            let correct_options = question.options.iter().filter(|o| o.correct).count();
            if correct_options != 1 {
                return Err(format_err!("must have exactly one correct option")).context(ctx);
            }

            for option in &question.options {
                // Item name cannot be empty
                if option.item.is_empty() {
                    return Err(format_err!("item cannot be empty")).context(ctx);
                }

                // Category cannot be empty if provided
                if let Some(category) = &option.category {
                    if category.is_empty() {
                        return Err(format_err!("category cannot be empty if provided")).context(ctx);
                    }
                }

                // Subcategory cannot be empty if provided
                if let Some(subcategory) = &option.subcategory {
                    if subcategory.is_empty() {
                        return Err(format_err!("subcategory cannot be empty if provided")).context(ctx);
                    }
                }
            }
        }

        Ok(())
    }
}

/// Quiz game data.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Quiz {
    pub questions: Vec<Question>,
}

/// Quiz question details.
#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Question {
    #[wasm_bindgen(readonly, getter_with_clone)]
    pub title: String,

    #[wasm_bindgen(readonly, getter_with_clone)]
    pub options: Vec<QuestionOption>,
}

/// Question option details.
#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct QuestionOption {
    #[wasm_bindgen(readonly, getter_with_clone)]
    pub item: String,

    #[wasm_bindgen(readonly, getter_with_clone)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,

    #[wasm_bindgen(readonly, getter_with_clone)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subcategory: Option<String>,

    #[wasm_bindgen(readonly)]
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub correct: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    const GAMES_FILE: &str = "games.yml";
    const TESTS_GAMES_FILE: &str = "src/testdata/games.yml";

    #[test]
    fn gamessource_new_from_url() {
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
    async fn games_new_using_file() {
        let src = GamesSource {
            games_file: Some(PathBuf::from(TESTS_GAMES_FILE)),
            games_url: None,
        };
        let _ = LandscapeGames::new(&src).await.unwrap();
    }

    #[tokio::test]
    async fn games_new_using_url() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", format!("/{GAMES_FILE}").as_str())
            .with_status(200)
            .with_body_from_file(TESTS_GAMES_FILE)
            .create_async()
            .await;

        let src = GamesSource::new_from_url(format!("{}/{GAMES_FILE}", server.url()));
        let _ = LandscapeGames::new(&src).await.unwrap();
        mock.assert_async().await;
    }

    #[tokio::test]
    async fn games_new_no_file_or_url_provided() {
        let src = GamesSource::default();
        assert!(LandscapeGames::new(&src).await.unwrap().is_none());
    }

    #[test]
    fn games_new_from_file() {
        let file = Path::new(TESTS_GAMES_FILE);
        let _ = LandscapeGames::new_from_file(file).unwrap();
    }

    #[tokio::test]
    async fn games_new_from_url() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", format!("/{GAMES_FILE}").as_str())
            .with_status(200)
            .with_body_from_file(TESTS_GAMES_FILE)
            .create_async()
            .await;

        let url = format!("{}/{GAMES_FILE}", server.url());
        let _ = LandscapeGames::new_from_url(&url).await.unwrap();
        mock.assert_async().await;
    }

    #[tokio::test]
    #[should_panic(expected = "unexpected status code getting landscape games file: 404")]
    async fn games_new_from_url_not_found() {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", format!("/{GAMES_FILE}").as_str())
            .with_status(404)
            .create_async()
            .await;

        let url = format!("{}/{GAMES_FILE}", server.url());
        let _ = LandscapeGames::new_from_url(&url).await.unwrap();
        mock.assert_async().await;
    }

    #[test]
    fn games_new_from_yaml() {
        let raw_data = fs::read_to_string(TESTS_GAMES_FILE).unwrap();
        let _ = LandscapeGames::new_from_yaml(&raw_data).unwrap();
    }

    #[test]
    fn quiz_validate_success() {
        let games = LandscapeGames {
            quiz: Some(Quiz {
                questions: vec![
                    Question {
                        title: "Question 1".to_string(),
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
                        ],
                    },
                    Question {
                        title: "Question 2".to_string(),
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
                    },
                ],
            }),
        };

        games.validate_quiz().unwrap();
    }

    #[test]
    #[should_panic(expected = "title cannot be empty")]
    fn quiz_validate_question_title_empty() {
        let games = LandscapeGames {
            quiz: Some(Quiz {
                questions: vec![Question {
                    title: String::new(),
                    options: vec![],
                }],
            }),
        };

        games.validate_quiz().unwrap();
    }

    #[test]
    #[should_panic(expected = "title cannot be longer than 200 characters")]
    fn quiz_validate_question_title_no_longer_than_200_chars() {
        let games = LandscapeGames {
            quiz: Some(Quiz {
                questions: vec![Question {
                    title: "a".repeat(201),
                    options: vec![],
                }],
            }),
        };

        games.validate_quiz().unwrap();
    }

    #[test]
    #[should_panic(expected = "must have at most 4 options")]
    fn quiz_validate_question_options_max() {
        let games = LandscapeGames {
            quiz: Some(Quiz {
                questions: vec![Question {
                    title: "Question 1".to_string(),
                    options: vec![
                        QuestionOption {
                            item: "Option 1".to_string(),
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
                }],
            }),
        };

        games.validate_quiz().unwrap();
    }

    #[test]
    #[should_panic(expected = "must have at least 2 options")]
    fn quiz_validate_question_options_min() {
        let games = LandscapeGames {
            quiz: Some(Quiz {
                questions: vec![Question {
                    title: "Question 1".to_string(),
                    options: vec![],
                }],
            }),
        };

        games.validate_quiz().unwrap();
    }

    #[test]
    #[should_panic(expected = "must have exactly one correct option")]
    fn quiz_validate_correct_option() {
        let games = LandscapeGames {
            quiz: Some(Quiz {
                questions: vec![Question {
                    title: "Question 1".to_string(),
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
                }],
            }),
        };

        games.validate_quiz().unwrap();
    }

    #[test]
    #[should_panic(expected = "item cannot be empty")]
    fn quiz_validate_option_item_empty() {
        let games = LandscapeGames {
            quiz: Some(Quiz {
                questions: vec![Question {
                    title: "Question 1".to_string(),
                    options: vec![
                        QuestionOption {
                            item: "Option 1".to_string(),
                            correct: true,
                            ..Default::default()
                        },
                        QuestionOption {
                            item: String::new(),
                            ..Default::default()
                        },
                    ],
                }],
            }),
        };

        games.validate_quiz().unwrap();
    }

    #[test]
    #[should_panic(expected = "category cannot be empty if provided")]
    fn quiz_validate_option_category_empty() {
        let games = LandscapeGames {
            quiz: Some(Quiz {
                questions: vec![Question {
                    title: "Question 1".to_string(),
                    options: vec![
                        QuestionOption {
                            item: "Option 1".to_string(),
                            correct: true,
                            ..Default::default()
                        },
                        QuestionOption {
                            item: "Option 2".to_string(),
                            category: Some(String::new()),
                            ..Default::default()
                        },
                    ],
                }],
            }),
        };

        games.validate_quiz().unwrap();
    }

    #[test]
    #[should_panic(expected = "subcategory cannot be empty if provided")]
    fn quiz_validate_option_subcategory_empty() {
        let games = LandscapeGames {
            quiz: Some(Quiz {
                questions: vec![Question {
                    title: "Question 1".to_string(),
                    options: vec![
                        QuestionOption {
                            item: "Option 1".to_string(),
                            correct: true,
                            ..Default::default()
                        },
                        QuestionOption {
                            item: "Option 2".to_string(),
                            subcategory: Some(String::new()),
                            ..Default::default()
                        },
                    ],
                }],
            }),
        };

        games.validate_quiz().unwrap();
    }
}

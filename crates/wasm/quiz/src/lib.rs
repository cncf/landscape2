//! This module contains the quiz game types and logic.

#[cfg(not(test))]
use cached::proc_macro::cached;
#[cfg(not(test))]
use gloo_net::http::Request;
use landscape2_core::games::Question;
#[cfg(not(test))]
use rand::prelude::SliceRandom;
use serde::Serialize;
use wasm_bindgen::prelude::*;

/// Path to the quiz data file.
const QUIZ_DATA_PATH: &str = "data/quiz.json";

/// Number of questions in the quiz.
const QUIZ_QUESTIONS: usize = 10;

/// Options to customize the quiz.
#[wasm_bindgen]
#[derive(Default)]
pub struct QuizOptions {
    landscape_url: String,
}

#[wasm_bindgen]
impl QuizOptions {
    /// Create a new QuizOptions instance.
    #[wasm_bindgen(constructor)]
    pub fn new(landscape_url: String) -> Self {
        Self { landscape_url }
    }
}

/// Quiz represents an instance of a quiz game.
#[wasm_bindgen]
#[derive(Default)]
pub struct Quiz {
    questions: Vec<Question>,
    state: State,
}

#[wasm_bindgen]
impl Quiz {
    /// Create a new Quiz instance.
    #[wasm_bindgen]
    pub async fn new(options: Option<QuizOptions>) -> Result<Quiz, String> {
        let options = options.unwrap_or_default();
        let questions = pick_questions(options.landscape_url).await?;
        let current_question_is_last = questions.len() == 1;

        Ok(Quiz {
            questions,
            state: State {
                current_question: CurrentQuestion {
                    answered: false,
                    index: 0,
                    is_last: current_question_is_last,
                },
                ..Default::default()
            },
        })
    }

    /// Check the player's guess for the current question.
    pub fn check_player_guess(&mut self, selected_option: usize) -> Result<State, String> {
        if !self.state.game_over {
            // Check if the selected option is within bounds
            if selected_option >= self.questions[self.state.current_question.index].options.len() {
                return Err("invalid option selected".to_string());
            }

            // Check if the current question has already been answered
            if self.state.player_answers.len() == self.state.current_question.index + 1 {
                return Err("question already answered".to_string());
            } else {
                // Track answer
                self.state.player_answers.push(selected_option);
                self.state.current_question.answered = true;
            }

            // Check if guess is correct and update score
            if self.questions[self.state.current_question.index].options[selected_option].correct {
                self.state.score.correct += 1;
            } else {
                self.state.score.wrong += 1;
            }

            // Check if the game is over
            if self.state.current_question.is_last {
                self.state.game_over = true;
            }
        } else {
            return Err("game is over".to_string());
        }

        Ok(self.state())
    }

    /// Move to the next question.
    pub fn next_question(&mut self) -> Result<State, String> {
        if !self.state.game_over {
            // Check if current question has been answered
            if self.state.player_answers.len() != self.state.current_question.index + 1 {
                return Err("current question not answered".to_string());
            }

            // Move to the next question
            self.state.current_question = CurrentQuestion {
                answered: false,
                index: self.state.current_question.index + 1,
                is_last: self.state.current_question.index + 1 == self.questions.len() - 1,
            };
        } else {
            return Err("game is over".to_string());
        }

        Ok(self.state())
    }

    /// Return the quiz questions.
    pub fn questions(&self) -> Vec<Question> {
        self.questions.clone()
    }

    /// Return the state of the quiz.
    pub fn state(&self) -> State {
        self.state.clone()
    }
}

/// State of the quiz.
#[wasm_bindgen]
#[derive(Clone, Default, Serialize)]
pub struct State {
    #[wasm_bindgen(readonly)]
    pub current_question: CurrentQuestion,

    #[wasm_bindgen(readonly)]
    pub game_over: bool,

    #[wasm_bindgen(skip)]
    pub player_answers: Vec<usize>,

    #[wasm_bindgen(readonly)]
    pub score: Score,
}

/// Current question details.
#[wasm_bindgen]
#[derive(Copy, Clone, Default, Serialize)]
pub struct CurrentQuestion {
    #[wasm_bindgen(readonly)]
    pub answered: bool,

    #[wasm_bindgen(readonly)]
    pub index: usize,

    #[wasm_bindgen(readonly)]
    pub is_last: bool,
}

/// Score details.
#[wasm_bindgen]
#[derive(Debug, Copy, Clone, PartialEq, Default, Serialize)]
pub struct Score {
    #[wasm_bindgen(readonly)]
    pub correct: usize,

    #[wasm_bindgen(readonly)]
    pub wrong: usize,
}

/// Pick some questions for the quiz.
async fn pick_questions(landscape_url: String) -> Result<Vec<Question>, String> {
    // Fetch all questions available
    #[allow(unused_mut)]
    let mut questions: Vec<Question> = fetch_questions(landscape_url).await.map_err(to_str)?;
    if questions.is_empty() {
        return Err("no questions available".to_string());
    }

    // Shuffle them (including each question options)
    #[cfg(not(test))]
    {
        let mut rng = rand::thread_rng();
        questions.shuffle(&mut rng);
        for question in &mut questions {
            question.options.shuffle(&mut rng);
        }
    }

    // Pick up to QUIZ_QUESTIONS
    let questions: Vec<Question> = questions.into_iter().take(QUIZ_QUESTIONS).collect();

    Ok(questions)
}

/// Fetch the questions available for the quiz.
#[cfg_attr(not(test), cached(result = true, sync_writes = "default"))]
async fn fetch_questions(landscape_url: String) -> Result<Vec<Question>, String> {
    let url = format!("{}/{}", landscape_url.trim_end_matches('/'), QUIZ_DATA_PATH);

    #[cfg(not(test))]
    let resp = Request::get(&url).send().await.map_err(to_str)?;

    #[cfg(test)]
    let resp = reqwest::get(&url).await.map_err(to_str)?;

    if resp.status() != 200 {
        return Err(format!(
            "unexpected status code getting quiz data: {}",
            resp.status()
        ));
    }
    let questions: Vec<Question> = resp.json().await.map_err(to_str)?;

    Ok(questions)
}

/// Helper function to convert an error to a string.
fn to_str<E: std::fmt::Debug>(err: E) -> String {
    format!("{err:?}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use landscape2_core::games::QuestionOption;

    #[tokio::test]
    #[should_panic(expected = "unexpected status code getting quiz data")]
    async fn quiz_data_file_not_found() {
        let (server, mock) = setup_mock_server(404, "src/testdata/quiz1.json").await;

        let options = QuizOptions::new(server.url());
        Quiz::new(Some(options)).await.unwrap();

        mock.assert_async().await;
    }

    #[tokio::test]
    #[should_panic(expected = "no questions available")]
    async fn no_questions_available() {
        let (server, mock) = setup_mock_server(200, "src/testdata/quiz3.json").await;

        let options = QuizOptions::new(server.url());
        Quiz::new(Some(options)).await.unwrap();

        mock.assert_async().await;
    }

    #[tokio::test]
    #[should_panic(expected = "game is over")]
    async fn game_over_check_player_guess() {
        let (server, mock) = setup_mock_server(200, "src/testdata/quiz1.json").await;

        let options = QuizOptions::new(server.url());
        let mut quiz = Quiz::new(Some(options)).await.unwrap();
        assert!(!quiz.state().game_over);
        quiz.check_player_guess(0).unwrap();
        quiz.check_player_guess(1).unwrap();
        assert!(quiz.state().game_over);

        mock.assert_async().await;
    }

    #[tokio::test]
    #[should_panic(expected = "game is over")]
    async fn game_over_next_question() {
        let (server, mock) = setup_mock_server(200, "src/testdata/quiz1.json").await;

        let options = QuizOptions::new(server.url());
        let mut quiz = Quiz::new(Some(options)).await.unwrap();
        assert!(!quiz.state().game_over);
        quiz.check_player_guess(0).unwrap();
        quiz.next_question().unwrap();
        assert!(quiz.state().game_over);

        mock.assert_async().await;
    }

    #[tokio::test]
    #[should_panic(expected = "invalid option selected")]
    async fn invalid_option_selected() {
        let (server, mock) = setup_mock_server(200, "src/testdata/quiz1.json").await;

        let options = QuizOptions::new(server.url());
        let mut quiz = Quiz::new(Some(options)).await.unwrap();
        quiz.check_player_guess(5).unwrap();

        mock.assert_async().await;
    }

    #[tokio::test]
    #[should_panic(expected = "question already answered")]
    async fn question_already_answered() {
        let (server, mock) = setup_mock_server(200, "src/testdata/quiz2.json").await;

        let options = QuizOptions::new(server.url());
        let mut quiz = Quiz::new(Some(options)).await.unwrap();
        quiz.check_player_guess(0).unwrap();
        quiz.check_player_guess(0).unwrap();

        mock.assert_async().await;
    }

    #[tokio::test]
    #[should_panic(expected = "current question not answered")]
    async fn current_question_not_answered() {
        let (server, mock) = setup_mock_server(200, "src/testdata/quiz2.json").await;

        let options = QuizOptions::new(server.url());
        let mut quiz = Quiz::new(Some(options)).await.unwrap();
        quiz.next_question().unwrap();

        mock.assert_async().await;
    }

    #[tokio::test]
    async fn quiz_completed_successfully() {
        let (server, mock) = setup_mock_server(200, "src/testdata/quiz2.json").await;

        let options = QuizOptions::new(server.url());
        let mut quiz = Quiz::new(Some(options)).await.unwrap();

        // Check status after quiz creation
        assert_eq!(
            quiz.questions(),
            vec![
                Question {
                    title: "question1".to_string(),
                    options: vec![
                        QuestionOption {
                            category: Some("category1".to_string()),
                            subcategory: Some("subcategory1".to_string()),
                            item: "item1".to_string(),
                            correct: true,
                        },
                        QuestionOption {
                            category: Some("category2".to_string()),
                            subcategory: Some("subcategory2".to_string()),
                            item: "item2".to_string(),
                            correct: false,
                        }
                    ]
                },
                Question {
                    title: "question2".to_string(),
                    options: vec![
                        QuestionOption {
                            category: Some("category3".to_string()),
                            subcategory: Some("subcategory3".to_string()),
                            item: "item3".to_string(),
                            correct: true,
                        },
                        QuestionOption {
                            item: "item4".to_string(),
                            ..Default::default()
                        }
                    ]
                }
            ]
        );
        assert_eq!(quiz.state().current_question.index, 0);
        assert!(!quiz.state().current_question.is_last);
        assert!(!quiz.state().current_question.answered);
        assert!(!quiz.state().game_over);
        assert_eq!(quiz.state().player_answers, Vec::<usize>::new());
        assert_eq!(quiz.state().score, Score::default());

        // Check status after answering first question
        quiz.check_player_guess(0).unwrap();
        assert_eq!(quiz.state().current_question.index, 0);
        assert!(!quiz.state().current_question.is_last);
        assert!(quiz.state().current_question.answered);
        assert!(!quiz.state().game_over);
        assert_eq!(quiz.state().player_answers, vec![0]);
        assert_eq!(quiz.state().score, Score { correct: 1, wrong: 0 });

        // Check status after moving to the next question
        quiz.next_question().unwrap();
        assert_eq!(quiz.state().current_question.index, 1);
        assert!(quiz.state().current_question.is_last);
        assert!(!quiz.state().current_question.answered);
        assert!(!quiz.state().game_over);
        assert_eq!(quiz.state().player_answers, vec![0]);
        assert_eq!(quiz.state().score, Score { correct: 1, wrong: 0 });

        // Check status after answering second question
        quiz.check_player_guess(1).unwrap();
        assert_eq!(quiz.state().current_question.index, 1);
        assert!(quiz.state().current_question.is_last);
        assert!(quiz.state().current_question.answered);
        assert!(quiz.state().game_over);
        assert_eq!(quiz.state().player_answers, vec![0, 1]);
        assert_eq!(quiz.state().score, Score { correct: 1, wrong: 1 });

        mock.assert_async().await;
    }

    async fn setup_mock_server(status_code: usize, data_file: &str) -> (mockito::ServerGuard, mockito::Mock) {
        let mut server = mockito::Server::new_async().await;
        let mock = server
            .mock("GET", format!("/{QUIZ_DATA_PATH}").as_str())
            .with_status(status_code)
            .with_body_from_file(data_file)
            .create_async()
            .await;
        (server, mock)
    }
}

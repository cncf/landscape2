//! This module contains the quiz game types and logic.

use cached::cached;
#[cfg(not(test))]
use gloo_net::http::Request;
use landscape2_core::{
    games::Question,
    paths::{DATASETS_PATH, QUIZ_DATASET_FILE},
};
use rand::{Rng, prelude::SliceRandom};
use wasm_bindgen::prelude::wasm_bindgen;

/// Number of questions in the quiz.
const QUIZ_QUESTIONS: usize = 10;

/// Options to customize the quiz.
#[wasm_bindgen]
pub struct QuizOptions {
    /// Url of the landscape the quiz questions are fetched from.
    landscape_url: String,

    /// Questions provided by the caller as a JSON array; used instead of
    /// fetching `data/quiz.json`.
    questions_json: Option<String>,
}

#[wasm_bindgen]
impl QuizOptions {
    /// Create a new QuizOptions instance.
    #[wasm_bindgen(constructor)]
    pub fn new(landscape_url: String, questions_json: Option<String>) -> Self {
        Self {
            landscape_url,
            questions_json,
        }
    }
}

/// Quiz represents an instance of a quiz game.
#[wasm_bindgen]
pub struct Quiz {
    /// Questions picked for this game, in the order they are asked.
    questions: Vec<Question>,
    /// Current state of the game.
    state: State,
}

#[wasm_bindgen]
impl Quiz {
    /// Create a new Quiz instance.
    #[wasm_bindgen]
    pub async fn new(options: QuizOptions) -> Result<Quiz, String> {
        // Get the questions provided by the caller, or fetch the deployed ones
        let questions = match options.questions_json {
            Some(questions_json) => parse_questions(&questions_json)?,
            None => fetch_questions(options.landscape_url).await?,
        };

        // Prepare the quiz from a random pick of them
        Quiz::from_questions(questions, &mut rand::rng())
    }

    /// Check the player's guess for the current question.
    pub fn check_player_guess(&mut self, selected_option: usize) -> Result<State, String> {
        // Check the game is still in progress
        if self.state.game_over {
            return Err("game is over".to_string());
        }

        // Check the selected option is within bounds
        let current_question = &self.questions[self.state.current_question.index];
        let Some(option) = current_question.options.get(selected_option) else {
            return Err("invalid option selected".to_string());
        };

        // Check the current question has not been answered yet
        if self.state.current_question.answered {
            return Err("question already answered".to_string());
        }

        // Track the answer and update the score
        self.state.current_question.answered = true;
        if option.correct {
            self.state.score.correct += 1;
        } else {
            self.state.score.wrong += 1;
        }

        // Finish the game when the last question has been answered
        if self.state.current_question.is_last {
            self.state.game_over = true;
        }

        Ok(self.state())
    }

    /// Return the current question.
    pub fn current_question(&self) -> Question {
        self.questions[self.state.current_question.index].clone()
    }

    /// Move to the next question.
    pub fn next_question(&mut self) -> Result<State, String> {
        // Check the game is still in progress
        if self.state.game_over {
            return Err("game is over".to_string());
        }

        // Check the current question has been answered
        if !self.state.current_question.answered {
            return Err("current question not answered".to_string());
        }

        // Move to the next question
        let index = self.state.current_question.index + 1;
        self.state.current_question = CurrentQuestion {
            answered: false,
            index,
            is_last: self.is_last(index),
        };

        Ok(self.state())
    }

    /// Return the number of questions in the quiz.
    pub fn questions_count(&self) -> usize {
        self.questions.len()
    }

    /// Return the state of the quiz.
    pub fn state(&self) -> State {
        self.state.clone()
    }
}

impl Quiz {
    /// Create a quiz from the questions provided, picking up to
    /// `QUIZ_QUESTIONS` of them in random order and shuffling their options.
    fn from_questions<R: Rng + ?Sized>(mut questions: Vec<Question>, rng: &mut R) -> Result<Quiz, String> {
        // Check some questions are available
        if questions.is_empty() {
            return Err("no questions available".to_string());
        }

        // Shuffle them (including each question options)
        questions.shuffle(rng);
        for question in &mut questions {
            question.options.shuffle(rng);
        }

        // Pick up to QUIZ_QUESTIONS
        questions.truncate(QUIZ_QUESTIONS);

        // Prepare the initial state, positioned on the first question
        let mut quiz = Quiz {
            questions,
            state: State::default(),
        };
        quiz.state.current_question.is_last = quiz.is_last(0);

        Ok(quiz)
    }

    /// Check if the question at the index provided is the last one.
    fn is_last(&self, index: usize) -> bool {
        index + 1 == self.questions.len()
    }
}

/// State of the quiz.
#[wasm_bindgen]
#[derive(Clone, Debug, Default, PartialEq)]
pub struct State {
    /// Question the player is on.
    #[wasm_bindgen(readonly)]
    pub current_question: CurrentQuestion,
    /// Whether the last question has been answered.
    #[wasm_bindgen(readonly)]
    pub game_over: bool,
    /// Answers tally so far.
    #[wasm_bindgen(readonly)]
    pub score: Score,
}

/// Current question details.
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct CurrentQuestion {
    /// Whether the player has already answered the question.
    #[wasm_bindgen(readonly)]
    pub answered: bool,
    /// Zero-based position of the question in the quiz.
    #[wasm_bindgen(readonly)]
    pub index: usize,
    /// Whether the question is the last one of the quiz.
    #[wasm_bindgen(readonly)]
    pub is_last: bool,
}

/// Score details.
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Score {
    /// Number of questions answered correctly.
    #[wasm_bindgen(readonly)]
    pub correct: usize,
    /// Number of questions answered wrongly.
    #[wasm_bindgen(readonly)]
    pub wrong: usize,
}

/// Fetch the questions available for the quiz from the landscape provided.
///
/// Only successful results are cached, so a failed fetch is retried on the
/// next call.
#[cached(sync_writes = true)]
async fn fetch_questions(landscape_url: String) -> Result<Vec<Question>, String> {
    // Request the quiz data
    let (status, body) = get_text(&quiz_data_url(&landscape_url)).await?;

    // Check the request succeeded and parse the questions
    if status != 200 {
        return Err(format!("unexpected status code getting quiz data: {status}"));
    }
    parse_questions(&body)
}

/// Get the body of the url provided, along with the response status code.
#[cfg(not(test))]
async fn get_text(url: &str) -> Result<(u16, String), String> {
    let resp = Request::get(url).send().await.map_err(to_str)?;
    let body = resp.text().await.map_err(to_str)?;
    Ok((resp.status(), body))
}

/// Get the body of the url provided, along with the response status code
/// (native transport used in tests).
#[cfg(test)]
async fn get_text(url: &str) -> Result<(u16, String), String> {
    let resp = reqwest::get(url).await.map_err(to_str)?;
    let status = resp.status().as_u16();
    let body = resp.text().await.map_err(to_str)?;
    Ok((status, body))
}

/// Parse the quiz questions provided as a JSON array.
fn parse_questions(body: &str) -> Result<Vec<Question>, String> {
    serde_json::from_str(body).map_err(|err| format!("invalid quiz data: {err}"))
}

/// Build the url of the quiz data file of the landscape provided.
fn quiz_data_url(landscape_url: &str) -> String {
    format!(
        "{}/{DATASETS_PATH}/{QUIZ_DATASET_FILE}",
        landscape_url.trim_end_matches('/')
    )
}

/// Convert the error provided to a string, using its `Display` format.
fn to_str<E: std::fmt::Display>(err: E) -> String {
    err.to_string()
}

#[cfg(test)]
mod tests;

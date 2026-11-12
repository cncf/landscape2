//! This module defines the types used to represent the landscape games data
//! that must be provided from a YAML file (games.yml).

use std::{collections::HashSet, path::PathBuf};

use anyhow::{Context, Result, bail, format_err};
use clap::Args;
use serde::{Deserialize, Serialize};
use tracing::instrument;
#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::wasm_bindgen;

use crate::{
    data::LandscapeData,
    source::{self, Parsed, SourceKind, parse_yaml},
};

/// Maximum number of options a question can have.
const MAX_QUESTION_OPTIONS: usize = 4;

/// Maximum number of characters a question title can have.
const MAX_QUESTION_TITLE_LEN: usize = 200;

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

    /// Read the raw landscape games from the file or url provided, preferring
    /// the file. Returns `None` when neither is set.
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or the url cannot be fetched.
    pub async fn read_raw(&self) -> Result<Option<String>> {
        source::read_raw(
            SourceKind::Games,
            self.games_file.as_deref(),
            self.games_url.as_deref(),
        )
        .await
    }
}

/// Landscape games data.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct LandscapeGames {
    /// Quiz game content.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quiz: Option<Quiz>,
}

impl LandscapeGames {
    /// Create a new landscape games instance from the source provided, logging
    /// the warnings found while parsing it. Returns `None` when no source is
    /// set.
    ///
    /// # Errors
    /// Returns an error if the file or URL cannot be read, or the data is
    /// invalid.
    #[instrument(skip_all, err)]
    pub async fn new(src: &GamesSource) -> Result<Option<Self>> {
        // Read the raw landscape games from the source
        let Some(raw) = src.read_raw().await? else {
            return Ok(None);
        };

        // Parse and validate the landscape games
        let games = LandscapeGames::new_from_yaml(&raw)?.into_value_logging_warnings(SourceKind::Games);

        Ok(Some(games))
    }

    /// Check that every quiz question option matches an item in the landscape
    /// data provided. Options are matched the same way the UI does it: by item
    /// name, and by category and subcategory when they are provided, ignoring
    /// case.
    ///
    /// # Errors
    /// Returns an error naming the question and the option that does not match
    /// any item.
    pub fn check_items(&self, landscape_data: &LandscapeData) -> Result<()> {
        let Some(quiz) = &self.quiz else {
            return Ok(());
        };

        // Prepare the lowercased name, category and subcategory of each item
        let items: Vec<(String, String, String)> = landscape_data
            .items
            .iter()
            .map(|item| {
                (
                    item.name.to_lowercase(),
                    item.category.to_lowercase(),
                    item.subcategory.to_lowercase(),
                )
            })
            .collect();

        // Check every option resolves to at least one item
        for (i, question) in quiz.questions.iter().enumerate() {
            for (j, option) in question.options.iter().enumerate() {
                let (name, category, subcategory) = option.key();
                let found = items.iter().any(|(item_name, item_category, item_subcategory)| {
                    *item_name == name
                        && category.as_ref().is_none_or(|category| category == item_category)
                        && subcategory.as_ref().is_none_or(|subcategory| subcategory == item_subcategory)
                });
                if !found {
                    return Err(format_err!(
                        "option [{j}] {} not found in the landscape data",
                        option.describe()
                    ))
                    .context(format!("question [{i}] is not valid"));
                }
            }
        }

        Ok(())
    }

    /// Create a new landscape games instance from the raw data provided,
    /// reporting the unknown keys found as warnings.
    ///
    /// # Errors
    /// Returns an error if the data is not valid YAML or does not pass the
    /// validation.
    pub fn new_from_yaml(raw: &str) -> Result<Parsed<Self>> {
        LandscapeGames::parse(raw).with_context(|| SourceKind::Games.invalid_file_context())
    }

    /// Parse and validate the raw games data provided.
    fn parse(raw: &str) -> Result<Parsed<Self>> {
        // Parse the raw games data, collecting the unknown keys warnings
        let parsed = parse_yaml::<LandscapeGames>(raw)?;

        // Validate the games data
        parsed.value.validate()?;

        Ok(parsed)
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

        // A quiz without questions cannot be played
        if quiz.questions.is_empty() {
            bail!("quiz must have at least one question");
        }

        for (i, question) in quiz.questions.iter().enumerate() {
            let ctx = || format!("question [{i}] is not valid");

            // Title cannot be empty
            if question.title.trim().is_empty() {
                return Err(format_err!("title cannot be empty")).with_context(ctx);
            }

            // Title cannot be longer than the maximum number of characters
            if question.title.chars().count() > MAX_QUESTION_TITLE_LEN {
                return Err(format_err!(
                    "title cannot be longer than {MAX_QUESTION_TITLE_LEN} characters"
                ))
                .with_context(ctx);
            }

            // Maximum options
            if question.options.len() > MAX_QUESTION_OPTIONS {
                return Err(format_err!("must have at most {MAX_QUESTION_OPTIONS} options"))
                    .with_context(ctx);
            }

            // Minimum options
            if question.options.len() < MIN_QUESTION_OPTIONS {
                return Err(format_err!("must have at least {MIN_QUESTION_OPTIONS} options"))
                    .with_context(ctx);
            }

            // One option must be marked as correct (and only one)
            let correct_options = question.options.iter().filter(|o| o.correct).count();
            if correct_options != 1 {
                return Err(format_err!("must have exactly one correct option")).with_context(ctx);
            }

            // Options, which must be unique ignoring case
            let mut options_seen = HashSet::new();
            for option in &question.options {
                // Item name cannot be empty
                if option.item.trim().is_empty() {
                    return Err(format_err!("item cannot be empty")).with_context(ctx);
                }

                // Category cannot be empty if provided
                if let Some(category) = &option.category
                    && category.trim().is_empty()
                {
                    return Err(format_err!("category cannot be empty if provided")).with_context(ctx);
                }

                // Subcategory cannot be empty if provided
                if let Some(subcategory) = &option.subcategory
                    && subcategory.trim().is_empty()
                {
                    return Err(format_err!("subcategory cannot be empty if provided")).with_context(ctx);
                }

                // Subcategory can only be provided along with a category
                if option.subcategory.is_some() && option.category.is_none() {
                    return Err(format_err!("subcategory cannot be provided without category"))
                        .with_context(ctx);
                }

                // Option cannot be duplicated
                if !options_seen.insert(option.key()) {
                    return Err(format_err!("duplicate option [{}]", option.item)).with_context(ctx);
                }
            }
        }

        Ok(())
    }
}

/// Quiz game data.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct Quiz {
    /// Questions, a subset of which is randomly picked for each quiz game.
    pub questions: Vec<Question>,
}

/// Quiz question details.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct Question {
    /// Answer options, shuffled on every quiz game.
    #[cfg_attr(feature = "wasm", wasm_bindgen(readonly, getter_with_clone))]
    pub options: Vec<QuestionOption>,
    /// Question title.
    #[cfg_attr(feature = "wasm", wasm_bindgen(readonly, getter_with_clone))]
    pub title: String,
}

/// Question option details.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts", derive(ts_rs::TS), ts(export_to = "core/", optional_fields))]
pub struct QuestionOption {
    /// Name of the landscape item this option refers to.
    #[cfg_attr(feature = "wasm", wasm_bindgen(readonly, getter_with_clone))]
    pub item: String,

    /// Category of the item, to avoid ambiguity when its name is not unique.
    #[cfg_attr(feature = "wasm", wasm_bindgen(readonly, getter_with_clone))]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,

    /// Whether this option is the correct one.
    #[cfg_attr(feature = "wasm", wasm_bindgen(readonly))]
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    #[cfg_attr(feature = "ts", ts(optional = nullable))]
    pub correct: bool,

    /// Subcategory of the item, to avoid ambiguity when its name is not unique.
    #[cfg_attr(feature = "wasm", wasm_bindgen(readonly, getter_with_clone))]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subcategory: Option<String>,
}

impl QuestionOption {
    /// Describe the item the option refers to, for error messages.
    fn describe(&self) -> String {
        match (&self.category, &self.subcategory) {
            (Some(category), Some(subcategory)) => format!(
                "item [{}] in category [{category}] / subcategory [{subcategory}]",
                self.item
            ),
            (Some(category), None) => format!("item [{}] in category [{category}]", self.item),
            _ => format!("item [{}]", self.item),
        }
    }

    /// Return the lowercased item, category and subcategory of the option,
    /// used to compare options and to match them against the landscape items
    /// ignoring case.
    fn key(&self) -> (String, Option<String>, Option<String>) {
        (
            self.item.to_lowercase(),
            self.category.as_deref().map(str::to_lowercase),
            self.subcategory.as_deref().map(str::to_lowercase),
        )
    }
}

#[cfg(test)]
mod tests;

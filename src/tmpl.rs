use crate::datasets::JsonString;
use askama::Template;

/// Template for the index document.
#[derive(Debug, Clone, Template)]
#[template(path = "index.html", escape = "none")]
pub(crate) struct Index<'a> {
    pub base_dataset: &'a JsonString,
}

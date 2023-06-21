//! This module defines some templates used during the generation of the
//! landscape static site.

use crate::datasets::Datasets;
use askama::Template;

/// Template for the index document.
#[derive(Debug, Clone, Template)]
#[template(path = "index.html", escape = "none")]
pub(crate) struct Index<'a> {
    pub datasets: &'a Datasets,
}

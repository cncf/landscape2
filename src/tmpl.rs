use crate::datasets::Datasets;
use askama::Template;

/// Template for the index document.
#[derive(Debug, Clone, Template)]
#[template(path = "index.html", escape = "none")]
pub(crate) struct Index<'a> {
    pub datasets: &'a Datasets,
}

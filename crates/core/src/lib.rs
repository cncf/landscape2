//! Landscape2 core functionality: the landscape sources (data, settings,
//! guide and games) parsing and validation, the data enrichment, and the
//! datasets and stats generated from them.

#![warn(clippy::all, clippy::pedantic)]
#![expect(clippy::doc_markdown, clippy::module_name_repetitions)]

pub mod data;
pub mod datasets;
pub mod games;
pub mod guide;
pub mod paths;
pub mod settings;
pub mod source;
pub mod stats;
pub mod util;

#[cfg(test)]
mod contract;

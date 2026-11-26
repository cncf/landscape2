#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::blocks_in_conditions,
    clippy::doc_markdown,
    clippy::module_name_repetitions
)]

pub mod build;
pub mod cli;
pub mod deploy;
pub mod new;
pub mod serve;
pub mod validate;

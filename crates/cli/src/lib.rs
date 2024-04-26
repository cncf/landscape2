#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::doc_markdown,
    clippy::blocks_in_conditions,
    clippy::module_name_repetitions
)]

pub mod build;
pub mod deploy;
pub mod new;
pub mod serve;
pub mod validate;

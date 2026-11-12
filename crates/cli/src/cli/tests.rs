use clap::CommandFactory;

use super::*;

#[test]
fn test_cli_command_is_consistent() {
    Cli::command().debug_assert();
}

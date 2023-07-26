use anyhow::{format_err, Result};
use std::process::Command;
use which::which;

fn main() -> Result<()> {
    // Tell Cargo to rerun this build script if the web app changes
    println!("cargo:rerun-if-changed=web/src");
    println!("cargo:rerun-if-changed=web/static");
    println!("cargo:rerun-if-changed=web/index.html");

    // Check if required external tools are available
    if which("yarn").is_err() {
        return Err(format_err!(
            "yarn not found in PATH (it is required to build the web application)"
        ));
    }

    // Build web application
    Command::new("yarn").args(["--cwd", "web", "install"]).output()?;
    Command::new("yarn").args(["--cwd", "web", "build"]).output()?;

    Ok(())
}

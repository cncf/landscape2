use anyhow::{format_err, Result};
use std::process::{Command, Output};
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
    let error = |cmd: &str, output: Output| {
        Err(format_err!(
            "\n\n> {cmd} (stderr)\n{}\n> {cmd} (stdout)\n{}\n",
            String::from_utf8(output.stderr)?,
            String::from_utf8(output.stdout)?
        ))
    };
    let output = Command::new("yarn").args(["--cwd", "web", "install"]).output()?;
    if !output.status.success() {
        return error("yarn install", output);
    }
    let output = Command::new("yarn").args(["--cwd", "web", "build"]).output()?;
    if !output.status.success() {
        return error("yarn build", output);
    }

    Ok(())
}

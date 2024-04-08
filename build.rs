use anyhow::{bail, Result};
use std::process::Command;
use which::which;

fn main() -> Result<()> {
    // Tell Cargo to rerun this build script if the source changes
    println!("cargo:rerun-if-changed=embed/src");
    println!("cargo:rerun-if-changed=embed/embed.html");
    println!("cargo:rerun-if-changed=web/src");
    println!("cargo:rerun-if-changed=web/static");
    println!("cargo:rerun-if-changed=web/index.html");

    // Check if required external tools are available
    if which("yarn").is_err() {
        bail!("yarn not found in PATH (it is required to build the web application)");
    }

    // Build embeddable views
    yarn(&["--cwd", "embed", "install"])?;
    yarn(&["--cwd", "embed", "build"])?;

    // Build web application
    yarn(&["--cwd", "web", "install"])?;
    yarn(&["--cwd", "web", "build"])?;

    Ok(())
}

/// Run yarn command with the provided arguments.
fn yarn(args: &[&str]) -> Result<()> {
    // Setup command based on the target OS
    let mut cmd;
    if cfg!(target_os = "windows") {
        cmd = Command::new("cmd");
        cmd.args(["/C", "yarn"]);
    } else {
        cmd = Command::new("yarn");
    }
    cmd.args(args);

    // Run command and check output
    let output = cmd.output()?;
    if !output.status.success() {
        bail!(
            "\n\n> {cmd:?} (stderr)\n{}\n> {cmd:?} (stdout)\n{}\n",
            String::from_utf8(output.stderr)?,
            String::from_utf8(output.stdout)?
        );
    }
    Ok(())
}

use anyhow::{bail, Result};
use std::{
    path::{Path, PathBuf},
    process::Command,
};
use which::which;

fn main() -> Result<()> {
    // Tell Cargo to rerun this build script if the source changes
    println!("cargo:rerun-if-changed=../wasm/overlay");
    println!("cargo:rerun-if-changed=../wasm/quiz");
    println!("cargo:rerun-if-changed=../../ui/common/src");
    println!("cargo:rerun-if-changed=../../ui/embed/src");
    println!("cargo:rerun-if-changed=../../ui/embed/embed.html");
    println!("cargo:rerun-if-changed=../../ui/embed-item/public/embed-item.js");
    println!("cargo:rerun-if-changed=../../ui/embed-item/src");
    println!("cargo:rerun-if-changed=../../ui/embed-item/embed-item.html");
    println!("cargo:rerun-if-changed=../../ui/webapp/src");
    println!("cargo:rerun-if-changed=../../ui/webapp/static");
    println!("cargo:rerun-if-changed=../../ui/webapp/index.html");

    // Check if required external tools are available
    if which("cargo").is_err() {
        bail!("cargo not found in PATH (required)");
    }
    if which("wasm-pack").is_err() {
        bail!("wasm-pack not found in PATH (required to build the wasm modules)");
    }
    if which("yarn").is_err() {
        bail!("yarn not found in PATH (required to build the web application)");
    }

    // Build overlay wasm module
    let mut wasm_profile = "--dev";
    if let Ok(profile) = std::env::var("PROFILE") {
        if profile == "release" {
            wasm_profile = "--release";
        }
    };
    let wasm_target_dir = workspace_dir()?.join("target-wasm").to_string_lossy().to_string();
    run(
        "wasm-pack",
        &[
            "build",
            "--target",
            "web",
            "--out-dir",
            "../../../ui/webapp/wasm/overlay",
            wasm_profile,
            "../wasm/overlay",
            "--target-dir",
            &wasm_target_dir,
        ],
    )?;

    // Build quiz game wasm module
    run(
        "wasm-pack",
        &[
            "build",
            "--target",
            "web",
            "--out-dir",
            "../../../ui/webapp/wasm/quiz",
            wasm_profile,
            "../wasm/quiz",
            "--target-dir",
            &wasm_target_dir,
        ],
    )?;

    // Build common
    run("yarn", &["--cwd", "../../ui/common", "install"])?;
    run("yarn", &["--cwd", "../../ui/common", "build"])?;

    // Build embed
    run("yarn", &["--cwd", "../../ui/embed", "install"])?;
    run("yarn", &["--cwd", "../../ui/embed", "build"])?;

    // Build embed item
    run("yarn", &["--cwd", "../../ui/embed-item", "install"])?;
    run("yarn", &["--cwd", "../../ui/embed-item", "build"])?;

    // Build web application
    run("yarn", &["--cwd", "../../ui/webapp", "install"])?;
    run("yarn", &["--cwd", "../../ui/webapp", "build"])?;

    Ok(())
}

/// Return workspace directory.
fn workspace_dir() -> Result<PathBuf> {
    // Run `cargo locate-project` command to get workspace directory
    let mut cmd = new_cmd("cargo");
    cmd.args(["locate-project", "--workspace", "--message-format=plain"]);
    let output = cmd.output()?;
    if !output.status.success() {
        bail!(
            "error getting workspace directory: {}",
            String::from_utf8(output.stderr)?
        );
    }

    // Extract workspace directory from `cargo locate-project` output
    let workspace_dir = Path::new(String::from_utf8(output.stdout)?.trim())
        .parent()
        .expect("parent to exist")
        .to_path_buf();

    Ok(workspace_dir)
}

/// Helper function to run a command.
fn run(program: &str, args: &[&str]) -> Result<()> {
    // Setup command
    let mut cmd = new_cmd(program);
    cmd.args(args);

    // Execute it and check output
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

/// Helper function to setup a command based on the target OS.
fn new_cmd(program: &str) -> Command {
    if cfg!(target_os = "windows") {
        let mut cmd = Command::new("cmd");
        cmd.args(["/C", program]);
        cmd
    } else {
        Command::new(program)
    }
}

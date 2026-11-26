//! Build script of the landscape2 CLI tool. It builds the wasm modules and the
//! UI packages embedded in the binary, unless the UI build is skipped.

use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};

use anyhow::{Context, Result, bail};
use which::which;

/// Askama templates read from the UI build output, paired with the source
/// entry each one is built from. The source entries carry the same template
/// expressions as the built files, so they can stand in for them.
const BUILT_TEMPLATES: [(&str, &str); 2] = [
    (
        "../../ui/embed-item/dist/embed-item.html",
        "../../ui/embed-item/embed-item.html",
    ),
    ("../../ui/webapp/dist/index.html", "../../ui/webapp/index.html"),
];

/// Directories embedded in the binary with `RustEmbed`.
const EMBEDDED_DIRS: [&str; 3] = [
    "../../ui/embed/dist",
    "../../ui/embed-item/dist",
    "../../ui/webapp/dist",
];

/// Paths whose changes make Cargo run this build script again: the inputs of
/// the wasm modules (including the core crate both depend on and the lock
/// file), and the sources, configuration and entry points of the UI packages.
///
/// Cargo runs the build script on every build when one of these paths does
/// not exist, so every path listed must exist.
const RERUN_IF_CHANGED_PATHS: &[&str] = &[
    "../../Cargo.lock",
    "../../ui/common/package.json",
    "../../ui/common/src",
    "../../ui/common/tsconfig.json",
    "../../ui/common/tsconfig.node.json",
    "../../ui/common/yarn.lock",
    "../../ui/embed-item/embed-item.html",
    "../../ui/embed-item/package.json",
    "../../ui/embed-item/public",
    "../../ui/embed-item/src",
    "../../ui/embed-item/tsconfig.json",
    "../../ui/embed-item/tsconfig.node.json",
    "../../ui/embed-item/vite.config.ts",
    "../../ui/embed-item/yarn.lock",
    "../../ui/embed/embed.html",
    "../../ui/embed/package.json",
    "../../ui/embed/public",
    "../../ui/embed/src",
    "../../ui/embed/tsconfig.json",
    "../../ui/embed/tsconfig.node.json",
    "../../ui/embed/vite.config.ts",
    "../../ui/embed/yarn.lock",
    "../../ui/kiosk/kiosk.html",
    "../../ui/kiosk/kiosk.js",
    "../../ui/webapp/index.html",
    "../../ui/webapp/package.json",
    "../../ui/webapp/public",
    "../../ui/webapp/src",
    "../../ui/webapp/tsconfig.json",
    "../../ui/webapp/tsconfig.node.json",
    "../../ui/webapp/vite.config.ts",
    "../../ui/webapp/yarn.lock",
    "../core/Cargo.toml",
    "../core/src",
    "../wasm/overlay/Cargo.toml",
    "../wasm/overlay/src",
    "../wasm/quiz/Cargo.toml",
    "../wasm/quiz/src",
];

/// Environment variable Cargo sets to the rustc workspace wrapper, which is
/// `clippy-driver` when running `cargo clippy`.
const RUSTC_WORKSPACE_WRAPPER_ENV_VAR: &str = "RUSTC_WORKSPACE_WRAPPER";

/// Environment variable that skips the wasm and UI builds when set to `1`
/// (for example for rust-analyzer, as `cargo check` cannot be detected).
const SKIP_UI_BUILD_ENV_VAR: &str = "LANDSCAPE2_SKIP_UI_BUILD";

fn main() -> Result<()> {
    // Tell Cargo to rerun this build script if its inputs change
    for path in RERUN_IF_CHANGED_PATHS {
        println!("cargo:rerun-if-changed={path}");
    }
    println!("cargo:rerun-if-env-changed={RUSTC_WORKSPACE_WRAPPER_ENV_VAR}");
    println!("cargo:rerun-if-env-changed={SKIP_UI_BUILD_ENV_VAR}");

    // Skip the wasm and UI builds when requested, before checking the tools
    // they need, creating the compile-time inputs that are missing
    if let Some(reason) = skip_reason() {
        println!(
            "cargo:warning=skipping the wasm and UI builds ({reason}): a binary built this way \
             lacks the web application unless it was built before"
        );
        for path in create_missing_compile_inputs()? {
            println!("cargo:warning=created stub {}", path.display());
        }

        // Watch the compile-time inputs too, so deleting one runs this build
        // script again to recreate it. The full build does not watch them, as
        // it rewrites them on every run
        for dir in EMBEDDED_DIRS {
            println!("cargo:rerun-if-changed={dir}");
        }
        for (template, _) in BUILT_TEMPLATES {
            println!("cargo:rerun-if-changed={template}");
        }
        return Ok(());
    }

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

    // Prepare wasm profile and target directory
    let mut wasm_profile = "--dev";
    if let Ok(profile) = env::var("PROFILE")
        && profile == "release"
    {
        wasm_profile = "--release";
    }
    let wasm_target_dir = workspace_dir()?.join("target-wasm").to_string_lossy().to_string();

    // Build overlay wasm module
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

    // Install common dependencies (common is not built: the other packages
    // compile its source, which needs them)
    run(
        "yarn",
        &["--cwd", "../../ui/common", "install", "--frozen-lockfile"],
    )?;

    // Build embed
    run(
        "yarn",
        &["--cwd", "../../ui/embed", "install", "--frozen-lockfile"],
    )?;
    run("yarn", &["--cwd", "../../ui/embed", "build"])?;

    // Build embed item
    run(
        "yarn",
        &["--cwd", "../../ui/embed-item", "install", "--frozen-lockfile"],
    )?;
    run("yarn", &["--cwd", "../../ui/embed-item", "build"])?;

    // Build web application
    run(
        "yarn",
        &["--cwd", "../../ui/webapp", "install", "--frozen-lockfile"],
    )?;
    run("yarn", &["--cwd", "../../ui/webapp", "build"])?;

    Ok(())
}

/// Create the compile-time inputs read from the UI build output that are
/// missing, returning their paths. Existing ones are never overwritten, so a
/// real build stays intact. The next full build replaces the stubs created,
/// as Vite empties its output directory.
fn create_missing_compile_inputs() -> Result<Vec<PathBuf>> {
    let mut created = vec![];

    // Create the directories embedded with RustEmbed
    for dir in EMBEDDED_DIRS {
        let dir = Path::new(dir);
        if !dir.exists() {
            fs::create_dir_all(dir).with_context(|| format!("error creating {}", dir.display()))?;
            created.push(dir.to_path_buf());
        }
    }

    // Copy the source entries of the templates read from the build output
    for (template, source) in BUILT_TEMPLATES {
        let template = Path::new(template);
        if !template.exists() {
            fs::copy(source, template).with_context(|| format!("error copying {source}"))?;
            created.push(template.to_path_buf());
        }
    }

    Ok(created)
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

/// Helper function to run a command.
fn run(program: &str, args: &[&str]) -> Result<()> {
    // Setup command
    let mut cmd = new_cmd(program);
    cmd.args(args);

    // Execute it and check output
    let output = cmd.output().with_context(|| format!("error running {cmd:?}"))?;
    if !output.status.success() {
        bail!(
            "\n\n> {cmd:?} (stderr)\n{}\n> {cmd:?} (stdout)\n{}\n",
            String::from_utf8_lossy(&output.stderr),
            String::from_utf8_lossy(&output.stdout)
        );
    }

    Ok(())
}

/// Return the reason to skip the wasm and UI builds, if they must be skipped:
/// when `LANDSCAPE2_SKIP_UI_BUILD` is `1`, or when running clippy.
fn skip_reason() -> Option<String> {
    if env::var(SKIP_UI_BUILD_ENV_VAR).is_ok_and(|value| value == "1") {
        return Some(format!("{SKIP_UI_BUILD_ENV_VAR}=1"));
    }
    if let Ok(wrapper) = env::var(RUSTC_WORKSPACE_WRAPPER_ENV_VAR)
        && Path::new(&wrapper).file_stem().is_some_and(|stem| stem == "clippy-driver")
    {
        return Some("running clippy".to_string());
    }
    None
}

/// Return workspace directory.
fn workspace_dir() -> Result<PathBuf> {
    // Run `cargo locate-project` command to get workspace directory
    let mut cmd = new_cmd("cargo");
    cmd.args(["locate-project", "--workspace", "--message-format=plain"]);
    let output = cmd.output().context("error running cargo locate-project")?;
    if !output.status.success() {
        bail!(
            "error getting workspace directory: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    // Extract workspace directory from `cargo locate-project` output
    let manifest_path = String::from_utf8_lossy(&output.stdout);
    let workspace_dir = Path::new(manifest_path.trim())
        .parent()
        .context("workspace manifest path has no parent directory")?
        .to_path_buf();

    Ok(workspace_dir)
}

use anyhow::Result;
use build::build;
use clap::{Args, Parser, Subcommand};
use std::path::PathBuf;

mod build;
mod datasets;
mod landscape;
mod tmpl;

#[derive(Parser)]
#[command(about, version)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Build landscape static site.
    Build(BuildArgs),
}

#[derive(Args)]
struct BuildArgs {
    /// Datasource.
    #[command(flatten)]
    data_source: DataSource,

    /// Logos source
    #[command(flatten)]
    logos_source: LogosSource,

    /// Output directory to write files to.
    #[arg(long)]
    output_dir: PathBuf,
}

#[derive(Args)]
#[group(required = true, multiple = false)]
struct DataSource {
    /// Landscape YAML local file path.
    #[arg(long)]
    data_file: Option<PathBuf>,

    /// Landscape YAML file url.
    #[arg(long)]
    data_url: Option<String>,
}

#[derive(Args)]
#[group(required = true, multiple = false)]
struct LogosSource {
    /// Local path where the logos are stored.
    #[arg(long)]
    logos_path: Option<PathBuf>,

    /// Base URL where the logos are hosted.
    #[arg(long)]
    logos_url: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    // Setup logging
    if std::env::var_os("RUST_LOG").is_none() {
        std::env::set_var("RUST_LOG", "landscape2=debug")
    }
    tracing_subscriber::fmt::init();

    // Run command
    match &cli.command {
        Command::Build(args) => build(args).await?,
    }

    Ok(())
}

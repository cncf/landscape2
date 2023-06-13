use crate::{
    datasets::{Datasets, JsonString},
    landscape::Landscape,
    tmpl, BuildArgs, Datasource,
};
use anyhow::Result;
use askama::Template;
use rust_embed::RustEmbed;
use std::{
    fs::{create_dir_all, File},
    io::Write,
    path::Path,
    time::Instant,
};
use tracing::{debug, info, instrument};

/// Embed static assets into binary.
#[derive(RustEmbed)]
#[folder = "assets"]
struct StaticAssets;

/// Build landscape static site.
#[instrument(skip_all, err)]
pub(crate) async fn build(args: &BuildArgs) -> Result<()> {
    info!("building landscape site..");
    let start = Instant::now();

    prepare_output_dir(&args.output_dir)?;
    let landscape = get_landscape(&args.ds).await?;
    let datasets = generate_datasets(&landscape)?;
    render_index(&args.output_dir, &datasets.base)?;
    copy_static_assets(&args.output_dir)?;

    let duration = start.elapsed().as_secs_f64();
    info!("landscape site built! (took: {:.3}s)", duration);
    Ok(())
}

/// Prepare output directory.
#[instrument(fields(output_dir = ?output_dir), skip_all, err)]
fn prepare_output_dir(output_dir: &Path) -> Result<()> {
    if !output_dir.exists() {
        debug!("creating output directory");
        create_dir_all(output_dir)?;
    }
    Ok(())
}

/// Create a new landscape instance from the datasource provided.
#[instrument(skip_all, err)]
async fn get_landscape(ds: &Datasource) -> Result<Landscape> {
    let landscape = if let Some(file) = &ds.datasource_file {
        debug!(?file, "getting landscape information from file");
        Landscape::new_from_file(file)
    } else {
        debug!(url = ?ds.datasource_url.as_ref().unwrap(), "getting landscape information from url");
        Landscape::new_from_url(ds.datasource_url.as_ref().unwrap()).await
    }?;
    Ok(landscape)
}

/// Generate datasets.
#[instrument(skip_all, err)]
fn generate_datasets(landscape: &Landscape) -> Result<Datasets> {
    debug!("generating datasets");
    let datasets = Datasets::new(landscape)?;
    Ok(datasets)
}

/// Render index file and write it to the output directory.
#[instrument(skip_all, err)]
fn render_index(output_dir: &Path, base_dataset: &JsonString) -> Result<()> {
    debug!("rendering index.html file");
    let index = tmpl::Index { base_dataset }.render()?;
    let mut file = File::create(output_dir.join("index.html"))?;
    file.write_all(index.as_bytes())?;
    Ok(())
}

/// Copy static assets files to the output directory.
#[instrument(skip_all, err)]
fn copy_static_assets(output_dir: &Path) -> Result<()> {
    for asset_path in StaticAssets::iter() {
        if let Some(embedded_file) = StaticAssets::get(&asset_path) {
            debug!(?asset_path, "copying file");
            if let Some(parent_path) = Path::new(asset_path.as_ref()).parent() {
                create_dir_all(output_dir.join(parent_path))?;
            }
            let mut file = File::create(output_dir.join(asset_path.as_ref()))?;
            file.write_all(&embedded_file.data)?;
        }
    }
    Ok(())
}

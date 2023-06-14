use crate::{datasets::Datasets, landscape::Landscape, tmpl, BuildArgs, DataSource, LogosSource};
use anyhow::Result;
use askama::Template;
use lazy_static::lazy_static;
use regex::Regex;
use rust_embed::RustEmbed;
use sha2::{Digest, Sha256};
use std::{
    fs::{self, create_dir, create_dir_all, File},
    io::Write,
    path::Path,
    time::Instant,
};
use tracing::{debug, info, instrument};

/// Path where the logos will be written to in the output directory.
const LOGOS_PATH: &str = "logos";

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
    let mut landscape = get_landscape(&args.data_source).await?;
    prepare_logos(&args.logos_source, &mut landscape, &args.output_dir).await?;
    let datasets = generate_datasets(&landscape)?;
    render_index(&datasets, &args.output_dir)?;
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
    let logos_path = output_dir.join(LOGOS_PATH);
    if !logos_path.exists() {
        create_dir(logos_path)?;
    }
    Ok(())
}

/// Create a new landscape instance from the datasource provided.
#[instrument(skip_all, err)]
async fn get_landscape(data_source: &DataSource) -> Result<Landscape> {
    let landscape = if let Some(file) = &data_source.data_file {
        debug!(?file, "getting landscape information from file");
        Landscape::new_from_file(file)
    } else {
        debug!(url = ?data_source.data_url.as_ref().unwrap(), "getting landscape information from url");
        Landscape::new_from_url(data_source.data_url.as_ref().unwrap()).await
    }?;
    Ok(landscape)
}

lazy_static! {
    /// Regular expression used to clean SVG logos' title.
    static ref SVG_TITLE: Regex = Regex::new("<title>.*</title>",).expect("exprs in SVG_TITLE to be valid");
}

/// Prepare logos and copy them to the output directory.
#[instrument(skip_all, err)]
async fn prepare_logos(
    logos_source: &LogosSource,
    landscape: &mut Landscape,
    output_dir: &Path,
) -> Result<()> {
    // Helper function to get the logo content from the corresponding source.
    #[instrument(fields(?file_name), skip_all, err)]
    async fn get_logo_svg(logos_source: &LogosSource, file_name: &str) -> Result<String> {
        let svg = if let Some(path) = &logos_source.logos_path {
            fs::read_to_string(path.join(file_name))?
        } else {
            reqwest::get(logos_source.logos_url.as_ref().unwrap()).await?.text().await?
        };
        Ok(svg)
    }

    debug!("preparing logos");
    for category in landscape.categories.iter_mut() {
        for subcategory in category.subcategories.iter_mut() {
            for item in subcategory.items.iter_mut() {
                // Get logo SVG
                let svg = match get_logo_svg(logos_source, &item.logo).await {
                    Ok(svg) => svg,
                    Err(_) => {
                        item.logo = "".to_string();
                        continue;
                    }
                };

                // Remove SVG title if present
                let svg = SVG_TITLE.replace(&svg, "");

                // Calculate SVG file digest
                let digest = hex::encode(Sha256::digest(svg.as_bytes()));

                // Copy logo to output dir using the digest(+.svg) as filename
                let logo = format!("{}.svg", digest);
                let mut file = File::create(output_dir.join(LOGOS_PATH).join(&logo))?;
                file.write_all(svg.as_bytes())?;

                // Update logo field in landscape entry (to digest)
                item.logo = format!("{}/{}", LOGOS_PATH, logo);
            }
        }
    }

    Ok(())
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
fn render_index(datasets: &Datasets, output_dir: &Path) -> Result<()> {
    debug!("rendering index.html file");
    let index = tmpl::Index { datasets }.render()?;
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
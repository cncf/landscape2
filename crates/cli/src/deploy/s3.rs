//! This module defines the functionality of the deploy CLI subcommand for the
//! AWS S3 provider.

use std::{
    collections::{HashMap, HashSet},
    fmt::Write,
    fs,
    path::{Component, Path, PathBuf},
    time::Instant,
};

use anyhow::{Context, Result, bail};
use aws_config::{BehaviorVersion, SdkConfig};
use aws_sdk_s3::{
    config::ProvideCredentials,
    primitives::ByteStream,
    types::{Delete, ObjectIdentifier},
};
use futures::stream::{self, StreamExt};
use md5::{Digest, Md5};
use mime_guess::mime;
use tracing::{debug, info, instrument};
use walkdir::WalkDir;

use crate::serve::cache_control_for;

/// Maximum number of objects deleted in a single request (S3 limit).
const DELETE_OBJECTS_BATCH_SIZE: usize = 1000;

/// File name of the index document.
const INDEX_DOCUMENT: &str = "index.html";

/// Number of files to upload concurrently.
const UPLOAD_FILES_CONCURRENCY: usize = 50;

/// Type alias to represent an object's checksum.
type Checksum = String;

/// Type alias to represent an object's key.
type Key = String;

/// AWS S3 provider arguments.
#[derive(clap::Args)]
pub struct Args {
    /// Bucket to copy the landscape website files to.
    #[arg(long)]
    pub bucket: String,

    /// Location of the landscape website files (build subcommand output).
    #[arg(long)]
    pub landscape_dir: PathBuf,

    /// Delete the objects in the bucket that are not part of the landscape
    /// website files, once the index document has been uploaded. Warning:
    /// clients still holding a previous index document may fail to load the
    /// hashed assets it references.
    #[arg(long, default_value_t = false)]
    pub delete_stale: bool,
}

/// Deploy landscape website to AWS S3.
///
/// The AWS region and credentials are resolved from the standard AWS sources
/// (environment variables, shared config and credentials files and their
/// profiles, SSO, or container and instance roles). Files are uploaded with
/// the same `Cache-Control` header the `serve` subcommand uses, and the index
/// document is uploaded last, once all the other files have been uploaded
/// successfully.
///
/// Change detection compares the MD5 digest of each local file with the ETag
/// of the deployed object. Objects encrypted with SSE-KMS or uploaded in
/// multiple parts do not have their MD5 digest as ETag, so they are uploaded
/// again on every run.
///
/// # Errors
/// Returns an error if the landscape directory has no index document, the AWS
/// region or credentials cannot be resolved, the source files cannot be read,
/// or listing, uploading or deleting objects fails.
#[instrument(skip_all, err)]
pub async fn deploy(args: &Args) -> Result<()> {
    info!("deploying landscape website..");
    let start = Instant::now();

    // Check the landscape directory is a build output
    let index_file = args.landscape_dir.join(INDEX_DOCUMENT);
    if !index_file.is_file() {
        bail!(
            "{} is not a landscape build output ({INDEX_DOCUMENT} not found)",
            args.landscape_dir.display()
        );
    }

    // Setup AWS S3 client, checking the region and credentials can be resolved
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    validate_aws_config(&config).await?;
    let s3_client = aws_sdk_s3::Client::new(&config);

    // Collect the landscape website files to deploy
    let files = collect_files(&args.landscape_dir)?;

    // Get objects already deployed
    let deployed_objects = get_deployed_objects(&s3_client, &args.bucket).await?;

    // Upload landscape website files (except index document)
    upload_objects(&s3_client, &args.bucket, &files, &deployed_objects).await?;

    // Upload index document if all the other files were uploaded successfully
    upload_index_document(
        &s3_client,
        &args.bucket,
        &index_file,
        deployed_objects.get(INDEX_DOCUMENT),
    )
    .await?;

    // Delete the deployed objects that are no longer part of the website
    if args.delete_stale {
        let local_keys: HashSet<Key> = files.into_keys().collect();
        let stale_keys = stale_keys(&deployed_objects, &local_keys);
        info!(count = stale_keys.len(), "deleting stale objects..");
        delete_objects(&s3_client, &args.bucket, &stale_keys).await?;
    }

    let duration = start.elapsed().as_secs_f64();
    info!("landscape website deployed! (took: {:.3}s)", duration);

    Ok(())
}

/// Collect the files in the landscape directory to deploy, returning their
/// object key and path. Hidden files (any path component starting with a dot)
/// are skipped.
fn collect_files(landscape_dir: &Path) -> Result<HashMap<Key, PathBuf>> {
    let mut files = HashMap::new();
    for entry in WalkDir::new(landscape_dir) {
        let entry = entry.with_context(|| format!("error reading directory {}", landscape_dir.display()))?;
        if !entry.file_type().is_file() {
            continue;
        }
        if let Some(key) = object_key(landscape_dir, entry.path()) {
            files.insert(key, entry.into_path());
        }
    }
    Ok(files)
}

/// Delete the objects provided from the S3 bucket, in batches.
#[instrument(skip_all, err)]
async fn delete_objects(s3_client: &aws_sdk_s3::Client, bucket: &str, keys: &[Key]) -> Result<()> {
    for batch in keys.chunks(DELETE_OBJECTS_BATCH_SIZE) {
        // Prepare the batch delete request
        let objects = batch
            .iter()
            .map(|key| ObjectIdentifier::builder().key(key).build())
            .collect::<Result<Vec<_>, _>>()?;
        let delete = Delete::builder().set_objects(Some(objects)).quiet(true).build()?;

        // Delete the batch, failing when any of its objects was not deleted
        let output = s3_client
            .delete_objects()
            .bucket(bucket)
            .delete(delete)
            .send()
            .await
            .context("error deleting stale objects")?;
        if !output.errors().is_empty() {
            let mut errors = String::new();
            for error in output.errors() {
                let key = error.key().unwrap_or_default();
                let message = error.message().unwrap_or_default();
                let _ = writeln!(errors, "- error deleting object {key}: {message}");
            }
            bail!("{errors}");
        }

        debug!(count = batch.len(), "stale objects deleted");
    }

    Ok(())
}

/// Get deployed objects returning their key and checksum.
#[instrument(skip_all, err)]
async fn get_deployed_objects(
    s3_client: &aws_sdk_s3::Client,
    bucket: &str,
) -> Result<HashMap<Key, Option<Checksum>>> {
    let mut deployed_objects = HashMap::new();

    let mut continuation_token = None;
    loop {
        let mut request = s3_client.list_objects_v2().bucket(bucket);
        if let Some(token) = continuation_token {
            request = request.continuation_token(token);
        }
        let output = request.send().await?;
        if let Some(objects) = output.contents {
            for object in objects {
                let Some(key) = object.key else { continue };
                let checksum = object.e_tag.map(|etag| etag.trim_matches('"').to_string());
                deployed_objects.insert(key, checksum);
            }
        }
        if !output.is_truncated.unwrap_or(false) {
            break;
        }
        continuation_token = output.next_continuation_token;
    }

    Ok(deployed_objects)
}

/// Calculate the MD5 digest of a file on the blocking thread pool.
async fn hash_file(file: &Path) -> Result<String> {
    let file = file.to_path_buf();
    tokio::task::spawn_blocking(move || md5sum(&file)).await?
}

/// Calculate the MD5 digest of a file.
fn md5sum(path: &Path) -> Result<String> {
    let mut hasher = Md5::new();
    hasher.update(fs::read(path).with_context(|| format!("error reading file {}", path.display()))?);
    let result = hasher.finalize();

    let mut checksum = String::with_capacity(result.len() * 2);
    for byte in result {
        write!(&mut checksum, "{byte:02x}")?;
    }

    Ok(checksum)
}

/// Check if a file must be uploaded, given its local MD5 digest and the
/// checksum of the deployed object (the outer `None` when the object is not
/// deployed, the inner one when its checksum is unknown).
fn needs_upload(local_md5: &str, remote: Option<&Option<Checksum>>) -> bool {
    !matches!(remote, Some(Some(remote_md5)) if remote_md5 == local_md5)
}

/// Returns the object key of a file located in the landscape directory, its
/// path components relative to that directory joined with `/`. Returns `None`
/// when the file is not inside the landscape directory or any of its path
/// components is hidden (starts with a dot).
fn object_key(landscape_dir: &Path, file: &Path) -> Option<String> {
    // Get the file path relative to the landscape directory
    let relative_path = file.strip_prefix(landscape_dir).ok()?;

    // Collect its path components, rejecting hidden and special ones
    let mut parts = Vec::new();
    for component in relative_path.components() {
        let Component::Normal(part) = component else {
            return None;
        };
        let part = part.to_string_lossy();
        if part.starts_with('.') {
            return None;
        }
        parts.push(part);
    }
    if parts.is_empty() {
        return None;
    }

    Some(parts.join("/"))
}

/// Upload a file to the S3 bucket, setting its content type and cache control
/// header from its key.
async fn put_object(s3_client: &aws_sdk_s3::Client, bucket: &str, key: &str, file: &Path) -> Result<()> {
    // Prepare object's body and content type
    let body = ByteStream::from_path(file)
        .await
        .with_context(|| format!("error reading file {}", file.display()))?;
    let content_type = mime_guess::from_path(key).first().unwrap_or(mime::APPLICATION_OCTET_STREAM);

    // Upload file
    s3_client
        .put_object()
        .bucket(bucket)
        .key(key)
        .body(body)
        .cache_control(cache_control_for(key))
        .content_type(content_type.essence_str())
        .send()
        .await
        .with_context(|| format!("error uploading file {key}"))?;

    debug!(?key, "file uploaded");
    Ok(())
}

/// Returns the keys of the deployed objects that are not in the local keys
/// provided, sorted.
fn stale_keys(deployed: &HashMap<Key, Option<Checksum>>, local: &HashSet<Key>) -> Vec<Key> {
    let mut keys: Vec<Key> = deployed.keys().filter(|key| !local.contains(*key)).cloned().collect();
    keys.sort();
    keys
}

/// Upload landscape website index document to S3 bucket, unless the deployed
/// copy is up to date.
#[instrument(skip_all, err)]
async fn upload_index_document(
    s3_client: &aws_sdk_s3::Client,
    bucket: &str,
    index_file: &Path,
    remote_checksum: Option<&Option<Checksum>>,
) -> Result<()> {
    // Check if the remote copy is up to date
    let checksum = hash_file(index_file).await?;
    if !needs_upload(&checksum, remote_checksum) {
        return Ok(());
    }

    // Upload file
    put_object(s3_client, bucket, INDEX_DOCUMENT, index_file).await
}

/// Upload landscape website files (except the index document) to S3 bucket,
/// skipping the ones whose deployed copy is up to date.
#[instrument(skip_all, err)]
async fn upload_objects(
    s3_client: &aws_sdk_s3::Client,
    bucket: &str,
    files: &HashMap<Key, PathBuf>,
    deployed_objects: &HashMap<Key, Option<Checksum>>,
) -> Result<()> {
    // Upload files to the bucket provided (the index document is uploaded at
    // the end, once all the other files have been uploaded successfully)
    let files = files.iter().filter(|(key, _)| key.as_str() != INDEX_DOCUMENT);
    let results: Vec<Result<()>> = stream::iter(files)
        .map(|(key, file)| async move {
            // Skip objects that haven't changed (only deployed ones are hashed)
            let remote_checksum = deployed_objects.get(key);
            if let Some(Some(_)) = remote_checksum
                && !needs_upload(&hash_file(file).await?, remote_checksum)
            {
                return Ok(());
            }

            // Upload file
            put_object(s3_client, bucket, key, file).await
        })
        .buffer_unordered(UPLOAD_FILES_CONCURRENCY)
        .collect()
        .await;

    // Process results
    let mut errors = String::new();
    for result in results {
        if let Err(err) = result {
            let _ = writeln!(errors, "- {err:?}");
        }
    }
    if !errors.is_empty() {
        bail!("{errors}");
    }

    Ok(())
}

/// Validate the AWS configuration has a region and its credentials can be
/// resolved.
#[instrument(skip_all, err)]
async fn validate_aws_config(config: &SdkConfig) -> Result<()> {
    // Check the region is configured
    if config.region().is_none() {
        bail!("AWS region not configured (set AWS_REGION or a region in the AWS profile)");
    }

    // Check the credentials can be resolved
    let Some(credentials_provider) = config.credentials_provider() else {
        bail!("AWS credentials provider not configured");
    };
    credentials_provider.provide_credentials().await.context(
        "error resolving AWS credentials (provide them using environment variables, a shared profile, SSO or an instance role)",
    )?;

    Ok(())
}

#[cfg(test)]
mod tests;

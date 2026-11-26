use std::{
    collections::{HashMap, HashSet},
    fs,
    path::Path,
};

use aws_config::SdkConfig;
use aws_sdk_s3::config::{Credentials, Region, SharedCredentialsProvider};
use tempfile::TempDir;

use super::*;

#[test]
fn test_md5sum_returns_known_digests() {
    // Setup an empty file in a temporary directory
    let tmp_dir = TempDir::new().unwrap();
    let path = tmp_dir.path().join("file.txt");
    fs::write(&path, b"").unwrap();

    // Check the digest of the empty file
    assert_eq!(md5sum(&path).unwrap(), "d41d8cd98f00b204e9800998ecf8427e");

    // Check the digest of some known contents
    fs::write(&path, b"hello world").unwrap();
    assert_eq!(md5sum(&path).unwrap(), "5eb63bbbe01eeed093cb22bb8f5acdc3");

    // Check the digest follows the changed contents
    fs::write(&path, b"hello landscape2").unwrap();
    assert_eq!(md5sum(&path).unwrap(), "e5e79c5388f04ddc4d29f09f5479b2eb");
}

#[test]
fn test_needs_upload_truth_table() {
    let local_md5 = "5eb63bbbe01eeed093cb22bb8f5acdc3";
    let equal = Some(local_md5.to_string());
    let different = Some("d41d8cd98f00b204e9800998ecf8427e".to_string());

    assert!(needs_upload(local_md5, None), "missing remote");
    assert!(needs_upload(local_md5, Some(&None)), "remote without etag");
    assert!(!needs_upload(local_md5, Some(&equal)), "equal etag");
    assert!(needs_upload(local_md5, Some(&different)), "different etag");
}

#[test]
fn test_object_key_nested_dotfile_returns_none() {
    let landscape_dir = Path::new("/build");

    assert_eq!(
        object_key(landscape_dir, Path::new("/build/assets/.DS_Store")),
        None
    );
    assert_eq!(object_key(landscape_dir, Path::new("/build/.git/config")), None);
}

#[test]
fn test_object_key_nested_file_uses_forward_slashes() {
    let landscape_dir = Path::new("/build");
    let file = landscape_dir.join("embed").join("assets").join("x.js");

    assert_eq!(
        object_key(landscape_dir, &file),
        Some("embed/assets/x.js".to_string())
    );
}

#[test]
fn test_object_key_repeated_prefix_not_stripped_twice() {
    let landscape_dir = Path::new("/build");

    assert_eq!(
        object_key(landscape_dir, Path::new("/build/build/index.html")),
        Some("build/index.html".to_string())
    );
}

#[test]
fn test_object_key_root_dotfile_returns_none() {
    let landscape_dir = Path::new("/build");

    assert_eq!(object_key(landscape_dir, Path::new("/build/.DS_Store")), None);
}

#[test]
fn test_object_key_root_index() {
    let landscape_dir = Path::new("/build");

    assert_eq!(
        object_key(landscape_dir, Path::new("/build/index.html")),
        Some(INDEX_DOCUMENT.to_string())
    );
}

#[test]
fn test_object_key_trailing_slash_dir() {
    let landscape_dir = Path::new("/build/");

    assert_eq!(
        object_key(landscape_dir, Path::new("/build/assets/x.js")),
        Some("assets/x.js".to_string())
    );
}

#[test]
fn test_stale_keys_returns_only_missing_locally() {
    // Setup the deployed objects and the local keys
    let deployed: HashMap<Key, Option<Checksum>> = HashMap::from([
        ("assets/new.js".to_string(), Some("1".to_string())),
        ("assets/old.js".to_string(), Some("2".to_string())),
        ("index.html".to_string(), Some("3".to_string())),
        ("logos/old.svg".to_string(), None),
    ]);
    let local: HashSet<Key> = HashSet::from([
        "assets/new.js".to_string(),
        "index.html".to_string(),
        "logos/new.svg".to_string(),
    ]);

    // Check only the deployed keys missing locally are returned, sorted
    assert_eq!(
        stale_keys(&deployed, &local),
        vec!["assets/old.js".to_string(), "logos/old.svg".to_string()]
    );
}

#[tokio::test]
async fn test_validate_aws_config_with_static_provider_succeeds() {
    // Setup a config with a region and static credentials (no env vars)
    let credentials = Credentials::new("access-key-id", "secret-access-key", None, None, "test");
    let config = SdkConfig::builder()
        .credentials_provider(SharedCredentialsProvider::new(credentials))
        .region(Region::new("us-east-1"))
        .build();

    // Check the config is valid
    validate_aws_config(&config).await.unwrap();
}

#[tokio::test]
async fn test_validate_aws_config_without_region_returns_error() {
    // Setup a config with static credentials but no region
    let credentials = Credentials::new("access-key-id", "secret-access-key", None, None, "test");
    let config = SdkConfig::builder()
        .credentials_provider(SharedCredentialsProvider::new(credentials))
        .build();

    // Check the missing region is reported
    let err = validate_aws_config(&config).await.unwrap_err();
    assert_eq!(
        format!("{err:#}"),
        "AWS region not configured (set AWS_REGION or a region in the AWS profile)"
    );
}

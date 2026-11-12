//! This module defines the paths of the directories and files a landscape
//! build writes to its output directory. The CLI build writes them, and the
//! overlay and the quiz read them from the deployed landscape.

// Directories.

/// Directory where the datasets are written to.
pub const DATASETS_PATH: &str = "data";

/// Directory where the settings images and the QR code are written to.
pub const IMAGES_PATH: &str = "images";

/// Directory where the landscape source files are copied to.
pub const SOURCES_PATH: &str = "sources";

// File names.

/// Name of the landscape data source file, in the sources directory.
pub const DATA_FILE: &str = "data.yml";

/// Name of the full dataset file, in the datasets directory.
pub const FULL_DATASET_FILE: &str = "full.json";

/// Name of the landscape games source file, in the sources directory.
pub const GAMES_FILE: &str = "games.yml";

/// Name of the guide dataset file, in the datasets directory.
pub const GUIDE_DATASET_FILE: &str = "guide.json";

/// Name of the landscape guide source file, in the sources directory.
pub const GUIDE_FILE: &str = "guide.yml";

/// Name of the QR code image file, in the images directory.
pub const QR_CODE_FILE: &str = "qr_code.svg";

/// Name of the quiz questions dataset file, in the datasets directory.
pub const QUIZ_DATASET_FILE: &str = "quiz.json";

/// Name of the landscape settings source file, in the sources directory.
pub const SETTINGS_FILE: &str = "settings.yml";

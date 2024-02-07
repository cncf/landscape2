# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.1] - 2024-02-07

### Fixed

- Use settings footer text in screenshot (#492)

## [0.6.0] - 2024-02-06

### Added

- **BREAKING**: settings: new required [url field](https://github.com/cncf/landscape2/blob/8728c797eeef557be21181f77e453134b17cdbf7/docs/config/settings.yml#L30-L36) (#475)
- Landscape API endpoints (#475)
- Provide ability to run GTM containers (#457)
- Display upcoming events and make them configurable (#468)
- Filters used to url (#485)
- Display member end user badge (#471)
- Members category to base data set (#470)
- More options to logos-preview endpoint (#472)
- Allow extra header and footer customization

### Fixed

- Issue rendering grid (#484)
- Issue generating stats (#456)
- Issue closing sidebar on mobile devices (#474)
- Issue copying `gtm.js` file (#459)
- Issue displaying loading animation (#486)
- Header menu icon alignment (#474)
- Issue displaying decimals in stats (#473)

### Changed

- **BREAKING**: settings: fields in `social_networks` moved to `footer -> links`
- **BREAKING**: settings: `images -> header_logo` field moved to `header -> logo`
- **BREAKING**: settings: `images -> footer_logo` field moved to `footer -> logo`
- Settings: `images` field is now optional
- Minor improvements to footer (#474)
- Update header default background color in embed (#474)
- Some minor improvements to web application (#454)
- Bump cargo-dist to 0.8.1 (#477)

### Removed

- `qr_code` section from settings file (we rely now on the new url field) (#475)

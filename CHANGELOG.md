# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.12.0] - 2024-12-11

### Added

- Some more fields to item extra (#759)
- Forums link to landscape footer (#760)
- Display magnifying glass for all items sizes (#747)
- Alias to finances page (#743)

### Changed

- Minor improvement processing items second path (#744)
- Improve how title ellipsis is displayed on grid view (#735)
- Hide filters options that produce no results (#729)
- Update settings file reference documentation (#727)
- Bump Alpine to 3.21.0 (#768)
- Bump Rust to 1.83 (#768)
- Upgrade CLI tool dependencies (#768)
- Upgrade web application and embed dependencies (#770)

### Fixed

- Issue sorting overriden categories on grid (#725)
- Issue when defined groups are empty (#728)
- Regression displaying search results on Safari (#733)
- Add missing base-path to embed url when required (#742)
- Issue loading overlay without guide or games (#746)
- Typo in filters and org type labels (#763, #761)

## [0.11.0] - 2024-10-14

### Added

- Improved accessibility support (#685)
- Annotations field to item extra section (#721)
- Return items annual review details from API (#722)

### Fixed

- Order by sandbox date on projects page (#677)
- Issue closing embed item modal (#682)
- Issue displaying parent project in details modal (#689)
- Regression in grid mode on mobile devices (#687)
- Regression displaying end user label in details view (#690)
- Typo in sample data file (#703)
- Do not cache quiz questions during tests (#719)

### Changed

- Adjust items sizes on embed for mobile devices (#683)
- Do not rely on members category to display end user label (#692)
- Bump Alpine to 3.20.3 (#707)
- Bump Rust to 1.81 (#706)
- Upgrade CLI tool dependencies
- Upgrade web application and embed dependencies

## [0.10.0] - 2024-07-24

### Added

- Item details modal to embed view (#664, #656)
- Quiz game (#641)
- Projects page (#666)
- Document landscape data file (#631)
- Allow setting end user flag automatically (#646)
- End user filter (#647)
- Documentation url link (#665, #669)

### Fixed

- Duplicate active filter when specification is selected (#633)
- Duplicated date on item details view (#634)
- Active filters list issue (#638)
- Issue preparing screenshots with no groups (#668)

### Changed

- Improve Twitter url validation (#637)
- Do not require logos to be in SVG format (#667)
- Upgrade CLI tool dependencies (#674)
- Upgrade web application and embed dependencies (#655)

## [0.9.0] - 2024-05-13

### Added

- Experimental overlay (#587)
- Improve search (#619)
- New embed card style (#622)
- Repository selector to item details view (#581)
- Not open source filter (#583)
- Repositories good first issues link (#582)
- Display parent project in item details view (#570, #568)
- Display loading spinner in controls bar (#579)
- Display package manager link in item details view (#609, 592)
- Display other links in item's detail view (#624)
- Organization region in items details view (#617)
- Make default view mode configurable (#574, #572)
- Make logos viewbox adjustments configurable (#577)
- Hide stats link when there are no stats available (#607)
- Open item details modal from zoom view (#620)
- Do not display empty groups in group selector (#606)
- Collect repositories topics from GitHub (#590)
- Some more options to logos preview (#594)
- Some tests to core crate (#613)

### Fixed

- Some issues in mobile devices (#612)
- Some issues with filters modal (#593)
- Badge url issue (#608)
- Participation stats legend in item details view (#616)
- Use additional categories on embed views (#623)
- Do not raise errors detecting mime type on deploy (#573)

### Changed

- Check logos checksum while deploying (#578)
- Use only orgs in data file when processing stats (#589)
- Use custom octorust client (#615)
- Upgrade CLI tool dependencies (#605)
- Upgrade web application and embed dependencies (#610)

## [0.8.1] - 2024-04-11

### Fixed

- Fix iframe resizer script path issue (#566)

## [0.8.0] - 2024-04-11

### Added

- Ability to classify cards by maturity, tag, or even not classify at all (#552)
- Allow sorting cards by multiple criteria (#552)
- New virtual group named `all`, that includes the cards from all groups (#552)
- Categories / subcategories headers now show how many items are on each (#552)
- Button to jump to the top of the page (#552)
- Category filter (#552)
- Display LinkedIn link in item details view (#548, #563)
- Allow setting web application base path (#557)

### Fixed

- Issue processing additional categories (#562)

### Changed

- Do not cache logos during build (#549)
- Minor refactoring and some improvements to instrumentation (#543, #547)
- Upgrade CLI dependencies (#550)

## [0.7.0] - 2024-03-19

### Added

- Provide ability to display Osano cookies consent form (#497)
- Specification filter (#509)

### Fixed

- Footer cookies icon position (#499)
- Hide Osano window in screenshot url (#520)
- Add plus sign to item id valid chars regexp (#534)

### Changed

- Extend embed configurator with some more options (#502)
- Some improvements in deploy subcommand (#533)
- Upgrade CLI dependencies (#518)
- Upgrade web application dependencies (#521)

## [0.6.1] - 2024-02-07

### Fixed

- Use settings footer text in screenshot (#492)
- Keep current filters when closing embed modal (#490)

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

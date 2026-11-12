# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Stats generation time (`generated_at`) in the stats dataset, used as the anchor of the landscape-wide charts
- Warnings for unknown keys in the data, settings, guide and games files (the files are still accepted): `build` logs them, and `validate` prints them, along with any other warning found, to stderr as `warning: <message>`
- Data file reference and JSON schema entries for the item `unnamed_organization`, `training_certifications` and `training_type` fields, settings footer `forums` link in the settings JSON schema, and subcategory `keywords` in the guide JSON schema
- `funding_url` item field (#917)
- `lfx_slug` item field (#893)
- `mailto` links in item `other_links` (#942)
- Featured items exclusion rules (`exclude.groups`) (#898)
- Third-party notices (`THIRD_PARTY_NOTICES.md`) for the bundled Orbitron font and iframe-resizer child script, included in the release archives, and the Orbitron font SIL Open Font License file shipped next to the font in every generated site (`fonts/OFL.txt`)
- Container image tags `sha-<commit>` for every image built from `main` and `vX.Y.Z` for every release, alongside `latest`, which keeps tracking `main`
- `new --force` flag to overwrite the template files that already exist in the output directory. Without it, `new` no longer overwrites existing files: when some template files already exist in the output directory, it lists them and writes nothing
- `yaml-language-server` schema modeline in the data, settings, guide and games files created by `new`, for editor validation
- `validate games` `--data-file` and `--data-url` options to check that every quiz option matches an item in the landscape data
- `build` check of the quiz options against the landscape data: the build fails when a quiz option in the games file does not match any item
- `serve` support for landscapes built with a settings `base_path`: it serves them under that path (read from the build output), redirects `/` and the base path to the base path with a trailing slash, keeps serving them at the root and prints the URL including the base path
- `serve` support for the web application routes (for example `/stats` or `/guide`), served with a 200 status instead of a 404 one
- `deploy s3` `--delete-stale` flag to delete the bucket objects that are not part of the landscape website files once the index document has been uploaded, and a per-path `Cache-Control` header on every uploaded file, the same one `serve` uses (cached for a year for the hashed assets and the logos, not cached for the rest)
- API individual project endpoints (`api/projects/<id>.json`) (#931)
- Item Facebook and Gitter links (`facebook_url`, `gitter_url`) in the item details view
- Local UI development proxy (`VITE_PROXY_TARGET`) (#952)
- Projects summary alias (#892)
- Kiosk item view (`kiosk.html?item=<id>`) (#932)
- Overlay warnings, logged in the browser console, for items not found in the deployed landscape (they have no logo nor CLOMonitor summary) and for unknown keys in the overlay files
- Overlay matching of items moved to another category or subcategory to the deployed item with the same name, when that name is unique, to keep their logo and CLOMonitor summary

### Changed

- The generated datasets (`data/*.json`) carry the values the web application, the embeds and the kiosk page used to compute themselves: the resolved item description in the full dataset (`full.json`, the same value used by the embeds, the API and the downloads), the item website, the item featured information (including the normalized names of the groups where the highlight is hidden, `excluded_groups`), the maturity and TAG options with their normalized names in the base dataset (`maturity_options`, `tag_options`), and the normalized names of the guide categories and subcategories in the guide dataset (`normalized_name`)
- Embed views always include their `items` list, also when it is empty
- Unknown repository commit and release timestamps (`ts`) are omitted from the full dataset (`full.json`) instead of being `null`
- The base dataset (`base.json`) omits `qr_code` when there is no QR code (the overlay has none) instead of setting it to an empty string
- The base dataset (`base.json`) always includes `colors`: when the settings have no `colors` section, the default palette (the one in the `new` template and the settings reference) is used by the web application, the embedded item details view and the kiosk page
- Guide category keywords are deprecated: they are not displayed nor included in the guide dataset, and using them produces a warning (subcategory keywords are not affected)
- Landscape files fetched from a URL time out after 60 seconds
- Item TAG names in the data file can use digits, like the settings TAG names
- Item `crunchbase` URLs must be plain organization URLs (`https://www.crunchbase.com/organization/<permalink>`), without a query string, fragment or extra path segments
- Settings colors can also use the `rgb(<RED>, <GREEN>, <BLUE>)` format
- Settings `images.favicon` can be a local path, like the header and footer logos
- Settings `url` and `base_path` trailing slashes are removed, and a `base_path` of `/` is the same as not setting it
- Settings validation rejects unknown featured item fields, featured item `exclude.groups` entries that do not name a group, empty `subcategories` lists or blank entries in `enduser` and `tags` rules, invalid or `all` TAG names, Google Tag Manager container ids not starting with `GTM-`, duplicate group names, blank, duplicate or reserved group aliases (or containing slashes), and subcategories without letters or digits or duplicated within a category override
- Guide validation rejects duplicate category names, and duplicate subcategory names within a category
- Games validation rejects quizzes without questions, duplicate options within a question (ignoring case), and options with a subcategory but no category
- An empty Crunchbase description is no longer used as the item description
- Item descriptions taken from the primary repository or Crunchbase have their GitHub emoji shortcodes (for example `:rocket:`) removed, in the web application, embeds, API and downloads
- The data, settings, guide and games JSON schemas declare JSON Schema 2020-12 and match the validation done by landscape2 wherever JSON Schema can express it: they accept what it accepts (for example empty `categories` or `featured_items` lists, social URLs on any subdomain, `www.twitter.com` or logos in any supported image format and case, a guide without categories or a games file without a quiz) and flag what it rejects (for example categories without name or subcategories, empty item names, invalid or reserved TAG names and maturities, annotation values that are lists or mappings, `screenshot_width` values not greater than 1000, incomplete `upcoming_event` sections, quizzes without questions, questions with more than four options or titles longer than 200 characters). Some checks remain specific to landscape2, such as names that only contain spaces, values that must be unique or rules that relate several fields. The schemas also expect text fields to be strings, while landscape2 accepts numbers and booleans in them and reads them as text
- Requests to GitHub, Crunchbase and CLOMonitor, and the logos and settings images fetched from URLs, time out (10 seconds to connect, 60 seconds in total). GitHub and Crunchbase requests are retried on transient failures (connection errors, timeouts, rate limiting and server errors), and whitespace around `GITHUB_TOKENS` entries, empty entries and whitespace around `CRUNCHBASE_API_KEY` are ignored
- Build cache: the expired GitHub, Crunchbase and CLOMonitor data is kept when a refresh fails or no token/key is set, new data is merged with the entries of other landscapes sharing the cache directory, unused entries older than 90 days are pruned, and the files are written atomically and carry a format version (`"version": 1`). Cache files written by landscape2 v1.1.0 (or earlier) are migrated automatically, an older landscape2 binary pointed at a new cache file ignores it with a warning and starts with an empty cache, and a cache write failure no longer fails the build
- `build` removes its managed output subdirectories (`api`, `data`, `docs`, `embed`, `images`, `logos` and `sources`) and generated root files (`index.html` and `kiosk.html`) before writing the new output, so files from previous builds are no longer published, and refuses local inputs (data, settings, guide and games files, and logos path) located inside them. Other files in the output directory (for example `CNAME`) are kept
- Settings images (header and footer logos, and favicon) are written as `images/<hash>.<ext>`, where the hash is computed from their location, and their location must end in a file name with an extension
- Logos shared by several items are fetched and processed once
- Noto Sans font used in the landscape screenshots (#910)
- Crunchbase API base URL updated (#939)
- Upgraded dependencies and base images (#906, #924, #938, #950, #955)
- Dependency security updates: the AWS SDK legacy TLS stack (rustls 0.21, rustls-webpki 0.101, h2 0.3 and hyper 0.14) is no longer compiled in (`aws-sdk-s3` uses only its default HTTPS client), and OpenSSL (vendored in the Linux binaries and the container image, updated from 3.3.0 to 3.6.3), memmap2, rustix and rand were updated, so `cargo audit` reports no vulnerabilities
- `build --help` lists the required options (data, logos, output directory and settings) first, followed by the optional ones
- `serve` fails when the directory is not a landscape build output (no `index.html`)
- `validate guide` and `validate games` fail when no file or URL is provided
- `deploy s3` resolves the AWS region and credentials from any standard AWS source (environment variables, shared profiles, SSO or instance roles) instead of requiring `AWS_REGION`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, and fails before listing or uploading anything when the landscape directory has no `index.html`
- The README documents the embeds iframe-resizer mode: the embed page ships the iframe-resizer 4.x child script (MIT), so host pages must load the matching 4.x parent script (v5 is licensed under GPL-3.0 or a commercial license), as shown in its host page snippet
- The embed item details messages no longer include a `basePath`: the item details view loads the data from the landscape it is served from, and the host page script (`embed-item.js`) only relays item requests from iframes served from the item details view origin, and only lets the item details view close itself
- Embed item logos load lazily, and unknown `title-alignment`, `items-alignment` and `title-font-family` values in an embed URL fall back to their defaults instead of producing invalid styles
- Web application browser history: opening an item details view and changing the Explore group or view mode add a history entry, so Back closes the item details view or returns to the previous group or view mode (filter, sort and classify changes still replace the current entry). Closing an item details view opened from a shared link replaces the entry instead of leaving the site
- Web application header and mobile navigation menu items are links, so they can be opened in a new tab or copied, and they keep the `overlay-*` params. The Explore link and the logo open the default Explore view (the first group and the default view mode) instead of resetting the filters of the page they lead to
- Web application when the full dataset fails to load: the Guide, Stats and Games pages stay available instead of being replaced by the error, Projects, Finances and Logos show the error with a "Try again" button, Explore keeps its Grid view with an alert and a "Try again" button (the Card view and the filters stay disabled until the full data loads, and a Card view URL or default shows the Grid view, of the first group when it names every group, leaving out the URL filters the base data can't apply), and the item details and zoom views show their own error with a "Try again" button instead of not opening
- Web application items looked up by id and name through indexes, group items de-duplicated by id (comparing whole items took about 1 s for 2,500 items), the base data grouping and the classification of the groups that are not filtered computed once instead of on every query, and the finances membership of each organization looked up through an index
- Web application search box announced as a combobox named "Search items" that follows the highlighted result, with its own list ids in the header and in the mobile menu. Enter opens the highlighted result, or the first one when none is highlighted, and searches right away when the results are not listed yet
- Web application Explore computes its items once per URL change (it repeated that work up to six times when opened with the full data loaded), grid items look up their details only when their dropdown opens, and the sticky Card view index updates its height at most once per frame while scrolling
- Overlay files loaded concurrently, reading only the fields the overlay needs from the deployed full dataset

### Fixed

- Errors reading a local landscape file not naming the file
- Item `summary_intro_url` not validated as a URL
- Item website not falling back to the Crunchbase homepage when the homepage is the item's repository
- Data validation accepting categories, subcategories or items whose ids collide (for example `Foo Bar` and `Foo-Bar`) or whose names have no letters or digits
- Data validation accepting maturity or TAG values that normalize to `all` or like another value
- Malformed item `second_path` entries silently ignored, and entries pointing to unknown categories or subcategories kept
- Item logo paths escaping the logos directory and unsafe `clomonitor_name` values accepted
- Empty entries kept in item `summary_personas` and `summary_tags` lists
- Settings `logos_viewbox` failing to parse when only `adjust` or only `exclude` was set
- Settings `upcoming_event` not validated (blank name, start date after the end date, or non-HTTP(S) banner and details URLs)
- Settings colors validation accepting values with extra content (for example `red; rgba(0,0,0,1)`), out-of-range alpha values or non-ASCII digits, and rejecting `rgb(...)` values
- URL domain checks accepting lookalike domains (for example `notgithub.com` as a GitHub URL or `dropbox.com` as a Twitter URL)
- Guide validation errors naming the previous subcategories of the category as well as the failing one
- Quiz question titles limited to 200 bytes instead of 200 characters, rejecting shorter titles written in non-Latin scripts
- Featured highlight hidden in a group when any matching rule excluded it instead of the last matching one, and not hidden for items listed there through an additional category
- Landscape-wide weekly activity chart dropping repositories when some repositories had no participation stats yet
- Projects accepted directly as graduated counted as promotions from incubating to graduated
- GitHub data collection using error responses as data (for example counting one contributor or taking the latest commit as the first one when a request failed), reading the commits from the default branch instead of the configured repository `branch`, publishing `Other` as the license of repositories whose license GitHub cannot identify, ignoring repositories whose URL ends in `.git` (they were looked up with the suffix), and caching empty participation stats as fresh while GitHub was still computing them
- Crunchbase data collection dropping all the organization categories when one had no name, publishing empty city, region or country values, and keeping the acquisitions of the last 6 calendar years instead of those announced in the last 72 months
- Build crashing on a `GITHUB_TOKENS` entry or `CRUNCHBASE_API_KEY` value that is not a valid HTTP header value, or on a commit with an invalid date, instead of reporting an error or skipping the date
- SVG logos processing removing the content between two titles on the same line, keeping multi-line titles and titles with attributes, adjusting the viewbox of nested elements (for example a `<symbol>`), and leaving single-quoted or missing root viewboxes unadjusted
- Logos that could not be prepared silently left out: the build logs a summary warning, and its success message says how many logos failed
- Settings images with the same file name in different locations overwriting each other, and image URLs ending in a slash failing with an unclear error
- Screenshot server port picked with a race against other processes, and its errors hidden when the screenshot could not be taken
- Landscape screenshot: the last row of subcategories of a category not stretching to the bottom of the category
- Template values (for example the settings foundation or description) not HTML-escaped in the generated `index.html` and `kiosk.html`, and the JSON-LD structured data becoming invalid when they contained quotes
- Landscape sources fetched from a URL downloaded a second time, without checking the response status, to copy them to the `sources` output directory
- CLOMonitor project names not percent-encoded in the report summary URL
- `docs/items.csv` (`last_audit_date`, `last_audit_url`), `docs/projects.csv` and `docs/projects.md` (`last_security_audit_date`) taking the last security audit listed in the data file instead of the most recent one by date
- Container image `landscape2-validate.sh` script printing its usage to stdout with a literal `\T` instead of a tab (it now prints it to stderr), and failing on file paths with spaces or glob characters
- Reference documentation, JSON schemas and README stating that logos must be SVG files (SVG is recommended, other image formats are supported), that guide categories require content and that quiz questions can have any number of options, the reference games file naming quiz options missing from the reference data file, the settings reference `motd` example showing its quotes, mentions of a `landscape.yml` data file (it is `data.yml`), a featured items `exclude.groups` example that was not a group display name, the data schema `summary_intro_url` entry without a title nor URL format, and typos
- `serve` answering requests for missing files with the index and a one-year cache header instead of a plain 404 response that is not cached
- `validate` error messages repeating "the landscape … file provided is not valid"
- `deploy s3` uploading hidden files inside subdirectories (for example `assets/.DS_Store`), and building wrong object keys on Windows or when the landscape directory path appeared twice at the start of a file path
- Web application, embed and embed-item bundles able to carry a second copy of the Solid runtime (and of the shared libraries) through the shared UI components, which broke their reactivity (for example the item details modal not reacting to being opened or closed). Each bundle now carries one copy, and the embed script shrank from about 400 KB to about 55 KB
- Embedded category views ignoring the settings category overrides (subcategories order and exclusions)
- Items listed through an additional category missing from embeds (#936)
- Embeds of categories or subcategories without items staying on their loading state
- Embeds using their `base-path` parameter as the data origin, so a crafted embed URL (for example with `base-path=//attacker.example`) rendered third-party data and links: an invalid `base-path` shows "Invalid embed url", and trailing slashes are dropped (like the settings `base_path`), so `base-path=/` loads the data from the landscape root
- Embeds showing "Invalid embed url" when their data failed to load: they show "This view could not be loaded." with a "Try again" button. Embeds also announce their loading state to screen readers, show the foundation (instead of the maturity) as the tooltip of the card foundation badge, and no longer discard their base text styles (font size, line height and margins)
- Embedded item details view loading data from a location given by any page framing it, and accepting messages with unchecked fields
- Embed item details host page script (`embed-item.js`) failing on messages without data, relaying item requests from any frame to any origin, echoing close messages back to the item details view, and setting `overflow-y: auto` on the host page when closing instead of restoring its previous value
- Embedded item details view switching to its desktop layout at 1200 px instead of 992 px like the web application, its own styles (for example the colors of the "Try again" and copy buttons, and of the links) overridden by Bootstrap's, and the keyboard focus indicator hidden: keyboard focus shows an outline
- Embed codes generated in the web application showing nothing for maturity or TAG values with capitals, spaces or repeated hyphens (for example `Graduated`, `early stage` or `a--b`)
- Web application embed setup: the "Open details modal on click" option hidden for the Card style (Card embeds honour it), closing the setup failing in a landscape without categories, a cleared size or gap writing `NaN` into the embed code and out-of-range sizes accepted, an empty `base-path` param added to every embed code, the item details snippet setting `display` twice, and its form labels not linked to their controls
- Item details view failing to render the repositories of items whose repository has no first commit date, and showing an empty license badge when no license is known
- Item details view: the TAG badge missing for items without a maturity, whose first TAG was shown nowhere, the funding rounds and acquisitions tables never showing the tenth entry, the mobile view leaving out the organization region and showing a broken CLOMonitor image when the report summary could not be fetched, a GitHub good first issues badge and link (and the GitHub icon) shown for repositories hosted elsewhere, repository URLs ending in a slash giving broken issues links, repositories with more than five languages showing only three, a `NaN%` language share for repositories without language bytes, the parent project missing from the embedded item details and when the parent item cannot be found (its name is shown), and the documentation link titled "Documenation"
- Item details view header links overflowing their box, and the view itself, for items with many links: they wrap to a second row
- Item badge tabs, item options menu and item logos: the tabs expose their selected state to screen readers, the options menu is named "Item options", exposes whether it is open and closes with Escape (without closing the item details), and a logo that failed to load is retried when the item changes
- Item links (website, repositories and other links) in the item details view and embeds rendered for URLs that are not `http`, `https` or `mailto` (for example `javascript:`): they are shown as plain text
- Item summary links cut at the first `&` of their URL (leaving the rest as text), including a trailing period, and missing for URLs with uppercase hosts or top-level domains longer than six characters (for example `.foundation`)
- Good first issues link shown for archived projects (#897)
- Web application item descriptions not falling back to the Crunchbase description for items with repositories or a maturity, and dropping any text between two colons
- Search not indexing the Crunchbase description of items without their own or a primary repository description
- Explore and guide section anchors computed in the web application not always matching the names normalized by the build
- Numbers that round up to the next unit shown as `1000k` or `1000M` instead of `1M` or `1B`, the stats "Source code" size shown with two decimals, percentages close to 100 shown as `100.00%`, and the landscape badge URL breaking for foundation names with characters such as `/`, `#`, `?`, `%` or `&`
- Spaces encoding in the landscape badge (#913)
- Icons announced by screen readers with hard-coded titles, some of them wrong (the Facebook icon was announced as "X icon"): icons are decorative, and icon-only buttons and links are named by their labels
- External links in the web application, item details and embeds announced by screen readers as "Open external link" instead of by their text or purpose (for example the footer social links, the header GitHub link or the embed card links), and embed cards nesting their website and repository links inside the card link
- Copy to clipboard buttons reporting "Copied!" when copying failed: they report "Copy failed", and screen readers announce the result
- Default colors differing between the web application, the embedded item details view and the kiosk page (`color2`, `color5` and `color6`), and outline buttons without hover background when the settings had no `colors` section
- Web application item details view, Explore view mode and group not following the URL after the page loaded: Back and Forward, or a guide link to an item, changed the URL but not what was shown
- Web application rewriting repeated filter params when an item was opened or closed (for example `project=a&project=b` became `project=a%2Cb`, which matched nothing when reloaded or shared), Explore rendering nothing for an unknown or repeated `view-mode`, an unknown `group` replaced by a URL that dropped the filters and the open item, and group alias redirects dropping the other params (including the `overlay-*` ones) and the hash
- Web application mobile navigation menu announced as a menu of plain links, its button named "Mobile settings button" and not closed by Escape, the hidden sticky mobile bar keeping its buttons in the tab order, and its Index button shown on pages without a table of contents
- Web application search listing at most 29 results instead of 30, clearing the query and the results when the mouse was pressed in the search box, the arrow keys stopping on an empty slot after the last result, Enter on that slot (or with nothing highlighted) dropping the results instead of opening one, Enter searching with fewer than 2 characters, and a search started with 2 characters still running after deleting one
- Web application overlay applying its foundation name, grid size and view mode only after the full data was announced as ready
- Web application upcoming event banner hidden during the whole last day of the event, and its image announced without a name (it is named after the event)
- Images announced with a repeated or misplaced "logo": the web application header logo ("Landscape logo logo"), footer logo ("Logo logo") and QR code ("QR code logo"), and the CLOMonitor report summary in the item details view
- Web application overlay errors shown with an empty message when the overlay failed with an error object, and the mouse pointer hidden over the "Landscape overlay enabled" banner
- Web application keyboard and screen reader access: keyboard focus shows an outline again (it was removed from every button, link and form control), Card view items, the grid items on touch devices and tablets, the quiz answers and the Stats category rows can be used with the keyboard, the Filters button can no longer be activated while it is disabled, the Explore zoom buttons titles were swapped, the category guide links were named after a subcategory, the mobile index and filters sidebars behave as dialogs (the focus moves inside, Escape closes them and their content can't be reached while closed), the inline filters dropdowns close with Escape, the active filters are announced as a list, the Stats charts have a data table alternative, and the quiz announces only the answer result and the score instead of every change
- Web application back to top button not showing, or scrolling the wrong element, after the window was resized across the mobile breakpoint
- Web application styles that never applied: the footer links underline, the inline filters buttons background and hover border colors, and the embed setup color pickers swatch style in Chromium-based browsers
- RangeError when resizing the web application to small widths (#901)
- Menu scroll (#902)
- Data loading, download and item details modal focus issues (#952)
- Web application filters reset when going back to, or reloading, an Explore page opened from the header logo, and Explore URLs not matching what was shown: only the last Extra filter of a URL with both kept (for example `?specification=true&enduser=true`), Extra filters set to anything but `true` (for example `?specification=false`) still applied, unknown `classify`, `sort-by` or `sort-direction` values rendering an empty Card view or a sort selector with no option selected, `group=all` written in landscapes without groups, a filter value added to all the maturity levels or all the licenses (for example the non-foundation projects) dropped from the URL and hidden in the active filters list, and switching from Grid to Card view writing an ascending sort direction while the selector showed the previous one
- Web application Explore stuck on its loading spinner when a group was clicked before the full data had loaded
- Web application Explore Grid view: the mobile Grid view showing only a header, or nothing, when the URL carried a maturity, TAG or none classification (its Index now lists the Grid sections), the desktop grid keeping the previous logos when a filter change left the number of items of each subcategory unchanged, and a window resize listener left behind every time Explore was closed
- Web application Explore Card view: the GitHub stars of items with several repositories showing the first repository with stars instead of the sum the Stars sort uses, the Latest commit sort ordering items with several repositories by their stalest repository instead of their most recent one, and items whose repositories have no GitHub data placed first instead of last by the Stars and Contributors sorts
- Web application mobile Card view: the section of the items without a maturity or TAG titled "undefined" instead of "None"
- Web application Explore filters: the Extra (End user and Specification) and Organization type filters missing for groups whose items have no Crunchbase industries (for example landscapes built without `CRUNCHBASE_API_KEY`), and the Organization, Industry and Location search boxes clearing their query when the Search button, an option or the Clear button was clicked
- Web application grids freezing the page when a row fits a single item (for example a narrow guide subcategory) and the section mixes featured and plain items, and featured items placed in the last slot and a half of rows with an odd number of columns, pushing the row past its size
- Web application zoom view showing an empty grid with no message for a section without items
- Web application Card view item names not shrunk to fit their card when the Card view or the group was hidden while the cards were rendered, and the guide index not scrolling to the section opened from an Explore Card view guide link
- Sorting items by first commit failing when a repository has no first commit date
- Grid category sorting (#946)
- Web application Finances page: filtering or sorting from a page other than the first leaving an empty table without pagination (it now goes back to page 1), unknown `kind`, `page`, `sort-by` or `sort-direction` values breaking the page or showing `NaN` (they now fall back to their defaults, and a page beyond the last one shows the last page), the page staying blank (without the footer) while the data loads and forever in landscapes without Crunchbase data (it now shows a spinner while loading, and a "no finances data" message when there is none)
- Web application Finances pagination: the "Next" button not styled as disabled on the last page
- Web application pagination: the "Previous" and "Next" buttons announced as "Open page 0" on the first page and as a page after the last one on the last page (they are named "Go to previous page" and "Go to next page")
- Web application Projects page: `maturity` filters in the URL shown as active but not applied to the list on load, resetting the filters not updating the URL, the Order select hidden in landscapes with a single maturity level, the "No projects found." row not spanning the whole table, and projects with an empty security audits list breaking the page
- Web application Stats page: years without disclosed amounts or prices shifting the following bars of the amount raised and acquisitions cost charts one year to the left, the "Funding rounds" and "Acquisitions" headings shown without charts, integer language shares shown without `%`, the chart font not applied, and the weekly commits chart dated from the day the page was viewed instead of the day the stats were generated. The funding rounds heading now says that they cover the last 5 years
- Subcategory name in the logos preview (#919)
- Web application Guide page: the index not scrolling to the current section on desktop, its options sharing their ids with the hidden mobile index, a guide without categories showing a blank page, or failing when opened again (it now says that the guide has no content), and a window resize listener left behind for every subcategory each time the guide was closed
- Web application Games page: its spinner running forever when opened in a landscape without games (it now says that games are not available), or when the quiz failed to load or could not be created (it now shows an error, also when starting a new game), the wrong guesses announced by screen readers with the number of correct ones, and the question titles never growing back after the window widened (they now refit, down to 40% of their size)
- Quiz advertised in the web application when the games file has no questions
- Orbitron font (games page): the larger TrueType file downloaded instead of the WOFF one, the text hidden until the font loaded, and a synthesized bold applied to the medium weight face
- Kiosk "Website" link using the item homepage instead of its website
- Kiosk page: release values that are not dates escaped twice (for example `a &amp; b`), a GitHub icon and good first issues link shown for repositories hosted elsewhere and a broken good first issues link for repository URLs ending in a slash, a description taken from the item summary when the item has none (the description resolved by the build is shown, or none), its whole content announced by screen readers on every change (only the status messages are announced now), Reddit and mailing list icons differing from the web application ones, and the settings favicon not used (the browser requested a missing `/favicon.ico` instead)
- Overlay `overlay-games` file not changing the quiz questions: the quiz uses its questions instead of the deployed ones
- Overlay settings images (header and footer logos, and favicon) given as local paths not loading: they resolve to the images deployed by the build
- Overlay showing a broken QR code image, and the guide page ending in an error state when opened directly with no guide available in the overlay data
- Overlay hiding the guide or the games when the deployed guide or games file failed to load for any reason (network or server errors, invalid files): only a missing file (404) means there is no guide or games, any other error is reported
- Overlay and quiz error messages showing debug formatting (quotes, escapes, multi-line `Caused by:` blocks): they show the whole cause chain on one line, and the quiz reports a missing quiz data file as `unexpected status code getting quiz data: 404`
- Quiz data URL in landscapes deployed with a `base_path` (#945)

### Removed

- The base dataset no longer includes the featured items rules
- The base dataset no longer includes the members category name (`members_category`)
- The full dataset (`full.json`) no longer includes the item fields that are only exposed through the API: `annotations`, `chat_channel`, `latest_annual_review_at`, `latest_annual_review_url`, `lfx_slug`, `training_certifications`, `training_type` and `unnamed_organization`

### API

The public outputs (`api/*`, `docs/items.csv`, `docs/projects.csv`, `docs/projects.md` and the landscape screenshot) and their change policy are documented in [docs/api.md](docs/api.md). All the changes below are additive.

- New item fields: `documentation_url`, `funding_url`, `member_subcategory`, `parent_project`, `unnamed_organization` and `website`
- New `api/index.json` endpoint listing the paths of every category, subcategory, members and projects endpoint, and the landscape2 version
- Repository `license` honours the data file `license` override, falling back to the license detected by GitHub (it used to always be the GitHub one)
- Item `annotations` are serialized sorted by key, so the output no longer changes between builds
- Item `description` is the resolved description (the item's own one, or else the primary repository GitHub or Crunchbase description), with GitHub emoji shortcodes removed from the fallback values
- New `id` column, the item id used by the API, appended to `docs/items.csv` and `docs/projects.csv`
- `docs/projects.md` has a `tag` column after `maturity`, its rows start with `|`, and Markdown special characters in project names (`\`, `|`, `[`, `]`) and URLs (spaces, `(`, `)`, `|`) are escaped
- `logo_url` honours `base_path` and is empty when the logo could not be processed

## [1.1.0] - 2025-10-17

### Added

- Group alias (#881)
- Option to set landscape description (#879)
- Option to select multiple categories and subcategories on embed (#876, #880)
- Display message of the day in header (#873)
- Flag to hide organization section in projects (#871)
- First commit date to projects summary table (#852)

### Changed

- Settings logos can now use local paths (#846)
- Extend API item type with some more fields (#837)
- Upgrade CLI tool dependencies
- Upgrade web application and embed dependencies

### Fixed

- Issue with category filter (#875)
- Issue with multiple tags (#874)
- Issue normalizing names with non-ascii chars (#838)
- Issue with hardware acceleration on Windows (#823)
- Some minor UI issues (#825)

## [1.0.0] - 2025-05-16

### Added

- Allow overriding repositories license (#807)
- Bluesky url field (#797)

### Changed

- Some improvements for stats graphs on mobile devices (#810)
- Improve how summary fields are displayed (#808)
- Increase screenshot timeout to 10m (#796)
- Upgrade CLI tool dependencies
- Upgrade web application and embed dependencies

### Fixed

- Issue handling empty categories in embed modal (#791, #801)

## [0.13.0] - 2025-01-24

### Added

- JSON schema for data and config files (#785)
- Allow classifying by maturity and TAG on embed (#781)
- Allow associating projects with multiple TAGs (#780)
- Search keyboard shortcut (#779)

### Fixed

- Issue with additional categories on embed view (#787)
- Empty subcategory on embed view (#782)
- Additional categories ignored in zoom item modal and guide (#773)

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
- Display package manager link in item details view (#609, #592)
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

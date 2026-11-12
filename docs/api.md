# Landscape API and downloads

`landscape2 build` writes a set of machine-readable files next to the landscape website. This document describes which of them are a stable contract, the shape of each one, and the policy that applies when they change.

## Public and internal outputs

Paths are relative to the build output directory (and to the landscape URL once deployed).

| Output | Status | Description |
| --- | --- | --- |
| `api/*` | Public, stable | JSON API described in [API endpoints](#api-endpoints) |
| `docs/items.csv` | Public, stable | One row per item, see [items.csv](#itemscsv) |
| `docs/projects.csv` | Public, stable | One row per project, see [projects.csv](#projectscsv) |
| `docs/projects.md` | Public, stable | Markdown table of the projects, see [projects.md](#projectsmd) |
| `docs/landscape.png`, `docs/landscape.pdf` | Public, stable | Screenshot of the landscape, only generated when the settings define `screenshot_width` and Chrome/Chromium is available |
| `data/*.json` | Internal | Datasets used by the web application. Their shape may change in any release |
| `embed/*` | Internal | Embeddable views assets and data. Their shape may change in any release |

Applications that consume landscape data should use the public outputs only.

## Change policy

- Within a major version, changes to the public outputs are additive only: new endpoints, new optional JSON fields and new CSV columns appended at the end.
- Consumers must ignore unknown JSON fields and must not rely on the number of CSV columns.
- Any other change (removing or renaming a field, endpoint or column, changing a type or a value format) is a breaking change. It's recorded in the `CHANGELOG.md` `### API` subsection of the release, marked **BREAKING**.
- Every change to the public outputs, additive or not, is listed in that `### API` subsection.

### History

- 0.13.0: **BREAKING** projects can be associated with several TAGs. The API item `tag` field changed from a string to an array of strings, and the `tag` columns of `docs/items.csv` and `docs/projects.csv` join the TAGs with commas. `docs/projects.csv` and `docs/projects.md` also include the projects without a TAG, which were skipped before. This change was recorded under "Added" in the changelog of that release.

## API endpoints

All endpoints are static JSON files under `api/`. Lists of items are JSON arrays sorted by item name (case-insensitive). Count endpoints return the `{"count": N}` envelope, for example `{"count": 42}`.

| Path | Content |
| --- | --- |
| `index.json` | [Index](#index) of the other endpoints |
| `categories/{category}/all.json` | Items of the category |
| `categories/{category}/count.json` | Number of items of the category |
| `categories/{category}/{subcategory}/all.json` | Items of the subcategory |
| `categories/{category}/{subcategory}/count.json` | Number of items of the subcategory |
| `members/all.json` | Items of the members category |
| `members/count.json` | Number of items of the members category |
| `members/end-users.json` | Items of the members category that are end users |
| `projects/all.json` | Items with a maturity (projects) |
| `projects/count.json` | Number of projects |
| `projects/{id}.json` | A single project, by item id |

- `{category}` and `{subcategory}` are normalized names: letters, digits, `+` and `-` are kept (lowercased), any other character becomes a hyphen, consecutive hyphens are collapsed and a trailing one is removed. `index.json` lists them, so consumers don't need to compute them.
- The members category (settings `members_category`) has no `categories/...` endpoints. Its items are published under `members/*`.
- `members/*` endpoints are always published. When `members_category` is not set, `members/all.json` and `members/end-users.json` are empty arrays and `members/count.json` is `{"count": 0}`.
- Category, subcategory and members endpoints are **primary-category-only**: they include the items whose `category` (and `subcategory`) match. Items listed in other categories through the data file `second_path` are not included there. Use each item's `additional_categories` field to find them.
- `{id}` is the item id, `{category}--{subcategory}--{name}` built from normalized names (for example `app-definition--database--mysql`).

### Index

`index.json` lists the paths of the other endpoints, relative to `api/`.

| Field | Type | Description |
| --- | --- | --- |
| `categories` | array | One entry per category, in the order defined, excluding the members category |
| `categories[].name` | string | Category name |
| `categories[].normalized_name` | string | Category normalized name, used in the paths |
| `categories[].all` | string | Path of the category `all.json` endpoint |
| `categories[].count` | string | Path of the category `count.json` endpoint |
| `categories[].subcategories` | array | One entry per subcategory, in the order defined, with the same `name`, `normalized_name`, `all` and `count` fields |
| `landscape2_version` | string | Version of landscape2 that built the landscape |
| `members.all`, `members.count`, `members.end_users` | string | Paths of the `members/*` endpoints |
| `projects.all`, `projects.count` | string | Paths of the `projects/all.json` and `projects/count.json` endpoints |
| `projects.project` | string | Path template of the single project endpoint, `projects/{id}.json` |

```json
{
  "categories": [
    {
      "all": "categories/app-definition/all.json",
      "count": "categories/app-definition/count.json",
      "name": "App Definition",
      "normalized_name": "app-definition",
      "subcategories": [
        {
          "all": "categories/app-definition/database/all.json",
          "count": "categories/app-definition/database/count.json",
          "name": "Database",
          "normalized_name": "database"
        }
      ]
    }
  ],
  "landscape2_version": "1.1.0",
  "members": {
    "all": "members/all.json",
    "count": "members/count.json",
    "end_users": "members/end-users.json"
  },
  "projects": {
    "all": "projects/all.json",
    "count": "projects/count.json",
    "project": "projects/{id}.json"
  }
}
```

### Item

Every item list and `projects/{id}.json` use this object. Optional fields are omitted when they have no value (they are never `null`). Dates are `YYYY-MM-DD` strings. Data file keys under `extra` are written as `extra.<key>`.

| Field | Type | Optional | Description and derivation |
| --- | --- | --- | --- |
| `category` | string | no | Primary category name |
| `homepage_url` | string | no | Data file `homepage_url` |
| `id` | string | no | Item id, `{category}--{subcategory}--{name}` normalized |
| `logo_url` | string | no | Absolute URL of the logo: the settings `url`, followed by the settings `base_path` unless `url` already ends with it, and the logo path in the build output, joined with single slashes (for example `https://landscape.example/logos/0a1b2c.svg`, or `https://example.org/landscape/logos/0a1b2c.svg` with `url: https://example.org` and `base_path: /landscape`). Empty string when the logo could not be processed during the build |
| `name` | string | no | Item name |
| `subcategory` | string | no | Primary subcategory name |
| `website` | string | no | `homepage_url`, or the Crunchbase organization homepage when `homepage_url` is the primary repository URL and Crunchbase has one |
| `accepted_at` | date | yes | `extra.accepted` |
| `additional_categories` | array of `{category, subcategory}` | yes | Other categories the item is listed in (data file `second_path`) |
| `annotations` | object of strings | yes | `extra.annotations`, keys sorted alphabetically |
| `archived_at` | date | yes | `extra.archived` |
| `artwork_url` | string | yes | `extra.artwork_url` |
| `audits` | array of `{date, type, url, vendor}` | yes | `extra.audits` |
| `blog_url` | string | yes | `extra.blog_url` |
| `bluesky_url` | string | yes | `extra.bluesky_url` |
| `chat_channel` | string | yes | `extra.chat_channel` |
| `country` | string | yes | Country of the organization, from Crunchbase |
| `crunchbase_url` | string | yes | Data file `crunchbase` |
| `description` | string | yes | Resolved description: the data file `description` verbatim when not empty; otherwise the primary repository GitHub description, or else the Crunchbase description, with GitHub emoji shortcodes (for example `:rocket:`) removed and trimmed. Omitted when all of them are empty |
| `devstats_url` | string | yes | `extra.dev_stats_url` |
| `discord_url` | string | yes | `extra.discord_url` |
| `docker_url` | string | yes | `extra.docker_url` |
| `documentation_url` | string | yes | `extra.documentation_url` |
| `enduser` | boolean | yes | Data file `enduser`, or set by the settings `enduser` rules |
| `facebook_url` | string | yes | `extra.facebook_url` |
| `funding_url` | string | yes | `extra.funding_url` |
| `github_discussions_url` | string | yes | `extra.github_discussions_url` |
| `gitter_url` | string | yes | `extra.gitter_url` |
| `graduated_at` | date | yes | `extra.graduated` |
| `incubating_at` | date | yes | `extra.incubating` |
| `joined_at` | date | yes | Data file `joined` |
| `latest_annual_review_at` | date | yes | `extra.annual_review_date` |
| `latest_annual_review_url` | string | yes | `extra.annual_review_url` |
| `lfx_slug` | string | yes | `extra.lfx_slug` |
| `linkedin_url` | string | yes | `extra.linkedin_url` |
| `mailing_list_url` | string | yes | `extra.mailing_list_url` |
| `maturity` | string | yes | Data file `project` (for example `graduated`). Items with a maturity are projects |
| `member_subcategory` | string | yes | Subcategory of the members category item with the same `crunchbase_url` (for example `Gold`) |
| `openssf_best_practices_url` | string | yes | Data file `url_for_bestpractices` |
| `oss` | boolean | yes | `true` when the primary repository has a license (see `repositories[].license`), omitted otherwise |
| `other_links` | array of `{name, url}` | yes | `extra.other_links` |
| `package_manager_url` | string | yes | `extra.package_manager_url` |
| `parent_project` | string | yes | `extra.parent_project` |
| `pinterest_url` | string | yes | `extra.pinterest_url` |
| `reddit_url` | string | yes | `extra.reddit_url` |
| `repositories` | array of [Repository](#repository) | yes | Primary repository (`repo_url`) first, then `additional_repos` |
| `slack_url` | string | yes | `extra.slack_url` |
| `specification` | boolean | yes | `extra.specification` |
| `stack_overflow_url` | string | yes | `extra.stack_overflow_url` |
| `summary` | object | yes | `extra.summary_*` values: `business_use_case`, `integration`, `integrations`, `intro_url`, `personas` (array), `release_rate`, `tags` (array) and `use_case`, each optional |
| `tag` | array of strings | yes | TAGs: `extra.tag`, or set by the settings `tags` rules |
| `training_certifications` | string | yes | `extra.training_certifications` |
| `training_type` | string | yes | `extra.training_type` |
| `twitter_url` | string | yes | Data file `twitter` |
| `unnamed_organization` | boolean | yes | Data file `unnamed_organization` |
| `youtube_url` | string | yes | `extra.youtube_url` |

### Repository

| Field | Type | Optional | Description and derivation |
| --- | --- | --- | --- |
| `url` | string | no | Repository URL |
| `branch` | string | yes | Branch used to collect the repository information |
| `contributors` | integer | yes | Number of contributors, from GitHub |
| `languages` | object of integers | yes | Source code bytes per language, from GitHub |
| `latest_release` | string | yes | Timestamp of the latest release, from GitHub, as an RFC 3339 date and time (for example `2024-03-02T10:00:00Z`), unlike the date-only item fields |
| `license` | string | yes | The data file `license` override (an SPDX license identifier) when set, otherwise the name of the license detected by GitHub (for example `Apache License 2.0`), omitted when GitHub cannot identify it |
| `primary` | boolean | yes | Whether this is the primary repository |
| `stars` | integer | yes | Number of stars, from GitHub |

## Downloads

### items.csv

`docs/items.csv` has one row per item (members, projects and any other item), sorted by name (case-insensitive), with a header row. Empty cells mean no value. Dates are `YYYY-MM-DD`, booleans are `true` or `false`.

| Column | Description |
| --- | --- |
| `name` | Item name |
| `organization` | Organization name, from Crunchbase |
| `homepage` | Data file `homepage_url` |
| `logo` | Site-relative path of the logo in the build output (for example `logos/0a1b2c.svg`), unlike the API absolute `logo_url` |
| `twitter` | Data file `twitter`, or the Crunchbase organization Twitter URL when not set |
| `crunchbase_url` | Data file `crunchbase` |
| `funding` | Total funding of the organization in USD, from Crunchbase |
| `member` | Members category subcategory (same as the API `member_subcategory`) |
| `relation` | The item `maturity` when set, otherwise `member` when the item has a `member` value, otherwise empty |
| `tag` | TAGs joined with commas (for example `app-delivery,security`) |
| `license` | Primary repository license: the data file override, otherwise the one detected by GitHub |
| `headquarters` | Crunchbase city, region and country joined with `, ` |
| `description` | Resolved description, as in the API |
| `crunchbase_description` | Organization description, from Crunchbase |
| `crunchbase_homepage` | Organization homepage, from Crunchbase |
| `crunchbase_city` | Organization city, from Crunchbase |
| `crunchbase_region` | Organization region, from Crunchbase |
| `crunchbase_country` | Organization country, from Crunchbase |
| `crunchbase_twitter` | Organization Twitter URL, from Crunchbase |
| `crunchbase_linkedin` | Organization LinkedIn URL, from Crunchbase |
| `crunchbase_ticker` | Organization stock ticker, from Crunchbase |
| `crunchbase_kind` | Organization kind (for example `company`), from Crunchbase |
| `crunchbase_min_employees` | Minimum number of employees, from Crunchbase |
| `crunchbase_max_employees` | Maximum number of employees, from Crunchbase |
| `category` | Primary category name |
| `subcategory` | Primary subcategory name |
| `oss` | Same as the API `oss` |
| `github_repo` | Primary repository URL, from GitHub |
| `github_stars` | Primary repository stars, from GitHub |
| `github_description` | Primary repository description, from GitHub |
| `github_latest_commit_date` | Date of the latest commit |
| `github_latest_commit_link` | URL of the latest commit |
| `github_latest_release_date` | Date of the latest release |
| `github_latest_release_link` | URL of the latest release |
| `github_start_commit_date` | Date of the first commit |
| `github_start_commit_link` | URL of the first commit |
| `github_contributors_count` | Number of contributors |
| `github_contributors_link` | URL of the contributors page |
| `accepted` | `extra.accepted` |
| `incubation` | `extra.incubating` |
| `graduated` | `extra.graduated` |
| `dev_stats_url` | `extra.dev_stats_url` |
| `artwork_url` | `extra.artwork_url` |
| `blog_url` | `extra.blog_url` |
| `mailing_list_url` | `extra.mailing_list_url` |
| `slack_url` | `extra.slack_url` |
| `youtube_url` | `extra.youtube_url` |
| `chat_channel` | `extra.chat_channel` |
| `last_audit_date` | Date of the most recent entry in `extra.audits` (by date, whatever its position in the list) |
| `last_audit_url` | URL of the most recent entry in `extra.audits` (by date) |
| `id` | Item id, the same value as the API `id` (join key) |

### projects.csv

`docs/projects.csv` has one row per project (item with a maturity), sorted by `project_name`, with a header row. Empty cells mean no value. Dates are `YYYY-MM-DD`.

| Column | Description |
| --- | --- |
| `project_name` | Item name, **lowercased** |
| `maturity` | Item maturity |
| `tag` | TAGs joined with commas |
| `accepted_date` | `extra.accepted` |
| `sandbox_date` | `extra.accepted`, left empty when it equals `extra.incubating` (the project was accepted directly as incubating) |
| `incubating_date` | `extra.incubating` |
| `graduated_date` | `extra.graduated` |
| `archived_date` | `extra.archived` |
| `num_security_audits` | Number of entries in `extra.audits` (`0` when none) |
| `last_security_audit_date` | Date of the most recent entry in `extra.audits` (by date, whatever its position in the list) |
| `id` | Item id, the same value as the API `id` (join key) |

### projects.md

`docs/projects.md` is a human-facing Markdown table with the same rows and values as `projects.csv`. Its first column links the project name to its `homepage_url`, and it has no `id` column. Column positions are not a machine contract: use `projects.csv` to process the data.

- Columns: `project_name`, `maturity`, `tag`, `accepted_date`, `sandbox_date`, `incubating_date`, `graduated_date`, `archived_date`, `num_security_audits`, `last_security_audit_date`.
- In text cells, `\`, `|`, `[` and `]` are escaped with a backslash. In link URLs, spaces, `(`, `)` and `|` are percent-encoded (`%20`, `%28`, `%29`, `%7C`).

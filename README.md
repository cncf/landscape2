# Landscape2

[![CI](https://github.com/cncf/landscape2/actions/workflows/ci.yml/badge.svg)](https://github.com/cncf/landscape2/actions/workflows/ci.yml)

**Landscape2** is a tool that generates interactive landscapes websites.

You can check out how the generated landscapes look like by visiting this [demo of the CNCF landscape](https://cncf.landscape2.io).

<br/>
<table>
    <tr>
        <td width="50%"><img src="docs/screenshots/landscape1.png?raw=true"></td>
        <td width="50%"><img src="docs/screenshots/landscape2.png?raw=true"></td>
    </tr>
    <tr>
        <td width="50%"><img src="docs/screenshots/landscape3.png?raw=true"></td>
        <td width="50%"><img src="docs/screenshots/landscape4.png?raw=true"></td>
    </tr>
</table>

## How it works

**Landscape2** is a CLI tool that generates static websites from the information available in the data sources provided. These data sources are passed to the tool via arguments, usually in the form of *urls* or *local paths*, and are as follows:

- **Landscape data**. The landscape data file is a YAML file that describes the items that will be displayed in the landscape website. For backwards compatibility reasons, this file *must* follow the format and conventions defined in the [CNCF *landscape.yml* file](https://github.com/cncf/landscape/blob/master/landscape.yml).

- **Landscape settings**. The settings file is a YAML file that allows customizing some aspects of the generated landscape website, such as the logo, colors, how to group items or which ones should be featured. For more information about the settings file, please see the [reference documentation](https://github.com/cncf/landscape2/blob/main/docs/config/settings.yml).

- **Landscape guide**. The guide file is a YAML file that defines the content of the guide that will be displayed on the landscape website. For more information, please see the [reference documentation](https://github.com/cncf/landscape2/blob/main/docs/config/guide.yml).

- **Logos location**. Each landscape item *must* provide a valid relative reference to a logo image in SVG format in the landscape data file (item's `logo` field). The logos data source defines the location of those logos (base *url* or *local path*), so that the tool can get them as needed when processing the landscape items.

### Data collection from external services

In addition to the information available in the landscape data file, the tool collects more data *during the landscape generation* from external sources (such as **GitHub** or **Crunchbase**) if the required credentials are provided. These credentials must be provided via environment variables.

- **GitHub**: a list of comma separated GitHub tokens with `public_repo` scope can be provided in the `GITHUB_TOKENS` environment variable. When these tokens are not provided no information from GitHub will be collected. If the expected number of items in the landscape is large it is recommended to provide more than one token to avoid hitting rate limits and speed up the collection of data (the concurrency of the process will be based on the number of tokens provided).

- **Crunchbase**: a Crunchbase API key can be provided in the `CRUNCHBASE_API_KEY` environment variable. If this token is not provided no information from Crunchbase will be collected.

## Installation

The landscape2 CLI tool is distributed in a [container image](https://gallery.ecr.aws/g6m3a0y9/landscape2). This image can be used both to run the tool locally or from your [CI workflows to automate the generation of landscapes](https://github.com/cncf/landscape2-sites/tree/main/.github/workflows). The [landscape2-validate-action](https://github.com/cncf/landscape2-validate-action), which can be used to check that the landscape data file is valid, also uses this image.

Alternatively, it can also be easily built from the source.

### Building from source

You can build **landscape2** from the source by using [Cargo](https://rustup.rs), the Rust package manager. [yarn](https://classic.yarnpkg.com/lang/en/docs/install/) is required during the installation process to build the web application, which will be embedded into the `landscape2` binary as part of the build process.

```text
$ cargo install --git https://github.com/cncf/landscape2

$ landscape2 --help

Landscape2 CLI tool

Usage: landscape2 <COMMAND>

Commands:
  build     Build landscape website
  deploy    Deploy landscape website (experimental)
  validate  Validate landscape data sources files
  help      Print this message or the help of the given subcommand(s)
```

## Usage

You can generate a landscape website by using the `build` subcommand. In the following example we'll generate the CNCF landscape:

*(please note that without the credentials required to collect data from external services the resulting site won't contain all the information available on the demo one)*

```text
$ landscape2 build \
    --settings-url https://raw.githubusercontent.com/cncf/landscape2-sites/main/cncf/settings.yml \
    --data-url https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml \
    --logos-url https://raw.githubusercontent.com/cncf/landscape/master/hosted_logos/ \
    --output-dir ~/Desktop/landscape
```

This command will build the landscape and write the resulting files to the `output-dir` provided. The result is a **static website** that you can deploy on your favorite hosting provider.

We could have also built it using a local checkout of the `cncf/landscape` repository instead of using urls, which in some cases can be considerably faster. The tool accepts providing *local paths* in addition to urls, so we'll modify the previous command to use them for the data file and the logos location:

```text
$ landscape2 build \
    --settings-url https://raw.githubusercontent.com/cncf/landscape2-sites/main/cncf/settings.yml \
    --data-file ./landscape/landscape.yml \
    --logos-path ./landscape/hosted_logos \
    --output-dir ~/Desktop/landscape

 INFO build: landscape2::build: building landscape website..
DEBUG build:get_landscape_data: landscape2::data: getting landscape data from file file="./landscape/landscape.yml"
DEBUG build:get_landscape_settings: landscape2::settings: getting landscape settings from url url="https://raw.githubusercontent.com/cncf/landscape2-sites/main/cncf/settings.yml"
DEBUG build:prepare_logos: landscape2::build: preparing logos
DEBUG build:collect_crunchbase_data: landscape2::crunchbase: collecting organizations information from crunchbase (this may take a while)
DEBUG build:collect_github_data: landscape2::github: collecting repositories information from github (this may take a while)
DEBUG build:generate_datasets: landscape2::build: generating datasets
DEBUG build:generate_datasets: landscape2::build: copying datasets to output directory
DEBUG build:render_index: landscape2::build: rendering index.html file
DEBUG build:copy_web_assets: landscape2::build: copying file asset_path="assets/CNCF_logo_white-a19bf805.svg"
DEBUG build:copy_web_assets: landscape2::build: copying file asset_path="assets/cncf-landscape-horizontal-white-dea015e6.svg"
DEBUG build:copy_web_assets: landscape2::build: copying file asset_path="assets/index-5b26dac9.js"
DEBUG build:copy_web_assets: landscape2::build: copying file asset_path="assets/index-f3d74941.css"
DEBUG build:copy_web_assets: landscape2::build: copying file asset_path="assets/landscape-logo-3e045ab6.svg"
DEBUG build:copy_web_assets: landscape2::build: copying file asset_path="assets/qr-l-01d1d385.svg"
DEBUG build:generate_projects_files: landscape2::build: generating projects.* files
 INFO build: landscape2::build: landscape website built! (took: 1.106s)
```

Some operations like collecting data from external sources or processing a lot of logos images can take some time, specially in landscapes with lots of items. **Landscape2** caches as much of this data as possible to make subsequent runs faster. Please keep this in mind when running the tool periodically from your workflows, and make sure the cache directory (set via `--cache-dir`) is saved and restored on each run.

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

## Code of Conduct

This project follows the [CNCF Code of Conduct](https://github.com/cncf/foundation/blob/master/code-of-conduct.md).

## License

Landscape2 is an Open Source project licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

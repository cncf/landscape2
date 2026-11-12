# UI development

The SolidJS web application is located in this directory. The other UI packages
are the embeddable views (`ui/embed`), the embeddable item details view
(`ui/embed-item`) and the code they all share (`ui/common`). All the commands
below are run from the repository root.

## Prerequisites

- [Node.js](https://nodejs.org) 26.
- [Yarn classic](https://classic.yarnpkg.com/lang/en/docs/install/) 1.22.

## Installing and starting the development server

Install `ui/common` first. The other packages consume `ui/common` from source,
and its own imports resolve from `ui/common/node_modules`, so they fail until it
is installed. `ui/common` has no build or watch step: the consumers pick up its
edits through Vite.

```text
yarn --cwd ui/common install --frozen-lockfile
```

Then install the web application dependencies and start the Vite development
server:

```text
yarn --cwd ui/webapp install --frozen-lockfile
yarn --cwd ui/webapp dev
```

## Wasm bindings

The web application imports the overlay and quiz wasm bindings from
`ui/webapp/wasm/overlay` and `ui/webapp/wasm/quiz`. `cargo build` produces them
(the `landscape2` build script runs `wasm-pack`), or you can build them directly
with [wasm-pack](https://wasm-bindgen.github.io/wasm-pack/installer):

```text
wasm-pack build --target web --dev --out-dir ../../../ui/webapp/wasm/overlay crates/wasm/overlay --locked
wasm-pack build --target web --dev --out-dir ../../../ui/webapp/wasm/quiz crates/wasm/quiz --locked
```

## Data

The development server loads the datasets (`static/data/base.json`,
`full.json`, `stats.json` and `guide.json`), documents, images and logos from
`ui/webapp/static`, which is not part of the repository.

### Local data

Build a landscape with `landscape2` (installed, or `target/debug/landscape2`
after `cargo build`) and copy (or symlink) its `data`, `docs`, `images` and
`logos` directories into `ui/webapp/static`. For example, with the landscape
created by `landscape2 new`:

```text
landscape2 new --output-dir /tmp/l2-dev-site
landscape2 build --data-file /tmp/l2-dev-site/data.yml --settings-file /tmp/l2-dev-site/settings.yml --guide-file /tmp/l2-dev-site/guide.yml --games-file /tmp/l2-dev-site/games.yml --logos-path /tmp/l2-dev-site/logos --output-dir /tmp/l2-dev
mkdir -p ui/webapp/static
cp -R /tmp/l2-dev/data /tmp/l2-dev/docs /tmp/l2-dev/images /tmp/l2-dev/logos ui/webapp/static/
```

Rebuild and copy them again after changing the landscape files.

### Data from an existing landscape

To develop against data from an existing landscape instead, copy the example
environment file and configure the landscape URL:

```text
cp ui/webapp/.env.local.example ui/webapp/.env.local
```

```text
VITE_PROXY_TARGET=https://landscape.cncf.io
```

Restart the development server after changing `.env.local`. The proxy handles
datasets, documents, images, and logos during development only; production
builds are not affected. Remove `VITE_PROXY_TARGET` to use the local generated
assets again.

## Checks

Each UI package (`ui/common`, `ui/embed`, `ui/embed-item` and `ui/webapp`)
provides the same scripts. For example, for the web application:

```text
yarn --cwd ui/webapp lint
yarn --cwd ui/webapp format:diff
yarn --cwd ui/webapp typecheck
yarn --cwd ui/webapp test
yarn --cwd ui/webapp test:coverage
yarn --cwd ui/webapp build
```

`ui/common` has no `build` script. The tests use Vitest with Testing Library and
live in `__tests__` directories next to the module they test. The web
application tests and type checks need the wasm bindings.

## Generated files

The dataset types under `ui/common/src/types/generated/` and the dataset
fixtures under `ui/common/src/types/__fixtures__/` are generated from the Rust
code, and must not be edited by hand. `cargo test --workspace --all-features`
fails when they are out of date. Regenerate them with:

```text
UPDATE_TS_TYPES=1 cargo test -p landscape2-core --features ts contract
UPDATE_TS_TYPES=1 cargo test -p landscape2-overlay --features ts
```

## Linting

All UI packages share the ESLint flat config in `ui/common/eslint.base.js`, and
its plugins load from `ui/common/node_modules`, so install `ui/common` before
linting any package.

Disable a rule only for the line that needs it, with the rule name and the
reason, for example
`{/* eslint-disable-next-line solid/no-innerhtml -- escaped by formatSummaryField */}`.
Block-form `/* eslint-disable rule */` comments are not allowed: without a
matching `eslint-enable` they turn the rule off for the rest of the file. Unused
disable directives are reported as errors.

## Pinned dependencies

`apexcharts` (Stats page charts) is pinned to 3.49.1. `solid-apexcharts` 0.6
declares an `apexcharts` `^4 || ^5` peer dependency, but upgrading apexcharts
to a new major version needs a dedicated migration and a visual check of the
Stats page, so the peer dependency warning is expected for now.

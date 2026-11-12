#!/usr/bin/env node
// Checks the UI production bundles (ui/<app>/dist/assets/*.js) for the
// regressions source-consuming ui/common prevents:
//
// - each app carries at most one Solid runtime (`Symbol("solid-proxy")` is
//   defined once per copy of solid-js), as two runtimes break reactivity
//   across the common boundary;
// - the embed carries no postcss (sanitize-html), moment or full lodash.
//
// Run it after building the UI packages (`cargo build` builds them):
//
//   node scripts/check-ui-bundles.mjs

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Apps whose bundles are checked.
const APPS = ['embed', 'embed-item', 'webapp'];

// Markers of the libraries the embed bundle must not carry.
const EMBED_FORBIDDEN_MARKERS = [
  { library: 'postcss', marker: 'CssSyntaxError' },
  { library: 'moment', marker: 'isMoment' },
  { library: 'full lodash', marker: '__lodash_hash_undefined__' },
];

// Definition of the Solid proxy symbol, present once per solid-js copy.
const SOLID_RUNTIME_MARKER = 'Symbol("solid-proxy")';

// Root directory of the UI packages.
const UI_DIR = fileURLToPath(new URL('../ui/', import.meta.url));

/** Runs every check, printing the failures and setting the exit code. */
const main = () => {
  const failures = [];
  for (const app of APPS) {
    const bundle = readBundle(app);
    if (bundle === null) {
      failures.push(`${app}: no JavaScript files found in ui/${app}/dist/assets (build the UI first)`);
      continue;
    }

    // Check the number of Solid runtimes
    const runtimes = countOccurrences(bundle, SOLID_RUNTIME_MARKER);
    if (runtimes > 1) {
      failures.push(`${app}: ${runtimes} Solid runtimes bundled (${SOLID_RUNTIME_MARKER} defined ${runtimes} times)`);
    }

    // Check the libraries the embed must not carry
    if (app === 'embed') {
      for (const { library, marker } of EMBED_FORBIDDEN_MARKERS) {
        if (bundle.includes(marker)) {
          failures.push(`${app}: bundles ${library} (found ${marker})`);
        }
      }
    }
  }

  if (failures.length > 0) {
    console.error(`UI bundles check failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
    process.exitCode = 1;
    return;
  }
  console.log(`UI bundles check passed (${APPS.join(', ')})`);
};

/** Counts the non-overlapping occurrences of a substring. */
const countOccurrences = (text, substring) => text.split(substring).length - 1;

/** Reads and concatenates the JavaScript files of an app bundle, or returns null when there are none. */
const readBundle = (app) => {
  const assetsDir = join(UI_DIR, app, 'dist', 'assets');
  let files;
  try {
    files = readdirSync(assetsDir).filter((file) => file.endsWith('.js'));
  } catch {
    return null;
  }
  if (files.length === 0) {
    return null;
  }
  return files.map((file) => readFileSync(join(assetsDir, file), 'utf8')).join('\n');
};

main();

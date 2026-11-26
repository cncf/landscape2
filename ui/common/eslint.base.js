// eslint.base.js: flat config shared by every UI package's eslint.config.js.
// Ignore patterns resolve against the directory of the package that imports it.

import js from '@eslint/js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import solidPlugin from 'eslint-plugin-solid';
import tseslint from 'typescript-eslint';

/** Module paths no UI package may import, for the `no-restricted-imports` rule. */
export const RESTRICTED_IMPORT_PATHS = [
  { name: 'lodash', message: 'Import the method module instead, e.g. lodash/isUndefined.' },
  { name: 'moment', message: 'Use the date helpers of common/utils (ui/common/src/utils/dates.ts).' },
];

export default [
  {
    ignores: [
      '**/__fixtures__/',
      'coverage/',
      'dist/',
      'node_modules/',
      'public/',
      'src/types/generated/',
      'static/',
      'wasm/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  solidPlugin.configs['flat/typescript'],
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'no-restricted-imports': ['error', { paths: RESTRICTED_IMPORT_PATHS }],
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
      'solid/no-innerhtml': [
        1,
        {
          allowStatic: true,
        },
      ],
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
];

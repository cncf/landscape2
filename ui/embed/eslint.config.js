// eslint.config.js

import js from '@eslint/js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import solidPlugin from 'eslint-plugin-solid';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  solidPlugin.configs['flat/recommended'],
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'eslint-plugin-solid': solidPlugin.configs['flat/typescript'],
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
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

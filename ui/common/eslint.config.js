// eslint.config.js

import base from './eslint.base.js';

export default [
  ...base,
  {
    // The kiosk suite is JavaScript, so ESLint checks its globals (TypeScript checks them elsewhere)
    files: ['src/**/*.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        DOMParser: 'readonly',
        Response: 'readonly',
        window: 'readonly',
      },
    },
  },
];

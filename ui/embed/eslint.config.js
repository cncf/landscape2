// eslint.config.js

import base, { RESTRICTED_IMPORT_PATHS } from '../common/eslint.base.js';

export default [
  ...base,
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'common',
              message: 'Import from common/embed, common/icons or common/utils (types from common/types).',
            },
            ...RESTRICTED_IMPORT_PATHS,
          ],
        },
      ],
    },
  },
];

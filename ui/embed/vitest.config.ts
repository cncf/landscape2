import { fileURLToPath } from 'node:url';

import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: [
      {
        find: /^common\/test-utils$/,
        replacement: fileURLToPath(new URL('../common/src/test-utils/index.ts', import.meta.url)),
      },
    ],
    dedupe: ['solid-js', 'solid-js/web', 'solid-js/store', 'solid-styled-components', 'lodash'],
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['@testing-library/jest-dom/vitest', './src/test-utils/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/test-utils/**', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
    },
  },
});

import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [solid()],
  resolve: {
    dedupe: [
      'solid-js',
      'solid-js/web',
      'solid-js/store',
      'solid-styled-components',
      '@solid-primitives/resize-observer',
      'lodash',
    ],
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/__tests__/**/*.test.{ts,tsx,js}'],
    setupFiles: ['@testing-library/jest-dom/vitest', './src/test-utils/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      // The kiosk script has no package: its suite lives in src/kiosk/__tests__
      allowExternal: true,
      include: ['src/**/*.{ts,tsx}', '../kiosk/kiosk.js'],
      exclude: ['src/**/__tests__/**', 'src/test-utils/**', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
    },
  },
});

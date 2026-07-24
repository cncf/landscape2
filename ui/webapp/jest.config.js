export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/../common/src', '<rootDir>/../embed-item/src'],
  testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/?(*.)+(spec|test).{ts,tsx}'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        babelConfig: {
          presets: ['./jest.babel-preset.cjs', 'babel-preset-solid'],
        },
        tsconfig: 'tsconfig.jest.json',
      },
    ],
  },
  moduleNameMapper: {
    '^common$': '<rootDir>/src/test-utils/commonMock.tsx',
    '^solid-js$': '<rootDir>/node_modules/solid-js/dist/solid.cjs',
    '^solid-js/web$': '<rootDir>/node_modules/solid-js/web/dist/web.cjs',
    '\\.module\\.css$': '<rootDir>/node_modules/identity-obj-proxy',
    '\\.(css|scss)$': '<rootDir>/node_modules/identity-obj-proxy',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/vite-env.d.ts', '!src/window.d.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};

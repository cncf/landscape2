// Jest setup file for global test configuration

// Mock window object and its properties
Object.defineProperty(window, 'baseDS', {
  value: {},
  writable: true,
  configurable: true
});

// Add any other global test setup here
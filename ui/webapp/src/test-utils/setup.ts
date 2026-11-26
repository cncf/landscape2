/// <reference types="@testing-library/jest-dom/vitest" />
import { cleanup } from '@solidjs/testing-library';
import { installBrowserStubs } from 'common/test-utils';
import { afterEach, beforeEach } from 'vitest';

import { createBaseData } from './fixtures';

const MULTIPLE_SOLID_INSTANCES_WARNING = 'multiple instances of Solid';

// Fail loudly when a broken `resolve.dedupe` loads a second Solid runtime
const warn = console.warn;
console.warn = (...args: unknown[]) => {
  if (args.some((arg) => typeof arg === 'string' && arg.includes(MULTIPLE_SOLID_INSTANCES_WARNING))) {
    throw new Error(`Solid was loaded more than once; check resolve.dedupe in vitest.config.ts: ${args.join(' ')}`);
  }
  warn(...args);
};

installBrowserStubs();

beforeEach(() => {
  window.baseDS = createBaseData();
});

afterEach(() => cleanup());

import { describe, expect, it } from 'vitest';

import { createBaseData } from '../../test-utils/fixtures';
import type { BaseData } from '../../types';
import getLandscapeUrl from '../getLandscapeUrl';

describe('getLandscapeUrl', () => {
  it('should append the configured base path to the provided origin', () => {
    window.baseDS = createBaseData({ base_path: '/some-landscape' });

    expect(getLandscapeUrl('https://example.com')).toBe('https://example.com/some-landscape');
  });

  it('should return the provided origin when no base path is configured', () => {
    window.baseDS = createBaseData();

    expect(getLandscapeUrl('https://example.com')).toBe('https://example.com');
  });

  it('should return the provided origin when base data is not available', () => {
    window.baseDS = undefined as unknown as BaseData;

    expect(getLandscapeUrl('https://example.com')).toBe('https://example.com');
  });
});

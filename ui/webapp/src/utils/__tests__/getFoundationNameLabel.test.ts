import { describe, expect, it } from 'vitest';

import getFoundationNameLabel from '../getFoundationNameLabel';

describe('getFoundationNameLabel', () => {
  it('lowercases the name and removes spaces', () => {
    expect(getFoundationNameLabel('Cloud Native Foundation')).toBe('cloudnativefoundation');
  });

  it('returns an empty label for an empty name', () => {
    expect(getFoundationNameLabel('')).toBe('');
  });
});

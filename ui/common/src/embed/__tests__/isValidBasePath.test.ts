import { describe, expect, it } from 'vitest';

import { isValidBasePath, parseBasePath } from '../isValidBasePath';

describe('isValidBasePath', () => {
  it.each(['', '/', '/landscape', '/a/b-c_d', '/a.b/~c'])('accepts %j', (value) => {
    expect(isValidBasePath(value)).toBe(true);
  });

  it.each([
    '//evil.example',
    'https://evil.example',
    '/a/../b',
    '/..',
    'javascript:x',
    '/a b',
    'landscape',
    '/a?b',
    '/a#b',
    '/a\\b',
  ])('rejects %j', (value) => {
    expect(isValidBasePath(value)).toBe(false);
  });
});

describe('parseBasePath', () => {
  it.each([
    [null, ''],
    ['', ''],
    ['/', ''],
    ['//', null],
    ['/landscape', '/landscape'],
    ['/landscape/', '/landscape'],
    ['/a/b//', '/a/b'],
  ])('reads %j as %j', (value, basePath) => {
    expect(parseBasePath(value)).toBe(basePath);
  });

  it.each(['//evil.example', 'https://evil.example', '/a/../b'])('returns null for %j', (value) => {
    expect(parseBasePath(value)).toBeNull();
  });
});

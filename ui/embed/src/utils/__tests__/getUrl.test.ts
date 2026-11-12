import { afterEach, describe, expect, it } from 'vitest';

import getUrl from '../getUrl';

describe('getUrl', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it.each([
    ['without base-path', '', ''],
    ['with base-path=/', '&base-path=/', ''],
    ['with base-path=/landscape', '&base-path=/landscape', '/landscape'],
    ['with base-path=/landscape/', '&base-path=/landscape/', '/landscape'],
    ['with an invalid base-path', '&base-path=//evil.example', ''],
  ])('returns the landscape url %s', (_, param, basePath) => {
    window.history.replaceState(null, '', `/embed/embed.html?key=category-1${param}`);

    expect(getUrl()).toBe(`${location.origin}${basePath}`);
  });
});

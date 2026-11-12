import { describe, expect, it } from 'vitest';

import { cutString } from '../cutString';

describe('cutString', () => {
  it.each([
    ['a string of exactly the default length unchanged', '0123456789', undefined, '0123456789'],
    ['a string longer than the default length', '0123456789A', undefined, '0123456789...'],
    ['a short string unchanged', 'short', undefined, 'short'],
    ['a string longer than a custom length', 'Landscape', 4, 'Land...'],
    ['a string of exactly a custom length unchanged', 'Land', 4, 'Land'],
  ])('returns %s', (_, value, length, expected) => {
    expect(cutString(value, length)).toBe(expected);
  });
});

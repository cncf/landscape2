import { describe, expect, it } from 'vitest';

import clampInt from '../clampInt';

describe('clampInt', () => {
  it.each([
    ['a value in range', '20', 20],
    ['the lowest value', '10', 10],
    ['the highest value', '60', 60],
    ['a value below the range', '2', 10],
    ['a negative value', '-5', 10],
    ['a value above the range', '100', 60],
    ['a decimal value', '20.7', 20],
  ])('returns the clamped integer for %s', (_, value, expected) => {
    expect(clampInt(value, 10, 60)).toBe(expected);
  });

  it.each([
    ['an empty value', ''],
    ['a blank value', ' '],
    ['a non numeric value', 'abc'],
  ])('returns undefined for %s', (_, value) => {
    expect(clampInt(value, 10, 60)).toBeUndefined();
  });
});

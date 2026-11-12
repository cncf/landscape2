import { describe, expect, it } from 'vitest';

import { sortObjectByValue } from '../sortObjectByValue';

describe('sortObjectByValue', () => {
  it.each([
    ['descending by default', { a: 1, b: 3, c: 2 }, undefined, ['b', 'c', 'a']],
    ['descending', { a: 1, b: 3, c: 2 }, 'desc' as const, ['b', 'c', 'a']],
    ['ascending', { a: 1, b: 3, c: 2 }, 'asc' as const, ['a', 'c', 'b']],
    ['ties in insertion order when descending', { a: 2, b: 5, c: 2 }, 'desc' as const, ['b', 'a', 'c']],
    ['ties in insertion order when ascending', { a: 2, b: 1, c: 2 }, 'asc' as const, ['b', 'a', 'c']],
    ['an empty object as no keys', {}, undefined, []],
  ])('sorts the keys %s', (_, data, order, expected) => {
    expect(sortObjectByValue(data, order)).toEqual(expected);
  });
});

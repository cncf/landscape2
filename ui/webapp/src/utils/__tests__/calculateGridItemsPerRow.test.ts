import { describe, expect, it } from 'vitest';

import calculateGridItemsPerRow from '../calculateGridItemsPerRow';

describe('calculateGridItemsPerRow', () => {
  it.each([
    ['the full width with paddings', 100, 1000, 65, undefined, 13],
    ['half the width with paddings', 50, 1000, 65, undefined, 6],
    ['the full width without paddings', 100, 1000, 65, true, 14],
    ['a width that fits exactly one item without paddings', 100, 65, 65, true, 1],
    ['a width below one item', 100, 60, 65, true, 0],
  ])('returns the items that fit in %s', (_, percentage, containerWidth, itemWidth, noPadding, expected) => {
    expect(calculateGridItemsPerRow(percentage, containerWidth, itemWidth, noPadding)).toBe(expected);
  });

  it.each([
    ['an empty container', 0],
    ['a container narrower than its paddings', 10],
  ])('returns at least 0 for %s', (_, containerWidth) => {
    expect(calculateGridItemsPerRow(100, containerWidth, 65)).toBe(0);
  });
});

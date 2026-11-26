import { describe, expect, it } from 'vitest';

import { buildBarSeries, buildWeeklyTimestamps, formatShare } from '../chartData';

describe('buildBarSeries', () => {
  it('keeps zero values aligned with their categories', () => {
    expect(buildBarSeries({ 2019: 0, 2020: 500, 2021: 300 }, ['2019', '2020', '2021'])).toEqual({
      categories: ['2019', '2020', '2021'],
      values: [0, 500, 300],
    });
  });

  it('gives 0 to the keys missing from the data', () => {
    expect(buildBarSeries({ 2020: 500 }, ['2019', '2020', '2021'])).toEqual({
      categories: ['2019', '2020', '2021'],
      values: [0, 500, 0],
    });
  });
});

describe('buildWeeklyTimestamps', () => {
  it('counts weeks back so the last timestamp is the reference date', () => {
    expect(buildWeeklyTimestamps(3, '2026-01-15')).toEqual([
      Date.parse('2026-01-01'),
      Date.parse('2026-01-08'),
      Date.parse('2026-01-15'),
    ]);
  });

  it('returns no timestamps for no values', () => {
    expect(buildWeeklyTimestamps(0, '2026-01-15')).toEqual([]);
  });
});

describe('formatShare', () => {
  it.each([
    [25, 100, '25%'],
    [33.333, 100, '33.33%'],
    [1, 3, '33.33%'],
    [3, 3, '100%'],
  ])('formats %d of %d as %s', (value, total, expected) => {
    expect(formatShare(value, total)).toBe(expected);
  });
});

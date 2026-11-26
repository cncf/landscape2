import { subtractWeeks } from 'common';
import isInteger from 'lodash/isInteger';

/** Font family of every stats chart, the webapp's body font stack. */
export const CHART_FONT_FAMILY = "'Lato', Roboto, 'Helvetica Neue', Arial, sans-serif";

/** Categories and values of a bar chart series, aligned by index. */
export interface BarSeries {
  categories: string[];
  values: number[];
}

/**
 * Builds a bar chart series with one value per key, in the order of the keys. A key
 * missing from the data gets 0, so every category keeps its bar.
 */
export const buildBarSeries = (data: Record<string, number>, keys: string[]): BarSeries => ({
  categories: keys,
  values: keys.map((key) => data[key] ?? 0),
});

/**
 * Builds the timestamps of `count` weekly values that end on the reference date: the
 * last value is the reference date, and each previous one is a week earlier.
 */
export const buildWeeklyTimestamps = (count: number, referenceDate: string): number[] => {
  const reference = new Date(referenceDate);
  return Array.from({ length: count }, (_, index) => subtractWeeks(reference, count - index - 1).getTime());
};

/** Formats the share of the total that a value represents, as an integer or 2-decimal percentage. */
export const formatShare = (value: number, total: number): string => {
  const percentage = (value * 100) / total;
  return `${isInteger(percentage) ? percentage : percentage.toFixed(2)}%`;
};

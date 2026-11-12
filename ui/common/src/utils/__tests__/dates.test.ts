import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatMonthYear, parseLocalDate, parseYearMonth, subtractMonths, subtractWeeks } from '../dates';

// Host time zones on both sides of UTC. Local-time code gives other results
// near midnight in at least one of them, also when the suite runs in UTC (CI)
const HOST_TIME_ZONES = ['America/Los_Angeles', 'Pacific/Kiritimati'];

describe('formatMonthYear', () => {
  describe.each(HOST_TIME_ZONES)('with the host in %s', (timeZone) => {
    beforeEach(() => {
      stubHostTimeZone(timeZone);
    });

    it.each([
      ['a start-of-year date', new Date(Date.UTC(2024, 0, 1)), "Jan '24"],
      ['a start-of-year timestamp', '2024-01-01T00:00:00Z', "Jan '24"],
      ['an end-of-year date', new Date(Date.UTC(2024, 11, 31, 23, 59, 59)), "Dec '24"],
      ['an end-of-year timestamp', '2024-12-31T23:59:59Z', "Dec '24"],
      ['a year needing a leading zero', '2005-09-15T12:00:00Z', "Sep '05"],
    ])('formats %s in UTC', (_, date, expected) => {
      expect(formatMonthYear(date)).toBe(expected);
    });
  });

  it('returns the invalid date label for an unparsable value', () => {
    expect(formatMonthYear('not a date')).toBe('Invalid date');
  });
});

describe('subtractMonths', () => {
  describe.each(HOST_TIME_ZONES)('with the host in %s', (timeZone) => {
    beforeEach(() => {
      stubHostTimeZone(timeZone);
    });

    it.each([
      ['across a year boundary', Date.UTC(2024, 1, 15, 10), 3, Date.UTC(2023, 10, 15, 10)],
      ['across a daylight saving time change', Date.UTC(2024, 3, 15, 12), 2, Date.UTC(2024, 1, 15, 12)],
      ['within the same year', Date.UTC(2024, 6, 1), 2, Date.UTC(2024, 4, 1)],
      ['clamping the day to a shorter month', Date.UTC(2024, 2, 31), 1, Date.UTC(2024, 1, 29)],
      ['clamping the day across a year boundary', Date.UTC(2024, 0, 31), 2, Date.UTC(2023, 10, 30)],
      ['by zero months', Date.UTC(2024, 4, 20), 0, Date.UTC(2024, 4, 20)],
    ])('subtracts months %s in UTC', (_, date, months, expected) => {
      expect(subtractMonths(new Date(date), months).getTime()).toBe(expected);
    });
  });

  it('does not mutate the date provided', () => {
    const date = new Date(Date.UTC(2024, 1, 15));

    subtractMonths(date, 3);

    expect(date.getTime()).toBe(Date.UTC(2024, 1, 15));
  });
});

describe('subtractWeeks', () => {
  describe.each(HOST_TIME_ZONES)('with the host in %s', (timeZone) => {
    beforeEach(() => {
      stubHostTimeZone(timeZone);
    });

    it.each([
      ['across a year boundary', Date.UTC(2024, 0, 3, 8), 1, Date.UTC(2023, 11, 27, 8)],
      ['across a daylight saving time change', Date.UTC(2024, 2, 15, 12), 2, Date.UTC(2024, 2, 1, 12)],
      ['by several weeks', Date.UTC(2024, 5, 30), 4, Date.UTC(2024, 5, 2)],
      ['by zero weeks', Date.UTC(2024, 5, 30), 0, Date.UTC(2024, 5, 30)],
    ])('subtracts weeks %s in UTC', (_, date, weeks, expected) => {
      expect(subtractWeeks(new Date(date), weeks).getTime()).toBe(expected);
    });
  });
});

describe('parseYearMonth', () => {
  it('parses the year and the month number', () => {
    expect(parseYearMonth('2024-03')).toEqual({ year: 2024, month: 3 });
  });

  it('returns NaN parts for a value that is not YYYY-MM', () => {
    expect(parseYearMonth('2024')).toEqual({ year: NaN, month: NaN });
  });
});

describe('parseLocalDate', () => {
  describe.each(HOST_TIME_ZONES)('with the host in %s', (timeZone) => {
    beforeEach(() => {
      stubHostTimeZone(timeZone);
    });

    it.each([['2024-03-05'], ['2024/03/05']])('parses %s at local midnight', (value) => {
      expect(parseLocalDate(value)).toEqual(new Date(2024, 2, 5));
    });
  });

  it.each([['2024-03/05'], ['05/03/2024'], ['2024-03-05T10:00:00Z']])('returns an invalid date for %s', (value) => {
    expect(Number.isNaN(parseLocalDate(value).getTime())).toBe(true);
  });
});

// Helpers.

/**
 * Switches the host time zone for the current test (restored by
 * `unstubEnvs`), and fails when the runtime does not apply it.
 */
function stubHostTimeZone(timeZone: string) {
  vi.stubEnv('TZ', timeZone);
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(timeZone);
}

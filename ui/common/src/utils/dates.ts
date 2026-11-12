// Label of invalid dates, the one the date labels have always shown.
const INVALID_DATE_LABEL = 'Invalid date';

// Local date in YYYY-MM-DD or YYYY/MM/DD format (same separator twice).
const LOCAL_DATE_PATTERN = /^(\d{4})([-/])(\d{2})\2(\d{2})$/;

// Short month name formatter, in UTC so labels do not depend on the time zone.
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

// Year and month in YYYY-MM format.
const YEAR_MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

/**
 * Formats a date as its short month name and two-digit year, in UTC.
 *
 * @param date - Date, or a string `Date` can parse (e.g. an ISO 8601 timestamp)
 * @returns Label like `Jan '24`, or `Invalid date` when the date is invalid
 */
export const formatMonthYear = (date: Date | string): string => {
  const value = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) {
    return INVALID_DATE_LABEL;
  }
  const year = String(value.getUTCFullYear() % 100).padStart(2, '0');
  return `${MONTH_FORMATTER.format(value)} '${year}`;
};

/**
 * Parses a `YYYY-MM-DD` or `YYYY/MM/DD` date at local midnight.
 *
 * @param value - Date to parse
 * @returns Local date, or an invalid date when the value has another format
 */
export const parseLocalDate = (value: string): Date => {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) {
    return new Date(NaN);
  }
  const [, year, , month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
};

/**
 * Parses a `YYYY-MM` year and month.
 *
 * @param value - Year and month to parse
 * @returns Year and month number (1 for January), both `NaN` when the value has another format
 */
export const parseYearMonth = (value: string): { year: number; month: number } => {
  const match = YEAR_MONTH_PATTERN.exec(value);
  if (!match) {
    return { year: NaN, month: NaN };
  }
  return { year: Number(match[1]), month: Number(match[2]) };
};

/**
 * Subtracts calendar months from a date, in UTC. The day is clamped to the
 * length of the resulting month, so March 31 minus one month is the last day
 * of February.
 *
 * @param date - Date to subtract from (not mutated)
 * @param months - Number of months to subtract
 * @returns New date
 */
export const subtractMonths = (date: Date, months: number): Date => {
  const result = new Date(date.getTime());
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  result.setUTCDate(Math.min(date.getUTCDate(), getDaysInUTCMonth(result)));
  return result;
};

/**
 * Subtracts weeks of seven days from a date, in UTC.
 *
 * @param date - Date to subtract from (not mutated)
 * @param weeks - Number of weeks to subtract
 * @returns New date
 */
export const subtractWeeks = (date: Date, weeks: number): Date => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() - weeks * 7);
  return result;
};

/** Returns the number of days of the UTC month of the date provided. */
const getDaysInUTCMonth = (date: Date): number =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();

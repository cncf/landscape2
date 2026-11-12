import isUndefined from 'lodash/isUndefined';

import { UpcomingEvent } from '../types';

/**
 * Returns the upcoming event while it is active: until the end of its last day, in
 * local time. The `YYYY-MM-DD` end date is compared with today's local date as plain
 * strings, which sort chronologically.
 *
 * @param event - Upcoming event of the landscape, if any
 * @param now - Current date
 * @returns The event while it is active, `null` otherwise
 */
const getActiveEvent = (event: UpcomingEvent | undefined, now: Date): UpcomingEvent | null => {
  if (isUndefined(event)) return null;
  return toLocalIsoDate(now) <= event.end ? event : null;
};

export default getActiveEvent;

/** Formats the local date of a date as `YYYY-MM-DD`. */
const toLocalIsoDate = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

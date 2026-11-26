import { describe, expect, it } from 'vitest';

import type { UpcomingEvent } from '../../types';
import getActiveEvent from '../getActiveEvent';

/** Local afternoon of the day the checks run. */
const NOW = new Date(2024, 4, 15, 15, 30);

describe('getActiveEvent', () => {
  it.each([
    ['hides an event that ended yesterday', '2024-05-14', false],
    ['shows an event that ends today', '2024-05-15', true],
    ['shows an event that ends tomorrow', '2024-05-16', true],
  ])('%s', (_, end, active) => {
    const event = createEvent(end);

    expect(getActiveEvent(event, NOW)).toBe(active ? event : null);
  });

  it('compares the local date, so the event stays active until the last minute of its end day', () => {
    const event = createEvent('2024-05-15');

    expect(getActiveEvent(event, new Date(2024, 4, 15, 23, 59))).toBe(event);
    expect(getActiveEvent(event, new Date(2024, 4, 16, 0, 0))).toBeNull();
  });

  it('gives null when there is no event', () => {
    expect(getActiveEvent(undefined, NOW)).toBeNull();
  });
});

// Helpers.

/** Creates an upcoming event ending on the date provided. */
const createEvent = (end: string): UpcomingEvent => ({
  banner_url: 'https://example.com/banner.png',
  details_url: 'https://example.com/event',
  end,
  name: 'KubeCon',
  start: '2024-05-13',
});

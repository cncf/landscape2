import { render, screen, waitFor } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EXPLORE_PATH, GUIDE_PATH } from '../../../data';
import { createBaseData } from '../../../test-utils/fixtures';
import { renderWithRouter } from '../../../test-utils/render';
import type { UpcomingEvent } from '../../../types';
import {
  UpcomingEventProvider,
  useEventContent,
  useEventVisibleContent,
  useSetEventHiddenContent,
} from '../upcomingEvent';

/** Upcoming event that ends the day the tests run. */
const EVENT: UpcomingEvent = {
  banner_url: 'https://example.com/banner.png',
  details_url: 'https://example.com/event',
  end: '2024-05-15',
  name: 'KubeCon',
  start: '2024-05-13',
};

describe('UpcomingEventProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2024, 4, 15, 18, 0), toFake: ['Date'] });
    window.baseDS = createBaseData({ upcoming_event: EVENT });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the active event only on Explore', async () => {
    // Render the store on Explore
    const { history } = renderUpcomingEvent(EXPLORE_PATH);
    expect(screen.getByText('KubeCon: visible')).toBeInTheDocument();

    // Go to the guide and verify the event is hidden
    history.set({ value: GUIDE_PATH });
    await waitFor(() => expect(screen.getByText('KubeCon: hidden')).toBeInTheDocument());

    // Come back to Explore and verify the event shows again
    history.back();
    await waitFor(() => expect(screen.getByText('KubeCon: visible')).toBeInTheDocument());
  });

  it('hides the event after it is dismissed', async () => {
    const user = userEvent.setup();
    renderUpcomingEvent(EXPLORE_PATH);

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.getByText('KubeCon: hidden')).toBeInTheDocument();
  });

  it('hides the event once it has ended', () => {
    window.baseDS = createBaseData({ upcoming_event: { ...EVENT, end: '2024-05-14' } });

    renderUpcomingEvent(EXPLORE_PATH);

    expect(screen.getByText('no event: hidden')).toBeInTheDocument();
  });

  it('names the hook that needs the provider when it is missing', () => {
    expect(() => render(() => <UpcomingEventProbe />)).toThrow(
      'useUpcomingEventContext must be used within an UpcomingEventProvider'
    );
  });
});

// Helpers.

/** Renders the store at the URL provided. */
const renderUpcomingEvent = (url: string) =>
  renderWithRouter(
    () => (
      <UpcomingEventProvider>
        <UpcomingEventProbe />
      </UpcomingEventProvider>
    ),
    { url }
  );

/** Displays the store event and visibility, with a button that dismisses the event. */
const UpcomingEventProbe = () => {
  const event = useEventContent();
  const visible = useEventVisibleContent();
  const setHiddenEvent = useSetEventHiddenContent();
  return (
    <>
      <span>
        {event()?.name ?? 'no event'}: {visible() ? 'visible' : 'hidden'}
      </span>
      <button type="button" onClick={() => setHiddenEvent(true)}>
        Dismiss
      </button>
    </>
  );
};

import { fireEvent, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EXPLORE_PATH } from '../../../data';
import { createBaseData } from '../../../test-utils/fixtures';
import { renderWithRouter } from '../../../test-utils/render';
import type { UpcomingEvent } from '../../../types';
import { UpcomingEventProvider } from '../../stores/upcomingEvent';
import UpcomingEvents from '..';

/** Upcoming event that ends after the day the tests run. */
const EVENT: UpcomingEvent = {
  banner_url: 'https://example.com/banner.png',
  details_url: 'https://example.com/event',
  end: '2024-05-16',
  name: 'KubeCon + CloudNativeCon',
  start: '2024-05-13',
};

vi.mock('../../stores/activeItem', () => ({ useActiveItemId: () => () => undefined }));

describe('UpcomingEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2024, 4, 15, 12, 0), toFake: ['Date'] });
    window.baseDS = createBaseData({ upcoming_event: EVENT });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('names the banner image after the event', () => {
    renderBanner();

    const image = screen.getByRole('img', { name: EVENT.name });
    expect(image).toHaveAttribute('alt', EVENT.name);
    expect(image).toHaveAttribute('title', EVENT.name);
    expect(image).toHaveAttribute('src', EVENT.banner_url);
  });

  it('hides the banner when it is closed', async () => {
    const user = userEvent.setup();
    renderBanner();
    expect(screen.getByRole('img', { name: EVENT.name })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close "Upcoming events" banner' }));

    expect(screen.queryByRole('img', { name: EVENT.name })).not.toBeInTheDocument();
  });

  it('hides the banner when its image fails to load', () => {
    renderBanner();

    fireEvent.error(screen.getByRole('img', { name: EVENT.name }));

    expect(screen.queryByRole('img', { name: EVENT.name })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close "Upcoming events" banner' })).not.toBeInTheDocument();
  });
});

// Helpers.

/** Renders the banner on Explore with the upcoming event store. */
const renderBanner = () =>
  renderWithRouter(
    () => (
      <UpcomingEventProvider>
        <UpcomingEvents />
      </UpcomingEventProvider>
    ),
    { url: EXPLORE_PATH }
  );

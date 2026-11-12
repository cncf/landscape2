import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router';
import { render, screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createTextElement } from 'common/test-utils';
import { createSignal, type JSXElement } from 'solid-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GUIDE_PATH, LOGOS_PREVIEW_PATH, PROJECTS_PATH, STATS_PATH } from '../../data';
import Layout from '..';
import Logos from '../logos';
import Projects from '../projects';

const { MockProvider, mockRetryFullData } = vi.hoisted(() => ({
  MockProvider: (props: { children?: JSXElement }) => <>{props.children}</>,
  mockRetryFullData: vi.fn(),
}));

const [mockFullDataStatus, mockSetFullDataStatus] = createSignal<'error' | 'loading' | 'ready'>('loading');
const mockFullDataReady = () => mockFullDataStatus() === 'ready';

vi.mock('../common/DownloadDropdown', () => ({ default: () => createTextElement('Download dropdown') }));
vi.mock('../common/itemModal', () => ({ default: () => createTextElement('Item modal') }));
vi.mock('../common/Searchbar', () => ({ default: () => createTextElement('Searchbar') }));
vi.mock('../common/zoomModal', () => ({ default: () => createTextElement('Zoom modal') }));
vi.mock('../navigation/EmbedModal', () => ({ default: () => createTextElement('Embed modal') }));
vi.mock('../navigation/Footer', () => ({ default: () => createTextElement('Footer') }));
vi.mock('../navigation/MobileHeader', () => ({ default: () => createTextElement('Mobile header') }));
vi.mock('../stores/activeItem', () => ({ ActiveItemProvider: MockProvider, useUpdateActiveItemId: () => vi.fn() }));
vi.mock('../stores/financesData', () => ({ FinancesDataProvider: MockProvider }));
vi.mock('../stores/fullData', () => ({
  FullDataProvider: MockProvider,
  useFullDataReady: () => mockFullDataReady,
  useFullDataStatus: () => mockFullDataStatus,
  useRetryFullData: () => mockRetryFullData,
}));
vi.mock('../stores/gridWidth', () => ({ GridWidthProvider: MockProvider }));
vi.mock('../stores/groupActive', () => ({ GroupActiveProvider: MockProvider }));
vi.mock('../stores/guideFile', () => ({ GuideFileProvider: MockProvider }));
vi.mock('../stores/mobileTOC', () => ({ MobileTOCProvider: MockProvider }));
vi.mock('../stores/upcomingEvent', () => ({ UpcomingEventProvider: MockProvider }));
vi.mock('../stores/viewMode', () => ({ ViewModeProvider: MockProvider }));
vi.mock('../stores/visibleZoomSection', () => ({ VisibleZoomSectionProvider: MockProvider }));
vi.mock('../stores/zoom', () => ({ ZoomProvider: MockProvider }));
vi.mock('../upcomingEvents', () => ({ default: () => createTextElement('Upcoming events') }));

/** Error message of the routes that need the full data. */
const FULL_DATA_ERROR = "We couldn't load the landscape data.";

describe('Layout', () => {
  beforeEach(() => {
    window.statsDS = { generated_at: '2024-06-01T00:00:00Z' };
    mockRetryFullData.mockReset();
    mockSetFullDataStatus('error');
  });

  it.each([
    ['Guide', GUIDE_PATH],
    ['Stats', STATS_PATH],
  ])('keeps the %s content when the full data fails to load', (page, path) => {
    renderLayout(path);

    expect(screen.getByText(`${page} content`)).toBeInTheDocument();
    expect(screen.queryByText(FULL_DATA_ERROR)).not.toBeInTheDocument();
  });

  it.each([
    ['Projects', PROJECTS_PATH],
    ['Logos preview', LOGOS_PREVIEW_PATH],
  ])('replaces the %s page with the load error when the full data fails to load', (_, path) => {
    renderLayout(path);

    expect(screen.getByText(FULL_DATA_ERROR)).toBeInTheDocument();
    expect(mainNavigation()).toBeInTheDocument();
  });

  it('retries loading the full data from the "Try again" button', async () => {
    const user = userEvent.setup();

    // Render Projects after the full data failed to load
    renderLayout(PROJECTS_PATH);
    expect(mockRetryFullData).not.toHaveBeenCalled();

    // Click "Try again" and check the full data load is retried once
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRetryFullData).toHaveBeenCalledTimes(1);
  });

  it('keeps the item and zoom modals mounted when the full data fails to load', () => {
    renderLayout(GUIDE_PATH);

    expect(screen.getByText('Item modal')).toBeInTheDocument();
    expect(screen.getByText('Zoom modal')).toBeInTheDocument();
  });

  it('links the Stats page from the header when the landscape has stats', () => {
    renderLayout(GUIDE_PATH);

    expect(within(mainNavigation()).getByRole('link', { name: 'Stats' })).toHaveAttribute('href', STATS_PATH);
  });

  it('hides the Stats link from the header when the landscape has no stats', () => {
    window.statsDS = {} as typeof window.statsDS;

    renderLayout(GUIDE_PATH);

    expect(within(mainNavigation()).getByRole('link', { name: 'Explore' })).toBeInTheDocument();
    expect(within(mainNavigation()).queryByRole('link', { name: 'Stats' })).toBeNull();
  });
});

// Helpers.

/** Returns the main navigation of the header. */
const mainNavigation = (): HTMLElement => screen.getByRole('navigation', { name: 'Main' });

/** Renders the layout as the router root, with Guide and Stats stubs and the real Projects and Logos pages. */
const renderLayout = (url: string) => {
  const history = createMemoryHistory();
  history.set({ value: url });

  return render(() => (
    <MemoryRouter history={history} root={Layout}>
      <Route path={GUIDE_PATH} component={() => <div>Guide content</div>} />
      <Route path={STATS_PATH} component={() => <div>Stats content</div>} />
      <Route path={PROJECTS_PATH} component={Projects} />
      <Route path={LOGOS_PREVIEW_PATH} component={Logos} />
    </MemoryRouter>
  ));
};

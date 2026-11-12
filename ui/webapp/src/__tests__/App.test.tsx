import { render, screen, waitFor } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createTextElement } from 'common/test-utils';
import type { JSXElement } from 'solid-js';
import { createMutable } from 'solid-js/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../App';
import { createBaseData } from '../test-utils/fixtures';
import type { BaseData } from '../types';

/** Colors of the landscape overlay, different from the fixture ones. */
const OVERLAY_COLORS: BaseData['colors'] = {
  color1: 'rgba(1, 1, 1, 1)',
  color2: 'rgba(2, 2, 2, 1)',
  color3: 'rgba(3, 3, 3, 1)',
  color4: 'rgba(4, 4, 4, 1)',
  color5: 'rgba(5, 5, 5, 1)',
  color6: 'rgba(6, 6, 6, 1)',
  color7: 'rgba(7, 7, 7, 1)',
};

const { MockLayout, mockApplyColors, mockCheckIfOverlayInQuery, mockGetOverlayBaseData } = vi.hoisted(() => ({
  MockLayout: (props: { children?: JSXElement }) => <>{props.children}</>,
  mockApplyColors: vi.fn(),
  mockCheckIfOverlayInQuery: vi.fn<() => boolean>(),
  mockGetOverlayBaseData: vi.fn<() => Promise<BaseData | undefined>>(),
}));

vi.mock('common/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('common/utils')>()),
  applyColors: mockApplyColors,
}));
vi.mock('../layout', () => ({ default: MockLayout }));
vi.mock('../layout/explore', () => ({ default: () => createTextElement('Explore page') }));
vi.mock('../layout/finances', () => ({ default: () => createTextElement('Finances page') }));
vi.mock('../layout/games', () => ({ default: () => createTextElement('Games page') }));
vi.mock('../layout/guide', () => ({ default: () => createTextElement('Guide page') }));
vi.mock('../layout/logos', () => ({ default: () => createTextElement('Logos page') }));
vi.mock('../layout/notFound', () => ({ default: () => createTextElement('Not found page') }));
vi.mock('../layout/projects', () => ({ default: () => createTextElement('Projects page') }));
vi.mock('../layout/screenshots', () => ({ default: () => createTextElement('Screenshots page') }));
vi.mock('../layout/stats', () => ({ default: () => createTextElement('Stats page') }));
vi.mock('../utils/itemsDataGetter', () => ({ default: { init: vi.fn(), prepareGroups: vi.fn() } }));
vi.mock('../utils/overlayData', () => ({
  default: { checkIfOverlayInQuery: mockCheckIfOverlayInQuery, getOverlayBaseData: mockGetOverlayBaseData },
}));

/** Observers created by App, with the elements each one observes. */
const resizeObservers: MockResizeObserver[] = [];

describe('App', () => {
  beforeEach(() => {
    window.baseDS = createBaseData({
      groups: [
        { categories: ['Category 1'], name: 'Group 1', normalized_name: 'group-1' },
        { alias: 'projects', categories: ['Category 2'], name: 'Projects', normalized_name: 'projects-group' },
      ],
    });
    mockCheckIfOverlayInQuery.mockReturnValue(false);
    resizeObservers.length = 0;
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('redirects a group alias to Explore, keeping the query and the hash', async () => {
    // Open the alias path with other params and a hash
    window.history.replaceState(null, '', '/projects?view-mode=card&overlay-data=u#h');
    render(() => <App />);

    // Verify the redirect adds the group to the existing query and keeps the hash
    await waitFor(() => expect(currentUrl()).toBe('/?view-mode=card&overlay-data=u&group=projects-group#h'));
    expect(await screen.findByText('Explore page')).toBeInTheDocument();
  });

  it('renders the not found page for an unknown path', async () => {
    window.history.replaceState(null, '', '/unknown');
    render(() => <App />);

    expect(await screen.findByText('Not found page')).toBeInTheDocument();
    expect(currentUrl()).toBe('/unknown');
  });

  it.each([
    ['an Error', new Error('boom'), 'boom'],
    ['a string', 'WebAssembly is not supported in this browser', 'WebAssembly is not supported in this browser'],
  ])('shows the message of an overlay load rejected with %s', async (_, reason, message) => {
    mockCheckIfOverlayInQuery.mockReturnValue(true);
    mockGetOverlayBaseData.mockRejectedValue(reason);

    render(() => <App />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Error setting up landscape overlay');
    expect(alert).toHaveTextContent(message);
    expect(screen.queryByText('Setting up landscape overlay...')).not.toBeInTheDocument();
  });

  it('shows the overlay banner in overlay mode', async () => {
    mockCheckIfOverlayInQuery.mockReturnValue(true);
    mockGetOverlayBaseData.mockResolvedValue(createBaseData());

    render(() => <App />);

    expect(screen.getByText('Landscape overlay enabled')).toBeInTheDocument();
    expect(await screen.findByText('Explore page')).toBeInTheDocument();
    expect(screen.getByText('Landscape overlay enabled')).toBeInTheDocument();
  });

  it('shows no overlay banner outside overlay mode', async () => {
    render(() => <App />);

    expect(await screen.findByText('Explore page')).toBeInTheDocument();
    expect(screen.queryByText('Landscape overlay enabled')).not.toBeInTheDocument();
  });

  it('applies the landscape colors on load and the overlay ones once the overlay loads', async () => {
    // Load the app in overlay mode, where the overlay replaces the base dataset
    const overlayBaseData = createBaseData({ colors: OVERLAY_COLORS });
    mockCheckIfOverlayInQuery.mockReturnValue(true);
    mockGetOverlayBaseData.mockImplementation(async () => {
      window.baseDS = overlayBaseData;
      return overlayBaseData;
    });
    const baseColors = window.baseDS.colors;

    render(() => <App />);
    await screen.findByText('Explore page');

    // Verify the colors were applied twice, the overlay ones last
    expect(mockApplyColors).toHaveBeenCalledTimes(2);
    expect(mockApplyColors).toHaveBeenNthCalledWith(1, baseColors);
    expect(mockApplyColors).toHaveBeenNthCalledWith(2, OVERLAY_COLORS);
  });

  it('shows the motd, dismisses it, and shows it again when its content changes', async () => {
    // Render the app with a motd whose element is 44px tall
    const user = userEvent.setup();
    let motdHeight = 44;
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => motdHeight);
    window.baseDS = createMutable(createBaseData({ header: { motd: '<p>Maintenance tonight</p>' } }));
    render(() => <App />);
    expect(screen.getByText('Maintenance tonight')).toBeInTheDocument();
    expect(document.body).toHaveClass('motd-visible');
    expect(motdHeightProperty()).toBe('44px');

    // Grow the motd element and verify the height follows its resize observer
    motdHeight = 60;
    resizeObservers.forEach((observer) => observer.trigger());
    expect(motdHeightProperty()).toBe('60px');

    // Dismiss the motd and verify its height is released
    await user.click(screen.getByRole('button', { name: 'Dismiss message' }));
    expect(screen.queryByText('Maintenance tonight')).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass('motd-visible');
    expect(motdHeightProperty()).toBe('0px');

    // Change the motd content and verify it shows again
    window.baseDS.header!.motd = '<p>Upgrade done</p>';
    expect(await screen.findByText('Upgrade done')).toBeInTheDocument();
    expect(motdHeightProperty()).toBe('60px');
  });
});

// Helpers.

/** `ResizeObserver` the tests trigger by hand. */
class MockResizeObserver implements ResizeObserver {
  /** Elements being observed. */
  targets: Set<Element> = new Set();

  constructor(private callback: ResizeObserverCallback) {
    resizeObservers.push(this);
  }

  disconnect(): void {
    this.targets.clear();
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  /** Reports a size change of every observed element. */
  trigger(): void {
    if (this.targets.size === 0) return;
    const entries = [...this.targets].map((target) => ({ target }) as ResizeObserverEntry);
    this.callback(entries, this);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }
}

/** Returns the current browser URL without its origin. */
const currentUrl = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

/** Returns the motd height custom property of the document. */
const motdHeightProperty = () => document.documentElement.style.getPropertyValue('--motd-height');

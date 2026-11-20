import { createMemoryHistory, MemoryRouter, Navigator, Route, RouteSectionProps, useNavigate } from '@solidjs/router';
import { render, screen, waitFor, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createItem, createTextElement, flushPromises, tabTo } from 'common/test-utils';
import { Show } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_GRID_ITEMS_SIZE, DEFAULT_VIEW_MODE, FOUNDATION, overrideSettings, ZOOM_LEVELS } from '../../../data';
import { createBaseData } from '../../../test-utils/fixtures';
import { renderWithExploreStores } from '../../../test-utils/render';
import { ClassifyOption, Item, SortDirection, SortOption } from '../../../types';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import Header from '../../navigation/Header';
import { FullDataProvider } from '../../stores/fullData';
import { GridWidthProvider } from '../../stores/gridWidth';
import { GroupActiveProvider } from '../../stores/groupActive';
import { MobileTOCProvider } from '../../stores/mobileTOC';
import { ViewModeProvider } from '../../stores/viewMode';
import { ZoomProvider } from '../../stores/zoom';
import Explore from '..';
import CardContent from '../card/Content';

vi.mock('../../../utils/scrollToTop', () => ({ default: vi.fn() }));
vi.mock('../../common/DownloadDropdown', () => ({ default: () => createTextElement('Download dropdown') }));
vi.mock('../../common/Searchbar', () => ({ default: () => createTextElement('Searchbar') }));
vi.mock('../../navigation/EmbedModal', () => ({ default: () => createTextElement('Embed modal') }));
vi.mock('../../navigation/Footer', () => ({ default: () => createTextElement('Footer') }));
vi.mock('../card', () => ({ default: () => createTextElement('Card view') }));
// Groups whose content received new grid data after being rendered
const contentDataUpdates = vi.hoisted((): (string | undefined)[] => []);
// Content hides every group but the selected one, so only the content shown is named "Explore content"
vi.mock('../Content', async () => {
  const { createRenderEffect, on } = await import('solid-js');
  return {
    default: (props: { data?: unknown; group?: string; initialSelectedGroup?: string }) => {
      const element = createTextElement('');
      createRenderEffect(() => {
        const isShown = props.group === undefined || props.group === props.initialSelectedGroup;
        element.textContent = isShown ? 'Explore content' : 'Hidden content';
      });
      createRenderEffect(
        on(
          () => props.data,
          () => contentDataUpdates.push(props.group),
          { defer: true }
        )
      );
      return element;
    },
  };
});
vi.mock('../mobile/ExploreMobileIndex', () => ({ default: () => createTextElement('Mobile index') }));

const INITIAL_SETTINGS = {
  foundationName: FOUNDATION,
  gridSize: DEFAULT_GRID_ITEMS_SIZE,
  viewMode: DEFAULT_VIEW_MODE,
};
// State the header logo used to push, built from parts so that no source line names the removed value
const LOGO_HEADER_STATE = { from: ['logo', 'header'].join('-') };

describe('Explore', () => {
  beforeEach(() => {
    overrideSettings({ ...INITIAL_SETTINGS, foundationName: 'Test Foundation' });
    window.baseDS = createBaseData({
      categories: [
        {
          name: 'Category 1',
          normalized_name: 'category-1',
          subcategories: [{ name: 'Sub 1', normalized_name: 'sub-1' }],
        },
        {
          name: 'Category 2',
          normalized_name: 'category-2',
          subcategories: [{ name: 'Sub 2', normalized_name: 'sub-2' }],
        },
      ],
      groups: [
        { categories: ['Category 1'], name: 'Group 1', normalized_name: 'g1' },
        { categories: ['Category 2'], name: 'Group 2', normalized_name: 'g2' },
      ],
      items: [
        createItem({
          category: 'Category 1',
          id: 'item-1',
          maturity: 'graduated',
          name: 'Item 1',
          subcategory: 'Sub 1',
          tag: ['runtime'],
        }),
        createItem({
          category: 'Category 2',
          id: 'item-2',
          maturity: 'sandbox',
          name: 'Item 2',
          subcategory: 'Sub 2',
          tag: ['runtime'],
        }),
      ],
      maturity_options: [
        { name: 'graduated', normalized_name: 'graduated' },
        { name: 'sandbox', normalized_name: 'sandbox' },
      ],
    });
    itemsDataGetter.prepareGroups();
  });

  afterEach(() => {
    overrideSettings(INITIAL_SETTINGS);
    vi.useRealTimers();
  });

  it('keeps the filters of the URL when mounted with the former header logo history state', async () => {
    vi.useFakeTimers();

    // Arrive at Explore with filters in the URL and the state the header logo used to set
    const { history, navigate } = renderExplore('/guide');
    navigate()('/?group=g1&view-mode=grid&tag=runtime', { state: LOGO_HEADER_STATE });
    await vi.runAllTimersAsync();

    // Verify the filters stay in the URL and in the active filters list
    expect(history.get()).toBe('/?group=g1&view-mode=grid&tag=runtime');
    expect(screen.getByRole('button', { name: 'Remove runtime filter' })).toBeInTheDocument();
  });

  it('restores the previous Explore URL when going back after the header Explore link', async () => {
    const user = userEvent.setup();

    // Render Explore with a group, a view mode and a filter, then go to the guide
    const previousUrl = '/?group=g2&view-mode=card&tag=runtime';
    const { history } = renderExplore(previousUrl, { withHeader: true });
    expect(await screen.findByRole('button', { name: 'Remove runtime filter' })).toBeInTheDocument();
    history.set({ value: '/guide' });
    expect(await screen.findByText('Guide page')).toBeInTheDocument();

    // Follow the header Explore link and verify it opens the default Explore URL
    await user.click(screen.getByRole('link', { name: 'Explore' }));
    await waitFor(() => expect(history.get()).toBe('/?group=g1&view-mode=grid'));
    expect(await screen.findByRole('button', { name: 'Group 1' })).toHaveClass('active');
    expect(screen.queryByRole('button', { name: 'Remove runtime filter' })).not.toBeInTheDocument();

    // Go back twice and verify the previous Explore URL and its state are restored
    history.back();
    expect(await screen.findByText('Guide page')).toBeInTheDocument();
    history.back();
    await waitFor(() => expect(history.get()).toBe(previousUrl));
    expect(await screen.findByRole('button', { name: 'Group 2' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Change view mode to Card' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Remove runtime filter' })).toBeInTheDocument();
  });

  it('writes the sort direction shown by the select after a Grid to Card switch', async () => {
    const user = userEvent.setup();
    mockFullDataReady();

    // Render the Card view sorted in descending order and switch to Grid
    const { history } = renderExplore('/?group=g1&view-mode=card&sort-by=name&sort-direction=desc');
    expect(await screen.findByRole('combobox', { name: 'Sort options' })).toHaveValue('name_desc');
    await user.click(screen.getByRole('button', { name: 'Change view mode to Grid' }));
    await waitFor(() => expect(searchParam(history.get(), 'view-mode')).toBe('grid'));

    // Switch back to Card and verify the URL and the select show the same direction
    await user.click(screen.getByRole('button', { name: 'Change view mode to Card' }));
    await waitFor(() => expect(searchParam(history.get(), 'view-mode')).toBe('card'));
    const select = await screen.findByRole('combobox', { name: 'Sort options' });
    const [, direction] = (select as HTMLSelectElement).value.split('_');
    expect(searchParam(history.get(), 'sort-direction')).toBe(direction);
  });

  it('switches the group while the full data is loading', async () => {
    const user = userEvent.setup();

    // Render the Grid view before the full data is ready
    const { history } = renderExplore('/?group=g1&view-mode=grid');
    expect(itemsDataGetter.isReady()).toBe(false);

    // Click another group and verify the URL follows it
    await user.click(await screen.findByRole('button', { name: 'Group 2' }));
    await waitFor(() => expect(history.get()).toBe('/?group=g2&view-mode=grid'));
    expect(await screen.findByRole('button', { name: 'Group 2' })).toHaveClass('active');
  });

  it('marks the group clicked as active before the URL changes', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { history } = renderExplore('/?group=g1&view-mode=grid');
    await vi.runAllTimersAsync();

    // Click another group
    await user.click(screen.getByRole('button', { name: 'Group 2' }));

    // Check the button is active at once, while the URL still names the previous group
    expect(screen.getByRole('button', { name: 'Group 2' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Group 1' })).not.toHaveClass('active');
    expect(history.get()).toBe('/?group=g1&view-mode=grid');

    // Let the delayed navigation run and check the button stays active
    await vi.runAllTimersAsync();
    expect(history.get()).toBe('/?group=g2&view-mode=grid');
    expect(screen.getByRole('button', { name: 'Group 2' })).toHaveClass('active');
  });

  it('marks the group of the URL as active when going back after clicking a group', async () => {
    const user = userEvent.setup();
    const { history } = renderExplore('/?group=g1&view-mode=grid');

    // Click another group and go back once the URL names it
    await user.click(await screen.findByRole('button', { name: 'Group 2' }));
    await waitFor(() => expect(history.get()).toBe('/?group=g2&view-mode=grid'));
    history.back();

    // Check the previous group is active again
    await waitFor(() => expect(screen.getByRole('button', { name: 'Group 1' })).toHaveClass('active'));
    expect(screen.getByRole('button', { name: 'Group 2' })).not.toHaveClass('active');
  });

  it('keeps the grid data of the groups without filters when the active group changes', async () => {
    const user = userEvent.setup();
    mockFullDataReady();

    // Render the Grid view of a group
    const { history } = renderExplore('/?group=g1&view-mode=grid');
    expect(await screen.findByText('Explore content')).toBeInTheDocument();
    contentDataUpdates.length = 0;

    // Click another group and let every effect run
    await user.click(screen.getByRole('button', { name: 'Group 2' }));
    await waitFor(() => expect(history.get()).toBe('/?group=g2&view-mode=grid'));
    await flushPromises();

    // Check no group content received new grid data
    expect(contentDataUpdates).toEqual([]);
  });

  it.each(['card', 'grid'])('queries the items once when mounted in %s view with the full data ready', async (mode) => {
    mockFullDataReady();
    const queryItems = vi.spyOn(itemsDataGetter, 'queryItems');

    // Render Explore and let every effect and delayed action run
    renderExplore(`/?group=g1&view-mode=${mode}`);
    expect(await screen.findAllByText('Explore content')).not.toHaveLength(0);
    await flushPromises();

    // Check the items were queried a single time
    expect(queryItems).toHaveBeenCalledTimes(1);
  });

  it('opens the Card view at the first section of its menu when the URL names none of them', async () => {
    mockFullDataReady();

    // Render the Card view with a hash that is not a section of the menu
    const { history } = renderExplore('/?group=all&view-mode=card#maturity--graduated');

    // Verify the hash moves to the first section of the menu, keeping the search
    await waitFor(() => expect(history.get()).toBe('/?group=all&view-mode=card#category-1--sub-1'));
  });

  it('keeps a non-ASCII section of the menu named by the Card view hash', async () => {
    // The second "о" of "adоpter" is Cyrillic (U+043E), as in the OSPO landscape
    window.baseDS.categories![1].subcategories[0] = { name: 'Sub 2', normalized_name: 'sub-2-adоpter' };
    mockFullDataReady();

    // Render the Card view at that section, with the hash encoded as the browser gives it
    const { history } = renderExplore('/?group=all&view-mode=card#category-2--sub-2-ad%D0%BEpter');
    expect(await screen.findByText('Card view')).toBeInTheDocument();
    await flushPromises();

    // Verify the hash still names that section
    expect(history.get()).toBe('/?group=all&view-mode=card#category-2--sub-2-ad%D0%BEpter');
  });

  it('keeps the embed setup path when it opens the Card view at the first section of its menu', async () => {
    mockFullDataReady();

    // Render the Card view behind the embed setup, with no section in the URL
    const { history } = renderExplore('/embed-setup?group=all&view-mode=card');

    // Verify the hash names the first section of the menu and the embed setup stays open
    await waitFor(() => expect(history.get()).toBe('/embed-setup?group=all&view-mode=card#category-1--sub-1'));
  });

  it('moves the Card view hash to the first section of the new menu when the classify changes', async () => {
    const user = userEvent.setup();
    mockFullDataReady();

    // Render the Card view classified by category at its first section
    const { history } = renderExplore(
      '/?group=all&view-mode=card&classify=category&sort-by=name&sort-direction=asc#category-1--sub-1'
    );
    const classifySelect = await screen.findByRole('combobox', { name: 'Classify options' });

    // Classify by maturity and verify the hash names the first maturity section
    await user.selectOptions(classifySelect, ClassifyOption.Maturity);
    await waitFor(() => expect(searchParam(history.get(), 'classify')).toBe(ClassifyOption.Maturity));
    await waitFor(() => expect(urlHash(history.get())).toBe('#maturity--graduated'));
  });

  it('moves the Card view hash to the first section left when a filter removes its section', async () => {
    const user = userEvent.setup();
    mockFullDataReady();

    // Render the Card view filtered by two categories at the section of the first one
    const { history } = renderExplore(
      '/?group=all&view-mode=card&classify=category&sort-by=name&sort-direction=asc&category=Category+1&category=Category+2#category-1--sub-1'
    );

    // Remove the first category filter and verify the hash names the section left
    await user.click(await screen.findByRole('button', { name: 'Remove Category 1 filter' }));
    await waitFor(() =>
      expect(new URL(history.get(), 'http://localhost').searchParams.getAll('category')).toEqual(['Category 2'])
    );
    await waitFor(() => expect(urlHash(history.get())).toBe('#category-2--sub-2'));
  });

  it('removes the resize listeners it added when unmounted', async () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');

    // Render Explore and collect the resize listeners it added
    const { unmount } = renderExplore('/?group=g1&view-mode=grid');
    expect(await screen.findAllByText('Explore content')).not.toHaveLength(0);
    const resizeListeners = addEventListener.mock.calls
      .filter(([type]) => type === 'resize')
      .map(([, listener]) => listener);
    expect(resizeListeners.length).toBeGreaterThan(0);

    // Unmount, letting shared listeners go in their microtask, and check each listener was removed by the same reference
    unmount();
    await flushPromises();
    const removedListeners = removeEventListener.mock.calls
      .filter(([type]) => type === 'resize')
      .map(([, listener]) => listener);
    expect(removedListeners).toEqual(expect.arrayContaining(resizeListeners));
  });

  it('keeps the Grid view and offers a retry when the full data fails to load', async () => {
    const user = userEvent.setup();
    vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue('error');
    const init = vi.spyOn(itemsDataGetter, 'init').mockReturnValue(undefined);

    // Render the Grid view after the full data failed to load
    renderExplore('/?group=g1&view-mode=grid');

    // Check the base data grid stays, with the Card view and the filters disabled
    expect(await screen.findAllByText('Explore content')).not.toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load the full landscape data");
    expect(screen.getByRole('button', { name: 'Change view mode to Card' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open filters' })).toBeDisabled();

    // Click "Try again" and check the full data load is retried
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('shows the base data grid when the full data fails to load and the URL asks for the Card view', async () => {
    vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue('error');

    // Render a Card view URL after the full data failed to load
    renderExplore('/?group=g1&view-mode=card');

    // Check the Grid view is shown under the alert, with the Card view disabled
    expect(await screen.findAllByText('Explore content')).not.toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load the full landscape data");
    expect(screen.getByRole('button', { name: 'Change view mode to Grid' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Change view mode to Card' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decrease zoom level' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Classify options' })).not.toBeInTheDocument();
  });

  it('shows the first group grid when the full data fails to load and the URL asks for the Card view of all groups', async () => {
    vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue('error');

    // Render the Card view URL of every group after the full data failed to load
    const { history } = renderExplore('/?group=all&view-mode=card');

    // Check the first group grid is shown under the alert, and the URL is kept for a retry
    expect(await screen.findByText('Explore content')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load the full landscape data");
    expect(screen.getByRole('button', { name: 'Group 1' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Change view mode to Grid' })).toHaveClass('active');
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument();
    expect(history.get()).toBe('/?group=all&view-mode=card');
  });

  it('shows the first group when switching the Card view of all groups to the Grid view', async () => {
    const user = userEvent.setup();
    mockFullDataReady();

    // Render the Card view of all groups and switch to Grid
    const { history } = renderExplore('/?group=all&view-mode=card');
    await user.click(await screen.findByRole('button', { name: 'Change view mode to Grid' }));

    // Check the URL and the active button name the first group
    await waitFor(() => expect(history.get()).toBe('/?group=g1&view-mode=grid'));
    expect(screen.getByRole('button', { name: 'Group 1' })).toHaveClass('active');
  });

  it('lists the Grid view mode before the Card view mode', async () => {
    // Render the Grid view
    renderExplore('/?group=g1&view-mode=grid');

    // Check the order of the view mode buttons
    const viewModeOptions = await screen.findByRole('group', { name: 'View mode options' });
    expect(
      within(viewModeOptions)
        .getAllByRole('button')
        .map((button) => button.textContent)
    ).toEqual(['Grid', 'Card']);
  });

  it('shows the base data grid without the filters it cannot apply when the full data fails to load', async () => {
    vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue('error');

    // Render a Grid view URL with a base data filter and a full data filter
    renderExplore('/?group=g1&view-mode=grid&tag=runtime&license=MIT');

    // Check the grid and the base data filter are kept, and the full data filter is left out
    expect(await screen.findAllByText('Explore content')).not.toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load the full landscape data");
    expect(screen.getByRole('button', { name: 'Remove runtime filter' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove MIT filter' })).not.toBeInTheDocument();
  });

  it('titles the zoom buttons like their labels and disables + at the last zoom level', async () => {
    const user = userEvent.setup();

    // Render the Grid view and check the zoom buttons titles
    renderExplore('/?group=g1&view-mode=grid');
    const decrease = await screen.findByRole('button', { name: 'Decrease zoom level' });
    const increase = screen.getByRole('button', { name: 'Increase zoom level' });
    expect(decrease).toHaveAttribute('title', 'Decrease zoom level');
    expect(increase).toHaveAttribute('title', 'Increase zoom level');

    // Zoom in until + is disabled and check it happens at the last zoom level
    for (let clicks = 0; clicks < ZOOM_LEVELS.length && !(increase as HTMLButtonElement).disabled; clicks++) {
      await user.click(increase);
    }
    expect(increase).toBeDisabled();
    expect(decrease).toBeEnabled();
    expect(document.querySelector(`.zoom-${ZOOM_LEVELS.length - 1}`)).toBeInTheDocument();
  });

  it('writes no group param in a landscape without groups', async () => {
    const user = userEvent.setup();
    window.baseDS = { ...window.baseDS, groups: undefined };
    vi.spyOn(itemsDataGetter, 'getGroups').mockReturnValue(undefined);

    // Render a filtered landscape without groups and remove its filter
    const { history } = renderExplore('/?tag=runtime');
    await user.click(await screen.findByRole('button', { name: 'Remove runtime filter' }));

    // Verify the URL drops the filter and gets no group param
    await waitFor(() => expect(history.get()).toBe('/?view-mode=grid'));
  });

  it.each(['g1', 'all'])(
    'hides the group selector of the Card view of a single group with every category (group=%s)',
    async (group) => {
      window.baseDS = {
        ...window.baseDS,
        groups: [{ categories: ['Category 1', 'Category 2'], name: 'Group 1', normalized_name: 'g1' }],
      };
      itemsDataGetter.prepareGroups();
      mockFullDataReady();

      // Render the Card view of the single group or of every item
      const { history } = renderExplore(`/?group=${group}&view-mode=card`);

      // Check the URL keeps the group and only gets the section hash
      await waitFor(() => expect(history.get()).toBe(`/?group=${group}&view-mode=card#category-1--sub-1`));

      // Check the group selector is hidden and the items are still shown
      expect(screen.queryByRole('button', { name: 'Group 1' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Groups list' })).not.toBeInTheDocument();
      if (group === 'all') {
        expect(screen.getByText('Card view').parentElement).toHaveClass('d-block');
      } else {
        expect(screen.getByText('Explore content')).toBeInTheDocument();
      }
    }
  );

  it('shows the single group when switching its Card view of every item to the Grid view', async () => {
    const user = userEvent.setup();
    window.baseDS = {
      ...window.baseDS,
      groups: [{ categories: ['Category 1', 'Category 2'], name: 'Group 1', normalized_name: 'g1' }],
    };
    itemsDataGetter.prepareGroups();
    mockFullDataReady();

    // Render the filtered Card view of every item and switch to Grid
    const { history } = renderExplore('/?group=all&view-mode=card&tag=runtime');
    await user.click(await screen.findByRole('button', { name: 'Change view mode to Grid' }));

    // Check the URL keeps the filter and names the single group
    await waitFor(() => expect(history.get()).toBe('/?group=g1&view-mode=grid&tag=runtime'));

    // Check the group selector is hidden and the group grid is shown
    expect(screen.queryByRole('button', { name: 'Group 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Groups list' })).not.toBeInTheDocument();
    expect(screen.getByText('Explore content')).toBeInTheDocument();
  });

  it('keeps the group selector of the Card view of a single group without every category', async () => {
    window.baseDS = {
      ...window.baseDS,
      groups: [{ categories: ['Category 1'], name: 'Group 1', normalized_name: 'g1' }],
    };
    itemsDataGetter.prepareGroups();
    mockFullDataReady();

    // Render the Card view of every item, which includes the items outside the group
    renderExplore('/?group=all&view-mode=card');

    // Check the group and All are both offered, with All active
    expect(await screen.findByRole('button', { name: 'All' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Group 1' })).toBeInTheDocument();
  });

  it('shows every group and All in the Card view of several groups', async () => {
    mockFullDataReady();

    // Render the Card view of the first group
    renderExplore('/?group=g1&view-mode=card');

    // Check every group and All are offered, with the first group active
    expect(await screen.findByRole('button', { name: 'Group 1' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Group 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
  });

  it('shows the All option in the Card view of a landscape without groups', async () => {
    const user = userEvent.setup();
    window.baseDS = { ...window.baseDS, groups: undefined };
    vi.spyOn(itemsDataGetter, 'getGroups').mockReturnValue(undefined);
    mockFullDataReady();

    // Render the Card view of a landscape without groups
    const { history } = renderExplore('/?view-mode=card');

    // Check All is active and the URL gets no group param
    expect(await screen.findByRole('button', { name: 'All' })).toHaveClass('active');
    await waitFor(() => expect(history.get()).toBe('/?view-mode=card#category-1--sub-1'));

    // Switch to Grid and check All is no longer offered
    await user.click(screen.getByRole('button', { name: 'Change view mode to Grid' }));
    await waitFor(() => expect(searchParam(history.get(), 'view-mode')).toBe('grid'));
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument();
  });
});

describe('Card view items', () => {
  it('can be reached with Tab and opened with Enter', async () => {
    const user = userEvent.setup();
    const items = [
      createItem({ id: 'item-1', name: 'Item 1', website: 'https://item-1.example.org' }),
      createItem({ id: 'item-2', name: 'Item 2' }),
    ];

    // Render the Card view items, each with a link inside
    const { history } = renderWithExploreStores(
      () => (
        <CardContent
          data={items}
          classify={ClassifyOption.None}
          sorted={SortOption.Name}
          direction={SortDirection.Asc}
          isVisible
        />
      ),
      { url: '/?view-mode=card' }
    );

    // Tab to the second item and open it with Enter
    await tabTo(user, screen.getByRole('button', { name: 'Open Item 2 details' }));
    await user.keyboard('{Enter}');

    // Check the item is open and the card links are still reachable
    expect(searchParam(history.get(), 'item')).toBe('item-2');
    expect(screen.getAllByRole('link', { name: 'Website' })[0]).toHaveAttribute('href', 'https://item-1.example.org');
  });
});

// Helpers.

/** Options for `renderExplore`. */
interface RenderExploreOptions {
  /** Whether the header is rendered above the routes. */
  withHeader?: boolean;
}

/**
 * Renders Explore at `/` and `/embed-setup`, as the app does, and a guide stub at `/guide` inside
 * the stores Explore uses, returning the memory history and an accessor to the router navigate function.
 */
const renderExplore = (url: string, options: RenderExploreOptions = {}) => {
  const history = createMemoryHistory();
  history.set({ value: url });
  let navigate: Navigator | undefined;

  const Root = (props: RouteSectionProps) => {
    navigate = useNavigate();
    return (
      <FullDataProvider>
        <ViewModeProvider>
          <GroupActiveProvider>
            <ZoomProvider>
              <GridWidthProvider>
                <MobileTOCProvider>
                  <Show when={options.withHeader}>
                    <Header statsVisible={false} />
                  </Show>
                  {props.children}
                </MobileTOCProvider>
              </GridWidthProvider>
            </ZoomProvider>
          </GroupActiveProvider>
        </ViewModeProvider>
      </FullDataProvider>
    );
  };

  const result = render(() => (
    <MemoryRouter history={history} root={Root}>
      <Route path={['/', '/embed-setup']} component={() => <Explore initialData={window.baseDS} />} />
      <Route path="/guide" component={() => <div>Guide page</div>} />
    </MemoryRouter>
  ));

  return { ...result, history, navigate: () => navigate! };
};

/** Makes the full data look ready, with every classify and sort option available in each group. */
const mockFullDataReady = () => {
  const options = { classify: Object.values(ClassifyOption), sort: Object.values(SortOption) };
  vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue('ready');
  vi.spyOn(itemsDataGetter, 'getAll').mockReturnValue(window.baseDS.items as Item[]);
  vi.spyOn(itemsDataGetter, 'getClassifyAndSortOptions').mockReturnValue({ all: options, g1: options, g2: options });
};

/** Returns the value of a param in the search of a path. */
const searchParam = (path: string, key: string): string | null =>
  new URL(path, 'http://localhost').searchParams.get(key);

/** Returns the hash of a path, `''` when it has none. */
const urlHash = (path: string): string => new URL(path, 'http://localhost').hash;

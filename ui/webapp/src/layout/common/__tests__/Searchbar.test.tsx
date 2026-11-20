import { render, screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import type { SearchResult } from 'minisearch';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import searchEngine from '../../../utils/search';
import Searchbar from '../Searchbar';
import styles from '../Searchbar.module.css';

const { mockUpdateActiveItemId } = vi.hoisted(() => ({ mockUpdateActiveItemId: vi.fn() }));

vi.mock('../../../utils/search', () => ({ default: { searchTerm: vi.fn() } }));
vi.mock('../../stores/activeItem', () => ({ useUpdateActiveItemId: () => mockUpdateActiveItemId }));

/** Debounce of the search input. */
const SEARCH_DELAY = 300;

/** Results the search engine returns, in order. */
const RESULTS: SearchResult[] = [
  searchResult('item-1', 'Item 1'),
  searchResult('item-2', 'Item 2'),
  searchResult('item-3', 'Item 3'),
];

const searchTermMock = vi.mocked(searchEngine.searchTerm);

describe('Searchbar', () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    searchTermMock.mockResolvedValue(RESULTS);
    scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it('does not search with fewer than 2 characters', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);

    // Type a single character, wait past the debounce and press Enter
    await user.type(searchInput(), 'a');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY);
    await user.keyboard('{Enter}');

    // Check nothing was searched or opened
    expect(searchTermMock).not.toHaveBeenCalled();
    expect(mockUpdateActiveItemId).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('searches 300 ms after the last keystroke', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);

    // Type a query and check the search waits for the debounce
    await user.type(searchInput(), 'item');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY - 1);
    expect(searchTermMock).not.toHaveBeenCalled();

    // Check the search runs once the debounce is over, with the last value
    await vi.advanceTimersByTimeAsync(1);
    expect(searchTermMock).toHaveBeenCalledTimes(1);
    expect(searchTermMock).toHaveBeenCalledWith('item');
    expect(optionNames()).toEqual(['Open Item 1 info', 'Open Item 2 info', 'Open Item 3 info']);
  });

  it('wraps ArrowDown and ArrowUp around the results with no empty slot', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);
    await showResults(user);

    // Move down past the last result and check it wraps to the first one
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(selectedOptionName()).toBe('Open Item 3 info');
    await user.keyboard('{ArrowDown}');
    expect(selectedOptionName()).toBe('Open Item 1 info');

    // Move up from the first result and check it wraps to the last one
    await user.keyboard('{ArrowUp}');
    expect(selectedOptionName()).toBe('Open Item 3 info');
    const scrolledElements = scrollIntoView.mock.contexts;
    expect(scrolledElements[scrolledElements.length - 1]).toBe(
      screen.getByRole('option', { name: 'Open Item 3 info' })
    );
  });

  it('opens the highlighted result on Enter', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);
    await showResults(user);

    // Highlight the second result and press Enter
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    // Check the second result is opened and the search is cleared
    expect(mockUpdateActiveItemId).toHaveBeenCalledWith('item-2');
    expect(searchInput()).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the first result on Enter when no result is highlighted', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);
    await showResults(user);

    // Press Enter without highlighting a result
    await user.keyboard('{Enter}');

    // Check the first result is opened
    expect(mockUpdateActiveItemId).toHaveBeenCalledTimes(1);
    expect(mockUpdateActiveItemId).toHaveBeenCalledWith('item-1');
  });

  it('searches right away on Enter before the debounce is over', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);

    // Type a query and press Enter at once
    await user.type(searchInput(), 'item{Enter}');
    await vi.advanceTimersByTimeAsync(0);

    // Check the results are listed without opening any of them, and the debounced search is dropped
    expect(optionNames()).toHaveLength(3);
    expect(mockUpdateActiveItemId).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY);
    expect(searchTermMock).toHaveBeenCalledTimes(1);
  });

  it('searches right away on Enter when the listed results belong to an older query', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);
    await showResults(user);

    // Refine the query and press Enter before the debounce is over
    searchTermMock.mockResolvedValue([searchResult('item-4', 'Item 4')]);
    await user.type(searchInput(), ' 4{Enter}');
    await vi.advanceTimersByTimeAsync(0);

    // Check no result of the older query is opened and the results of the new one are listed
    expect(mockUpdateActiveItemId).not.toHaveBeenCalled();
    expect(searchTermMock).toHaveBeenLastCalledWith('item 4');
    expect(searchInput()).toHaveValue('item 4');
    expect(optionNames()).toEqual(['Open Item 4 info']);
    expect(screen.queryByRole('option', { selected: true })).not.toBeInTheDocument();

    // Check Enter opens the first result of the new query
    await user.keyboard('{Enter}');
    expect(mockUpdateActiveItemId).toHaveBeenCalledWith('item-4');
  });

  it('does not open a result highlighted for an older query on Enter', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);
    await showResults(user);

    // Highlight a result, refine the query and press Enter before the debounce is over
    await user.keyboard('{ArrowDown}{ArrowDown}');
    searchTermMock.mockResolvedValue([]);
    await user.type(searchInput(), 'zz{Enter}');
    await vi.advanceTimersByTimeAsync(0);

    // Check no result is opened and the new query has no results
    expect(mockUpdateActiveItemId).not.toHaveBeenCalled();
    expect(searchTermMock).toHaveBeenLastCalledWith('itemzz');
    expect(screen.getByRole('status')).toHaveTextContent(`We couldn't find any items that match that criteria.`);
  });

  it('clears the results on Escape', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);
    await showResults(user);

    // Press Escape and check the list is gone
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(searchInput()).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the value and the results on a mousedown in the input', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);
    await showResults(user);

    // Press the mouse in the input
    await user.pointer({ keys: '[MouseLeft]', target: searchInput() });

    // Check the value and the list stay
    expect(searchInput()).toHaveValue('item');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('clears the value and the results on a mousedown on the body', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);
    await showResults(user);

    // Press the mouse outside the search bar
    await user.pointer({ keys: '[MouseLeft]', target: document.body });

    // Check the value and the list are cleared
    expect(searchInput()).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows the search engine error message', async () => {
    const user = setupUser();
    searchTermMock.mockRejectedValue(new Error('Preparing search index...'));
    render(() => <Searchbar device="desktop" />);

    // Search while the index is not ready
    await user.type(searchInput(), 'item');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY);

    // Check the error message is shown in place of the results
    expect(screen.getByRole('status')).toHaveTextContent('Preparing search index...');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('focuses the input on desktop when / is pressed with the focus on the body', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);
    expect(document.activeElement).toBe(document.body);

    // Press / and check the input gets the focus
    await user.keyboard('/');
    expect(searchInput()).toHaveFocus();
    expect(searchInput()).toHaveValue('');
  });

  it('keeps the focus when / is pressed with the focus on another element', async () => {
    const user = setupUser();
    render(() => (
      <>
        <button type="button">Other control</button>
        <Searchbar device="desktop" />
      </>
    ));

    // Focus another control and press /
    screen.getByRole('button', { name: 'Other control' }).focus();
    await user.keyboard('/');

    // Check the focus stays on the other control
    expect(screen.getByRole('button', { name: 'Other control' })).toHaveFocus();
  });

  it('does not focus the input on mobile when / is pressed', async () => {
    const user = setupUser();
    render(() => <Searchbar device="mobile" />);

    await user.keyboard('/');

    expect(searchInput()).not.toHaveFocus();
  });

  it('removes the keydown listener it added when unmounted', () => {
    const addEventListener = vi.spyOn(document, 'addEventListener');
    const removeEventListener = vi.spyOn(document, 'removeEventListener');

    // Render the desktop search bar and collect its keydown listener
    const { unmount } = render(() => <Searchbar device="desktop" />);
    const keydownListeners = addEventListener.mock.calls
      .filter(([type]) => type === 'keydown')
      .map(([, listener]) => listener);
    expect(keydownListeners).toHaveLength(1);

    // Unmount and check the same listener is removed
    unmount();
    const removedListeners = removeEventListener.mock.calls
      .filter(([type]) => type === 'keydown')
      .map(([, listener]) => listener);
    expect(removedListeners).toEqual(keydownListeners);
  });

  it('shows the focus ring around the search bar only when the focus comes from the keyboard', async () => {
    const user = setupUser();
    render(() => (
      <>
        <button type="button">Other control</button>
        <Searchbar device="mobile" />
      </>
    ));
    const searchBar = searchInput().parentElement!;

    // Click the input and check the ring is not shown
    await user.click(searchInput());
    expect(searchInput()).toHaveFocus();
    expect(searchBar).not.toHaveClass(styles.keyboardFocus);

    // Move the focus away and back with the keyboard and check the ring follows the focus
    await user.tab({ shift: true });
    expect(searchBar).not.toHaveClass(styles.keyboardFocus);
    await user.tab();
    expect(searchInput()).toHaveFocus();
    expect(searchBar).toHaveClass(styles.keyboardFocus);

    // Clear the text with the mouse and check the input gets the focus back without the ring
    await user.type(searchInput(), 'item');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(searchInput()).toHaveFocus();
    expect(searchBar).not.toHaveClass(styles.keyboardFocus);

    // Clear the text with the keyboard and check the ring is shown
    await user.type(searchInput(), 'item');
    await user.tab();
    await user.keyboard('{Enter}');
    expect(searchInput()).toHaveFocus();
    expect(searchBar).toHaveClass(styles.keyboardFocus);
  });

  it('shows the focus ring around the search bar when / focuses the input', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);

    await user.keyboard('/');

    expect(searchInput()).toHaveFocus();
    expect(searchInput().parentElement).toHaveClass(styles.keyboardFocus);
  });

  it('keeps the combobox attributes in sync with the highlighted result', async () => {
    const user = setupUser();
    render(() => <Searchbar device="desktop" />);

    // Check the closed combobox
    const input = screen.getByRole('combobox', { name: 'Search items' });
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).not.toHaveAttribute('aria-activedescendant');

    // Show the results and check the combobox controls the list
    await showResults(user);
    const listbox = screen.getByRole('listbox');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);

    // Highlight the results and check the active descendant follows
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', within(listbox).getAllByRole('option')[0].id);
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', within(listbox).getAllByRole('option')[1].id);
  });

  it('gives each search bar its own list and option ids', async () => {
    const user = setupUser();
    render(() => (
      <>
        <Searchbar device="desktop" />
        <Searchbar device="mobile" />
      </>
    ));
    const [desktopInput, mobileInput] = screen.getAllByRole('combobox', { name: 'Search items' });

    // Show the results of both search bars
    await user.type(desktopInput, 'item');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY);
    await user.type(mobileInput, 'item');
    await vi.advanceTimersByTimeAsync(SEARCH_DELAY);

    // Check the ids are unique
    const ids = Array.from(document.querySelectorAll('[role="listbox"], [role="option"]')).map((element) => element.id);
    expect(mobileInput).toHaveAttribute('aria-controls');
    expect(desktopInput.getAttribute('aria-controls')).not.toBe(mobileInput.getAttribute('aria-controls'));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// Helpers.

/** Returns the accessible names of the listed options, in order. */
function optionNames(): (string | null)[] {
  return screen.getAllByRole('option').map((option) => option.getAttribute('aria-label'));
}

/** Returns the search input. */
function searchInput(): HTMLElement {
  return screen.getByRole('combobox', { name: 'Search items' });
}

/** Creates a search result for an item. */
function searchResult(id: string, name: string): SearchResult {
  return {
    category: 'Category',
    id,
    logo: `logos/${id}.svg`,
    match: {},
    name,
    queryTerms: [],
    score: 1,
    subcategory: 'Subcategory',
    terms: [],
  };
}

/** Returns the accessible name of the selected option. */
function selectedOptionName(): string | null {
  return screen.getByRole('option', { selected: true }).getAttribute('aria-label');
}

/** Creates the user-event instance, advancing the fake timers. */
function setupUser() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

/** Types a query and waits for the debounced search, so the results are listed. */
async function showResults(user: ReturnType<typeof setupUser>): Promise<void> {
  await user.type(searchInput(), 'item');
  await vi.advanceTimersByTimeAsync(SEARCH_DELAY);
  expect(screen.getByRole('listbox')).toBeInTheDocument();
}

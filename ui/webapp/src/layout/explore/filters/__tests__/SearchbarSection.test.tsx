import { render, screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createSignal } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ActiveFilters, FilterCategory, FilterSection } from '../../../../types';
import SearchbarSection from '../SearchbarSection';

/** Organization section the tests search in. */
const SECTION: FilterSection = {
  options: [
    { name: 'Apple', value: 'apple' },
    { name: 'Apricot', value: 'apricot' },
    { name: 'Banana', value: 'banana' },
  ],
  title: 'Organization',
  value: FilterCategory.Organization,
};

/** Debounce of the search input, plus a margin. */
const SEARCH_WAIT = 350;

describe('SearchbarSection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters the options 300 ms after typing', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSection();

    // Type a query and check the list waits for the debounce
    await user.type(screen.getByRole('textbox'), 'ap');
    expect(optionNames()).toEqual(['Apple', 'Apricot', 'Banana']);

    // Check the list is filtered once the debounce is over
    await vi.advanceTimersByTimeAsync(SEARCH_WAIT);
    expect(optionNames()).toEqual(['Apple', 'Apricot']);
  });

  it('keeps the query and the filtered list when Search is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSection();

    // Type a query and click Search
    await user.type(screen.getByRole('textbox'), 'apr');
    await user.click(screen.getByRole('button', { name: 'Search text' }));
    await vi.advanceTimersByTimeAsync(SEARCH_WAIT);

    // Check the query and the filtered list stay
    expect(screen.getByRole('textbox')).toHaveValue('apr');
    expect(optionNames()).toEqual(['Apricot']);
  });

  it('keeps the query when an option is checked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { updateActiveFilters } = renderSection();

    // Filter the list and check an option
    await user.type(screen.getByRole('textbox'), 'ap');
    await vi.advanceTimersByTimeAsync(SEARCH_WAIT);
    await user.click(screen.getByRole('checkbox', { name: 'Apricot' }));
    await vi.advanceTimersByTimeAsync(SEARCH_WAIT);

    // Check the option is applied and the query and the filtered list stay
    expect(updateActiveFilters).toHaveBeenCalledWith(FilterCategory.Organization, ['apricot']);
    expect(screen.getByRole('textbox')).toHaveValue('ap');
    expect(screen.getByRole('checkbox', { name: 'Apricot' })).toBeChecked();
    expect(optionNames()).toEqual(['Apricot', 'Apple']);
  });

  it('empties the input and keeps it focused when Clear is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSection();

    // Filter the list and clear the query
    await user.type(screen.getByRole('textbox'), 'ban');
    await vi.advanceTimersByTimeAsync(SEARCH_WAIT);
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    await vi.advanceTimersByTimeAsync(SEARCH_WAIT);

    // Check the input is empty and focused and the list is complete again
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(optionNames()).toEqual(['Apple', 'Apricot', 'Banana']);
  });

  it('filters the options when Enter is pressed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSection();

    // Type a query and press Enter before the debounce is over
    await user.type(screen.getByRole('textbox'), 'banana{Enter}');

    // Check the list is filtered right away
    expect(optionNames()).toEqual(['Banana']);
  });

  it('labels the options group with the title', () => {
    renderSection();

    expect(screen.getByRole('group', { name: 'Organization' })).toBeInTheDocument();
  });
});

// Helpers.

/** Returns the names of the options listed, in order. */
const optionNames = (): string[] =>
  within(screen.getByRole('group', { name: 'Organization' }))
    .getAllByRole('checkbox')
    .map((checkbox) => checkbox.parentElement!.textContent!);

/** Renders the Organization section, keeping its active filters in a signal like the Filters modal does. */
const renderSection = () => {
  const [activeFilters, setActiveFilters] = createSignal<ActiveFilters>({});
  const updateActiveFilters = vi.fn((category: FilterCategory, options: string[]) =>
    setActiveFilters((prev) => ({ ...prev, [category]: options }))
  );

  render(() => (
    <SearchbarSection
      section={SECTION}
      initialActiveFilters={activeFilters}
      updateActiveFilters={updateActiveFilters}
      resetFilter={vi.fn()}
    />
  ));

  return { updateActiveFilters };
};

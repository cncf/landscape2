import { render, screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_GRID_ITEMS_SIZE, DEFAULT_VIEW_MODE, FOUNDATION, overrideSettings } from '../../../data';
import { ActiveFilters, FilterCategory } from '../../../types';
import ActiveFiltersList from '../ActiveFiltersList';

const INITIAL_SETTINGS = {
  foundationName: FOUNDATION,
  gridSize: DEFAULT_GRID_ITEMS_SIZE,
  viewMode: DEFAULT_VIEW_MODE,
};
const LICENSES = ['Apache-2.0', 'MIT'];
const MATURITY_OPTIONS = ['graduated', 'incubating', 'sandbox'];

describe('ActiveFiltersList', () => {
  beforeEach(() => {
    overrideSettings({ ...INITIAL_SETTINGS, foundationName: 'Test Foundation' });
  });

  afterEach(() => {
    overrideSettings(INITIAL_SETTINGS);
  });

  it('shows one badge for all maturity levels', () => {
    renderList({ [FilterCategory.Maturity]: MATURITY_OPTIONS });

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Remove testfoundation filter' })).toBeInTheDocument();
  });

  it('shows the collapsed badge plus a badge for the non-foundation value', () => {
    renderList({ [FilterCategory.Maturity]: [...MATURITY_OPTIONS, 'non-testfoundation'] });

    const badges = screen.getAllByRole('listitem');
    expect(badges).toHaveLength(2);
    expect(within(badges[0]).getByText('testfoundation')).toBeInTheDocument();
    expect(within(badges[1]).getByText('Non testfoundation project')).toBeInTheDocument();
  });

  it('shows one badge per value when some maturity levels are missing', () => {
    renderList({ [FilterCategory.Maturity]: ['graduated', 'sandbox'] });

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Remove testfoundation filter' })).not.toBeInTheDocument();
  });

  it('removes the foundation label from the collapsed badge', async () => {
    const user = userEvent.setup();
    const { removeFilter } = renderList({ [FilterCategory.Maturity]: [...MATURITY_OPTIONS, 'non-testfoundation'] });

    // Remove the collapsed badge and verify only the foundation label is removed
    await user.click(screen.getByRole('button', { name: 'Remove testfoundation filter' }));
    expect(removeFilter).toHaveBeenCalledExactlyOnceWith(FilterCategory.Maturity, 'testfoundation');
  });

  it('removes oss from the collapsed License badge', async () => {
    const user = userEvent.setup();
    const { removeFilter } = renderList({ [FilterCategory.License]: LICENSES });

    // Verify all licenses give one Open Source badge
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Open Source')).toBeInTheDocument();

    // Remove the badge and verify only the oss token is removed
    await user.click(screen.getByRole('button', { name: 'Remove open source filter' }));
    expect(removeFilter).toHaveBeenCalledExactlyOnceWith(FilterCategory.License, 'oss');
  });

  it('shows Extra badges without a category prefix', () => {
    renderList({ [FilterCategory.Extra]: ['specification', 'enduser'] });

    const badges = screen.getAllByRole('listitem');
    expect(badges.map((badge) => badge.textContent)).toEqual(['specification', 'enduser']);
    expect(screen.queryByText(`${FilterCategory.Extra}:`)).not.toBeInTheDocument();
  });

  it('shows the category prefix on the other badges', () => {
    renderList({ [FilterCategory.TAG]: ['runtime'] });

    expect(screen.getByRole('listitem')).toHaveTextContent(`${FilterCategory.TAG}:`);
  });

  it('renders the badges inside a list', () => {
    renderList({ [FilterCategory.TAG]: ['runtime'], [FilterCategory.License]: ['MIT'] });

    const list = screen.getByRole('list', { name: 'Filters applied' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });
});

// Helpers.

/** Renders the list with the filters given, returning the remove callback mock. */
const renderList = (activeFilters: ActiveFilters) => {
  const removeFilter = vi.fn();
  render(() => (
    <ActiveFiltersList
      activeFilters={activeFilters}
      maturityOptions={MATURITY_OPTIONS}
      licenseOptions={LICENSES}
      resetFilters={vi.fn()}
      removeFilter={removeFilter}
    />
  ));
  return { removeFilter };
};

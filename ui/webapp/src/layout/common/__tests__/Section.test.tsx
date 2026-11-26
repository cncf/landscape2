import { fireEvent, render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createSignal } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

import { FilterCategory, FilterSection } from '../../../types';
import Section from '../Section';

/** License section with a plain option and a parent option with two suboptions. */
const SECTION: FilterSection = {
  options: [
    { name: 'Non open source', value: 'non-oss' },
    {
      name: 'Open source',
      suboptions: [
        { name: 'Apache-2.0', value: 'Apache-2.0' },
        { name: 'MIT', value: 'MIT' },
      ],
      value: 'oss',
    },
  ],
  title: 'License',
  value: FilterCategory.License,
};

describe('Section', () => {
  it('adds and removes a plain option when it is checked and unchecked', async () => {
    const user = userEvent.setup();
    const { updateActiveFilters } = renderSection();

    // Check the plain option
    await user.click(screen.getByRole('checkbox', { name: 'Non open source' }));
    expect(updateActiveFilters).toHaveBeenLastCalledWith(FilterCategory.License, ['non-oss']);
    expect(screen.getByRole('checkbox', { name: 'Non open source' })).toBeChecked();

    // Uncheck it
    await user.click(screen.getByRole('checkbox', { name: 'Non open source' }));
    expect(updateActiveFilters).toHaveBeenLastCalledWith(FilterCategory.License, []);
    expect(screen.getByRole('checkbox', { name: 'Non open source' })).not.toBeChecked();
  });

  it('adds every suboption when a parent option is checked', async () => {
    const user = userEvent.setup();
    const { updateActiveFilters } = renderSection(['non-oss']);

    await user.click(screen.getByRole('checkbox', { name: 'Open source' }));

    expect(updateActiveFilters).toHaveBeenLastCalledWith(FilterCategory.License, ['non-oss', 'Apache-2.0', 'MIT']);
    expect(screen.getByRole('checkbox', { name: 'Apache-2.0' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'MIT' })).toBeChecked();
  });

  it('adds each suboption only once when the parent is checked with a suboption already active', () => {
    const { updateActiveFilters } = renderSection(['Apache-2.0']);

    // An active suboption already shows the parent as checked, so a click would
    // uncheck it: fire the checked input directly to reach the merge path
    const parent = screen.getByRole('checkbox', { name: 'Open source' });
    expect(parent).toBeChecked();
    fireEvent.input(parent);

    expect(updateActiveFilters).toHaveBeenLastCalledWith(FilterCategory.License, ['Apache-2.0', 'MIT']);
  });

  it('removes the parent option and its suboptions when the parent is unchecked', async () => {
    const user = userEvent.setup();
    const { updateActiveFilters } = renderSection(['non-oss', 'oss', 'Apache-2.0', 'MIT']);

    await user.click(screen.getByRole('checkbox', { name: 'Open source' }));

    expect(updateActiveFilters).toHaveBeenLastCalledWith(FilterCategory.License, ['non-oss']);
    expect(screen.getByRole('checkbox', { name: 'Apache-2.0' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'MIT' })).not.toBeChecked();
  });
});

// Helpers.

/**
 * Renders the License section with the active filters given, which follow the
 * `updateActiveFilters` calls as on the pages. Returns that callback mock.
 */
const renderSection = (initialActiveFilters: string[] = []) => {
  const updateActiveFilters = vi.fn();
  const [activeFilters, setActiveFilters] = createSignal<string[]>(initialActiveFilters);
  render(() => (
    <Section
      section={SECTION}
      activeFilters={activeFilters()}
      updateActiveFilters={(category, options) => {
        updateActiveFilters(category, options);
        setActiveFilters(options);
      }}
    />
  ));
  return { updateActiveFilters };
};

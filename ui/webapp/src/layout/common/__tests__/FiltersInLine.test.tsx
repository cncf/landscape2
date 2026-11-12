import { render, screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FilterCategory, type FilterSection } from '../../../types';
import FiltersInLine from '../FiltersInLine';

const SECTIONS: FilterSection[] = [
  {
    options: [
      { name: 'Apache-2.0', value: 'Apache-2.0' },
      { name: 'MIT', value: 'MIT' },
    ],
    title: 'License',
    value: FilterCategory.License,
  },
  {
    options: [{ name: 'Germany', value: 'Germany' }],
    title: 'Country',
    value: FilterCategory.Country,
  },
];

describe('FiltersInLine', () => {
  it('points each button to the panel it controls', () => {
    renderFilters();

    // Check every button controls its own panel, holding its section options
    const licenseButton = screen.getByRole('button', { name: 'License filters' });
    const countryButton = screen.getByRole('button', { name: 'Country filters' });
    const licensePanel = controlledPanel(licenseButton);
    const countryPanel = controlledPanel(countryButton);
    expect(licensePanel).not.toBe(countryPanel);
    expect(within(licensePanel).getByRole('checkbox', { name: 'MIT' })).toBeInTheDocument();
    expect(within(countryPanel).getByRole('checkbox', { name: 'Germany' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the panel with its button and closes it with Escape', async () => {
    const user = userEvent.setup();
    renderFilters();
    const button = screen.getByRole('button', { name: 'License filters' });
    const panel = controlledPanel(button);

    // Open the panel
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveClass('show');

    // Press Escape from an option and check the panel closes and the focus returns to the button
    within(panel).getByRole('checkbox', { name: 'Apache-2.0' }).focus();
    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(panel).not.toHaveClass('show');
    expect(button).toHaveFocus();
  });

  it('applies the option checked and closes the panel', async () => {
    const user = userEvent.setup();
    const { updateActiveFilters } = renderFilters();
    const button = screen.getByRole('button', { name: 'License filters' });

    await user.click(button);
    await user.click(screen.getByRole('checkbox', { name: 'MIT' }));

    expect(updateActiveFilters).toHaveBeenCalledExactlyOnceWith(FilterCategory.License, ['MIT']);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});

// Helpers.

/** Returns the panel a button controls, failing when it names no element. */
const controlledPanel = (button: HTMLElement): HTMLElement => {
  const id = button.getAttribute('aria-controls');
  expect(id).toBeTruthy();
  const panel = document.getElementById(id!);
  expect(panel).not.toBeNull();
  return panel!;
};

/** Renders the filters with no active filter, returning the update callback mock. */
const renderFilters = () => {
  const updateActiveFilters = vi.fn();
  render(() => (
    <FiltersInLine filters={SECTIONS} updateActiveFilters={updateActiveFilters} initialActiveFilters={() => ({})} />
  ));
  return { updateActiveFilters };
};

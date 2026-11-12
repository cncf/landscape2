import { render, screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import CollapsableTable from '../CollapsableTable';

const DATA = {
  Runtime: { projects: 3, subcategories: { 'Container Runtime': 2, 'Cloud Native Storage': 1 } },
  Orchestration: { projects: 2, subcategories: { Scheduling: 2 } },
};

describe('CollapsableTable', () => {
  it('expands the first category and leaves the others collapsed', () => {
    render(() => <CollapsableTable data={DATA} />);

    const orchestration = screen.getByRole('button', { name: 'Orchestration' });
    const runtime = screen.getByRole('button', { name: 'Runtime' });
    expect(orchestration).toHaveAttribute('aria-expanded', 'true');
    expect(controlledRows(orchestration)).toBeVisible();
    expect(runtime).toHaveAttribute('aria-expanded', 'false');
    expect(controlledRows(runtime)).not.toBeVisible();
  });

  it('toggles the subcategory rows and aria-expanded with the expand button', async () => {
    const user = userEvent.setup();
    render(() => <CollapsableTable data={DATA} />);
    const runtime = screen.getByRole('button', { name: 'Runtime' });
    const rows = controlledRows(runtime);

    // Expand the category
    await user.click(runtime);
    expect(runtime).toHaveAttribute('aria-expanded', 'true');
    expect(rows).toBeVisible();
    expect(
      within(rows)
        .getAllByRole('row')
        .map((row) => row.textContent)
    ).toEqual(['Cloud Native Storage1', 'Container Runtime2']);
    expect(screen.getByRole('button', { name: 'Orchestration' })).toHaveAttribute('aria-expanded', 'false');

    // Collapse it
    await user.click(runtime);
    expect(runtime).toHaveAttribute('aria-expanded', 'false');
    expect(rows).not.toBeVisible();
  });

  it('renders a plain table without tree grid roles', () => {
    render(() => <CollapsableTable data={DATA} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('treegrid')).not.toBeInTheDocument();
    expect(screen.queryByRole('gridcell')).not.toBeInTheDocument();
  });
});

// Helpers.

/** Returns the rows element an expand button controls, failing when it names no element. */
const controlledRows = (button: HTMLElement): HTMLElement => {
  const rows = document.getElementById(button.getAttribute('aria-controls') ?? '');
  expect(rows).not.toBeNull();
  return rows!;
};

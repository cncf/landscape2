import { screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createItem, createTextElement } from 'common/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../../test-utils/fixtures';
import { renderWithRouter } from '../../../test-utils/render';
import type { Item } from '../../../types';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { FullDataProvider } from '../../stores/fullData';
import Projects from '..';

vi.mock('../../navigation/Footer', () => ({ default: () => createTextElement('Footer') }));
vi.mock('../../stores/activeItem', () => ({ useUpdateActiveItemId: () => vi.fn() }));

/** Maturity options of a landscape with two maturity levels. */
const MATURITY_OPTIONS = [
  { name: 'graduated', normalized_name: 'graduated' },
  { name: 'incubating', normalized_name: 'incubating' },
];

/** Projects of two maturity levels. */
const PROJECTS: Item[] = [
  createProject({ id: 'graduated-one', maturity: 'graduated', name: 'Graduated One' }),
  createProject({ id: 'incubating-one', maturity: 'incubating', name: 'Incubating One' }),
];

describe('Projects', () => {
  it('renders only the graduated rows when the URL filters by graduated maturity', () => {
    window.baseDS = createBaseData({ maturity_options: MATURITY_OPTIONS });
    mockProjects(PROJECTS);

    renderProjects('/projects-summary?maturity=graduated');

    expect(projectNames()).toEqual(['Graduated One']);
  });

  it('clears the filters from the URL on reset', async () => {
    const user = userEvent.setup();
    window.baseDS = createBaseData({ maturity_options: MATURITY_OPTIONS });
    mockProjects(PROJECTS);

    // Render the graduated projects
    const { history } = renderProjects('/projects-summary?maturity=graduated');
    expect(projectNames()).toEqual(['Graduated One']);

    // Reset the filters
    await user.click(screen.getByRole('button', { name: 'Reset all filters' }));

    // Check every project is shown and the filter is gone from the URL
    expect(projectNames()).toEqual(['Graduated One', 'Incubating One']);
    expect(new URLSearchParams(history.get().split('?')[1]).has('maturity')).toBe(false);
  });

  it('shows the Order select when the landscape has a single maturity level', () => {
    window.baseDS = createBaseData({ maturity_options: [MATURITY_OPTIONS[0]] });
    mockProjects([PROJECTS[0]]);

    renderProjects('/projects-summary');

    expect(screen.getAllByRole('combobox', { name: 'Order options' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Maturity filters' })).not.toBeInTheDocument();
  });

  it('spans every column with the empty-state row', () => {
    window.baseDS = createBaseData({ maturity_options: MATURITY_OPTIONS });
    mockProjects([]);

    renderProjects('/projects-summary');

    const cell = screen.getByText('No projects found.').closest('td');
    expect(cell).toHaveAttribute('colspan', String(screen.getAllByRole('columnheader').length));
  });

  it('renders a dash as the last audit of a project with no audits', () => {
    window.baseDS = createBaseData({ maturity_options: MATURITY_OPTIONS });
    mockProjects([createProject({ audits: [], id: 'no-audits', maturity: 'graduated', name: 'No Audits' })]);

    renderProjects('/projects-summary');

    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');
    expect(cells[cells.length - 2]).toHaveTextContent('0');
    expect(cells[cells.length - 1]).toHaveTextContent('-');
  });
});

// Helpers.

/** Creates a project accepted on 2020-01-15; overrides replace or extend the default fields. */
function createProject(overrides: Partial<Item>): Item {
  return createItem({ accepted_at: '2020-01-15', ...overrides });
}

/** Mocks a loaded full dataset whose projects are the ones given. */
function mockProjects(projects: Item[]) {
  vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue('ready');
  vi.spyOn(itemsDataGetter, 'getItemsWithMaturity').mockReturnValue(projects);
}

/** Returns the names of the rendered project rows, in order. */
function projectNames(): string[] {
  return screen
    .getAllByRole('button', { name: /^Open .* details$/ })
    .map((button) => button.getAttribute('aria-label')!.replace(/^Open (.*) details$/, '$1'));
}

/** Renders the Projects page with the full data store, at the given URL. */
function renderProjects(url: string) {
  return renderWithRouter(
    () => (
      <FullDataProvider>
        <Projects />
      </FullDataProvider>
    ),
    { url }
  );
}

import { screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createTextElement } from 'common/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../../test-utils/fixtures';
import { renderWithRouter } from '../../../test-utils/render';
import type { FullDataset, FundingRound } from '../../../types';
import itemsDataGetter, { type ItemsDataLoadStatus } from '../../../utils/itemsDataGetter';
import { FinancesDataProvider } from '../../stores/financesData';
import { FullDataProvider } from '../../stores/fullData';
import Finances from '..';

vi.mock('../../navigation/Footer', () => ({ default: () => createTextElement('Footer') }));

/** Crunchbase url of the organization with many funding rounds. */
const BIG_ORG_URL = 'https://www.crunchbase.com/organization/big-org';

/** Crunchbase url of the organization with a few funding rounds. */
const SMALL_ORG_URL = 'https://www.crunchbase.com/organization/small-org';

describe('Finances', () => {
  it('shows the page 1 rows and writes page=1 when a filter is applied on page 3', async () => {
    const user = userEvent.setup();
    window.baseDS = createBaseData({ finances_available: true });
    mockFullData('ready', createCrunchbaseData());

    // Render the third page of the funding rounds
    const { history } = renderFinances('/finances?kind=funding&page=3&sort-by=announced_on&sort-direction=desc');
    expect(resultsSummary()).toBe('101 - 130 of 130 results');

    // Apply the Small Org filter
    await user.click(screen.getAllByRole('checkbox', { name: 'Small Org' })[0]);

    // Check the first page of the filtered rows is shown and written into the URL
    expect(resultsSummary()).toBe('1 - 10 of 10 results');
    expect(bodyRows()).toHaveLength(10);
    expect(within(bodyRows()[0]).getByText('Small Org')).toBeInTheDocument();
    const params = new URLSearchParams(history.get().split('?')[1]);
    expect(params.get('page')).toBe('1');
    expect(params.getAll('organization')).toEqual(['Small Org']);
  });

  it('clamps a page beyond the last one to the last page', () => {
    window.baseDS = createBaseData({ finances_available: true });
    mockFullData('ready', createCrunchbaseData());

    renderFinances('/finances?page=99');

    expect(resultsSummary()).toBe('101 - 130 of 130 results');
    expect(screen.getByRole('button', { name: 'Open page 3' }).closest('li')).toHaveClass('active');
  });

  it('resets the filters, the sort and the page when the kind changes', async () => {
    const user = userEvent.setup();
    window.baseDS = createBaseData({ finances_available: true });
    mockFullData('ready', createCrunchbaseData());

    // Render a filtered and sorted page of the funding rounds
    const { history } = renderFinances(
      '/finances?kind=funding&page=2&sort-by=amount&sort-direction=asc&organization=Big+Org&item=x'
    );

    // Switch to the acquisitions
    await user.click(screen.getByRole('button', { name: 'Open Acquisitions' }));

    // Check the acquisitions start from the defaults and the other params are kept
    expect(history.get()).toBe('/finances?item=x&kind=acquisitions&page=1&sort-by=announced_on&sort-direction=desc');
    expect(screen.getByRole('button', { name: 'Open Acquisitions' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows NoData and the Footer when the landscape has no finances data', () => {
    mockFullData('ready', createCrunchbaseData());

    renderFinances('/finances');

    expect(screen.getByRole('alert')).toHaveTextContent('There is no finances data available for this landscape.');
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the funding rounds table when the landscape has finances data', () => {
    window.baseDS = createBaseData({ finances_available: true });
    mockFullData('ready', createCrunchbaseData());

    renderFinances('/finances');

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(resultsSummary()).toBe('1 - 50 of 130 results');
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('shows a spinner while the full data is loading', () => {
    window.baseDS = createBaseData({ finances_available: true });
    mockFullData('loading');

    renderFinances('/finances');

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('renders the default kind when the kind param is unknown', () => {
    window.baseDS = createBaseData({ finances_available: true });
    mockFullData('ready', createCrunchbaseData());

    renderFinances('/finances?kind=foo&page=abc');

    expect(screen.getByRole('button', { name: 'Open Funding' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('columnheader', { name: 'Investment Type' })).toBeInTheDocument();
    expect(resultsSummary()).toBe('1 - 50 of 130 results');
  });
});

// Helpers.

/** Returns the rows of the table body. */
function bodyRows(): HTMLElement[] {
  return within(screen.getByRole('table').querySelector('tbody')!).getAllByRole('row');
}

/**
 * Creates Crunchbase data with 130 funding rounds: 120 from Big Org (from 2010-01-01
 * on, one per day) and 10 from Small Org (in 2000), so Small Org's are the oldest.
 */
function createCrunchbaseData(): NonNullable<FullDataset['crunchbase_data']> {
  const rounds = (count: number, start: string): FundingRound[] =>
    Array.from({ length: count }, (_, index) => ({
      amount: 1000 * (index + 1),
      announced_on: new Date(Date.parse(start) + index * 86_400_000).toISOString().slice(0, 10),
      kind: 'seed',
    }));

  return {
    [BIG_ORG_URL]: { funding_rounds: rounds(120, '2010-01-01'), generated_at: '2024-06-01T00:00:00Z', name: 'Big Org' },
    [SMALL_ORG_URL]: {
      funding_rounds: rounds(10, '2000-01-01'),
      generated_at: '2024-06-01T00:00:00Z',
      name: 'Small Org',
    },
  };
}

/** Mocks the full data status and, when given, its Crunchbase data and items. */
function mockFullData(status: ItemsDataLoadStatus, crunchbaseData?: FullDataset['crunchbase_data']) {
  vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue(status);
  vi.spyOn(itemsDataGetter, 'getAll').mockReturnValue([]);
  vi.spyOn(itemsDataGetter, 'getCrunchbaseData').mockReturnValue(crunchbaseData);
}

/** Renders the Finances page with the stores it reads, at the given URL. */
function renderFinances(url: string) {
  return renderWithRouter(
    () => (
      <FullDataProvider>
        <FinancesDataProvider>
          <Finances />
        </FinancesDataProvider>
      </FullDataProvider>
    ),
    { url }
  );
}

/** Returns the "<from> - <to> of <total> results" summary text. */
function resultsSummary(): string | undefined {
  return screen
    .getByText(/results$/, { selector: 'small' })
    .textContent?.replace(/\s+/g, ' ')
    .trim();
}

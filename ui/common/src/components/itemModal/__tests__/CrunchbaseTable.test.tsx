import { render, screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { Acquisition, FundingRound } from '../../../types/generated';
import { CrunchbaseTable } from '../CrunchbaseTable';
import { ACQUISITION_COLUMNS, FUNDING_ROUND_COLUMNS } from '../OrganizationSection';

describe('CrunchbaseTable', () => {
  it('renders all 10 rows without a toggle', () => {
    renderAcquisitions(createAcquisitions(10));

    expect(getBodyRows()).toHaveLength(10);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders all 9 rows without a toggle', () => {
    renderAcquisitions(createAcquisitions(9));

    expect(getBodyRows()).toHaveLength(9);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders 10 of 11 rows until the table is expanded', async () => {
    const user = userEvent.setup();

    // Render the collapsed table
    renderAcquisitions(createAcquisitions(11));
    expect(getBodyRows()).toHaveLength(10);
    expect(screen.queryByText('Acquiree 11')).not.toBeInTheDocument();

    // Expand it
    await user.click(screen.getByRole('button', { name: 'Show more acquisitions' }));
    expect(getBodyRows()).toHaveLength(11);
    expect(screen.getByText('Acquiree 11')).toBeInTheDocument();

    // Collapse it again
    await user.click(screen.getByRole('button', { name: 'Show less acquisitions' }));
    expect(getBodyRows()).toHaveLength(10);
  });

  it('renders nothing when every row is empty', () => {
    const { container } = renderAcquisitions([{}, { acquiree_name: undefined, price: undefined }]);

    expect(container).toBeEmptyDOMElement();
  });

  it('skips the empty rows', () => {
    renderAcquisitions([{}, { acquiree_name: 'Acquiree' }]);

    expect(getBodyRows()).toHaveLength(1);
  });

  it('renders the headers, title and cells of the acquisition columns', () => {
    renderAcquisitions([{ acquiree_name: 'Acquiree', announced_on: '2020-05-01', price: 2500000 }]);

    expect(screen.getByText('Acquisitions')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Name',
      'Price (USD)',
      'Announced on',
    ]);
    expect(getCells(0)).toEqual(['Acquiree', '$2.5M', '2020-05-01']);
  });

  it('keeps the cell text styles out of the headers', () => {
    renderFundingRounds([{ amount: 1000000, announced_on: '2021-02-01', kind: 'series_a' }]);

    // The headers take the uppercase and color of the table head, like the other headers
    for (const header of screen.getAllByRole('columnheader')) {
      for (const cellClass of ['text-capitalize', 'text-muted', 'text-truncate']) {
        expect(header).not.toHaveClass(cellClass);
      }
    }
    expect(screen.getByRole('cell', { name: 'series a' })).toHaveClass('text-capitalize', 'text-muted');
  });

  it('falls back to a dash for a missing price', () => {
    renderAcquisitions([{ acquiree_name: 'Acquiree', announced_on: '2020-05-01' }]);

    expect(getCells(0)).toEqual(['Acquiree', '-', '2020-05-01']);
  });

  it('replaces the underscores of the funding round kind', () => {
    renderFundingRounds([
      { amount: 1000000, announced_on: '2021-02-01', kind: 'series_a' },
      { announced_on: '2019-02-01', kind: 'pre_seed_round' },
      { amount: 500 },
    ]);

    expect(getCells(0)).toEqual(['series a', '$1M', '2021-02-01']);
    expect(getCells(1)).toEqual(['pre seed round', '-', '2019-02-01']);
    expect(getCells(2)).toEqual(['-', '$500', '']);
  });
});

// Helpers.

/** Creates the given number of acquisitions, named `Acquiree <n>`. */
const createAcquisitions = (count: number): Acquisition[] =>
  Array.from({ length: count }, (_, index) => ({ acquiree_name: `Acquiree ${index + 1}`, price: 1000 }));

/** Returns the rows of the table body. */
const getBodyRows = (): HTMLElement[] => within(screen.getByRole('table')).getAllByRole('row').slice(1);

/** Returns the texts of the cells of a body row. */
const getCells = (rowIndex: number): (string | null)[] =>
  within(getBodyRows()[rowIndex])
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

/** Renders an acquisitions table. */
const renderAcquisitions = (rows: Acquisition[]): ReturnType<typeof render> =>
  render(() => <CrunchbaseTable title="Acquisitions" rows={rows} columns={ACQUISITION_COLUMNS} />);

/** Renders a funding rounds table. */
const renderFundingRounds = (rows: FundingRound[]): ReturnType<typeof render> =>
  render(() => <CrunchbaseTable title="Funding rounds" rows={rows} columns={FUNDING_ROUND_COLUMNS} />);

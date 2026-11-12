import { screen, within } from '@solidjs/testing-library';
import { createTextElement } from 'common/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithRouter } from '../../../test-utils/render';
import type { Stats } from '../../../types';
import Content from '../Content';

const { charts } = vi.hoisted(() => ({ charts: [] as ChartProps[] }));

// ApexCharts needs a layout engine, so the charts record their props instead
vi.mock('solid-apexcharts', () => ({
  SolidApexCharts: (props: ChartProps) => {
    charts.push(props);
    return createTextElement('Chart');
  },
}));

/** Props of the ApexCharts component recorded by the mock. */
interface ChartProps {
  options: ApexCharts.ApexOptions;
  series: { data: unknown[]; name: string }[];
}

describe('Content', () => {
  beforeEach(() => {
    charts.length = 0;
  });

  it('shows no Funding rounds heading when the organizations only have acquisitions', () => {
    renderContent({
      generated_at: '2024-06-01T00:00:00Z',
      organizations: { acquisitions: { 2023: 2 }, acquisitions_price: { 2023: 5_000_000 } },
    });

    expect(screen.getByText('Acquisitions')).toBeInTheDocument();
    expect(screen.queryByText(/Funding rounds/)).not.toBeInTheDocument();
  });

  it('labels the funding rounds heading with their 5-year window', () => {
    renderContent({ generated_at: '2024-06-01T00:00:00Z', organizations: { funding_rounds: { 2023: 3 } } });

    expect(screen.getByText('Funding rounds (last 5 years)')).toBeInTheDocument();
    expect(screen.queryByText('Acquisitions')).not.toBeInTheDocument();
  });

  it('sets no category axis maximum in the vertical bar charts', () => {
    renderContent({
      generated_at: '2024-06-01T00:00:00Z',
      organizations: { funding_rounds: { 2022: 4, 2023: 3 }, funding_rounds_money_raised: { 2022: 0, 2023: 500 } },
    });

    expect(charts).toHaveLength(2);
    charts.forEach(({ options }) => {
      expect(options.xaxis).not.toHaveProperty('max');
      options.responsive?.forEach((responsive) => expect(responsive.options.xaxis).not.toHaveProperty('max'));
    });
    expect(charts[1].series[0].data).toEqual([0, 500]);
  });

  it('ends the weekly commits chart on the date the stats were generated', () => {
    renderContent({
      generated_at: '2024-06-01T00:00:00Z',
      repositories: {
        bytes: 0,
        contributors: 0,
        participation_stats: [4, 7],
        repositories: 1,
        stars: 0,
      },
    });

    expect(charts[0].series[0].data).toEqual([
      [Date.parse('2024-05-25T00:00:00Z'), 4],
      [Date.parse('2024-06-01T00:00:00Z'), 7],
    ]);
  });

  it('exposes the data of each chart as a table', () => {
    renderContent({
      generated_at: '2024-06-01T00:00:00Z',
      organizations: {
        acquisitions: { 2023: 2 },
        acquisitions_price: { 2023: 5_000_000 },
        funding_rounds: { 2022: 4, 2023: 3 },
        funding_rounds_money_raised: { 2023: 500 },
      },
      projects: {
        accepted_at: { '2023-01': 1, '2023-03': 2 },
        accepted_at_rt: { '2023-01': 1, '2023-03': 3 },
        projects: 3,
      },
      repositories: {
        bytes: 300,
        contributors: 0,
        languages: { Go: 2, Rust: 1 },
        languages_bytes: { Go: 200, Rust: 100 },
        participation_stats: [4, 7],
        repositories: 3,
        stars: 0,
      },
    });

    // Check every chart has its table, named after the chart (the categories table has no caption)
    const captions = screen.getAllByRole('table').map((table) => table.querySelector('caption')?.textContent);
    expect(captions.filter((caption) => caption !== undefined)).toEqual([
      'Projects over time (running total)',
      'Projects per month',
      'By number of repositories',
      'By amount of source code',
      'Number of weekly commits during the last year',
      'Number of funding rounds per year',
      'Amount raised in funding rounds per year (excluding undisclosed)',
      'Number of acquisitions per year',
      'Acquisitions cost per year (excluding undisclosed)',
    ]);

    // Check the tables hold the series of their charts
    expect(tableRows('Projects over time (running total)')).toEqual([
      ['Month', 'Projects'],
      ['2023-01', '1'],
      ['2023-03', '3'],
    ]);
    expect(tableRows('By number of repositories')).toEqual([
      ['Name', 'Value', 'Share'],
      ['Go', '2', '66.67%'],
      ['Rust', '1', '33.33%'],
    ]);
    expect(tableRows('Number of weekly commits during the last year')).toEqual([
      ['Week', 'Commits number'],
      ['2024-05-25', '4'],
      ['2024-06-01', '7'],
    ]);
    expect(tableRows('Acquisitions cost per year (excluding undisclosed)')).toEqual([
      ['Year', 'Value'],
      ['2023', '$5M'],
    ]);
  });

  it('describes each box with a linked description', () => {
    renderContent({ generated_at: '2024-06-01T00:00:00Z', projects: { projects: 3 } });

    const box = screen.getByRole('group', { description: 'Number total of projects' });
    expect(box).toHaveTextContent('3');
    expect(box).not.toHaveAttribute('aria-description');
  });
});

// Helpers.

/** Renders the stats content for the stats dataset given. */
function renderContent(stats: Stats) {
  window.statsDS = stats;
  return renderWithRouter(() => <Content />);
}

/** Returns the cells text of the table with the caption given, row by row. */
function tableRows(caption: string): string[][] {
  return within(screen.getByRole('table', { name: caption }))
    .getAllByRole('row')
    .map((row) => Array.from(row.querySelectorAll('th, td'), (cell) => cell.textContent ?? ''));
}

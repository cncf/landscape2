import { render, screen, within } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';

import { createItem } from '../../../test-utils';
import type { Item } from '../../../types/datasets';
import { ItemModalContent } from '../ItemModalContent';

const ORGANIZATION = { generated_at: '2024-01-01T00:00:00Z', name: 'Organization Inc' };

describe('ItemModalContent', () => {
  it('renders the Facebook and Gitter links when present', () => {
    const item = createItem({ facebook_url: 'https://facebook.com/item', gitter_url: 'https://gitter.im/item' });

    renderContent(item);

    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://facebook.com/item');
    expect(screen.getByRole('link', { name: 'Gitter' })).toHaveAttribute('href', 'https://gitter.im/item');
  });

  it('omits the Facebook and Gitter links otherwise', () => {
    renderContent(createItem());

    expect(screen.queryByRole('link', { name: 'Facebook' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Gitter' })).not.toBeInTheDocument();
  });

  it('shows the main TAG of a non-project and the rest under additional tags', () => {
    renderContent(createItem({ tag: ['a', 'b'] }));

    expect(screen.getByText('TAG A')).toBeInTheDocument();
    const additionalTags = screen.getByText('Additional tags').nextElementSibling as HTMLElement;
    expect(within(additionalTags).getByText('TAG B')).toBeInTheDocument();
    expect(within(additionalTags).queryByText('TAG A')).not.toBeInTheDocument();
  });

  it('shows a single TAG without additional tags', () => {
    renderContent(createItem({ tag: ['a'] }));

    expect(screen.getByText('TAG A')).toBeInTheDocument();
    expect(screen.queryByText('Additional tags')).not.toBeInTheDocument();
  });

  it('names the documentation link "Documentation"', () => {
    renderContent(createItem({ documentation_url: 'https://docs.example.com' }));

    expect(screen.getByRole('link', { name: 'Documentation' })).toHaveAttribute('href', 'https://docs.example.com');
  });

  it('renders icon links only for the present fields, with accessible names', () => {
    renderContent(createItem({ slack_url: 'https://slack.com/item', twitter_url: 'https://x.com/item' }));

    const links = ['Website', 'X (Twitter)', 'Slack'].map((name) => screen.getByRole('link', { name }));
    links.forEach((link) => {
      expect(link).toHaveAttribute('title', link.getAttribute('aria-label'));
      expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });
    expect(screen.queryByRole('link', { name: 'Discord' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Repository' })).not.toBeInTheDocument();
  });

  it('sorts the audits newest first', () => {
    renderContent(
      createItem({
        audits: [
          { date: '2021-03-01', type: 'security', url: 'https://audits.example.com/2021', vendor: 'Vendor B' },
          { date: '2023-07-15', type: 'security', url: 'https://audits.example.com/2023', vendor: 'Vendor C' },
          { date: '2019-01-10', type: 'security', url: 'https://audits.example.com/2019', vendor: 'Vendor A' },
        ],
      })
    );

    const table = within(getSection('Security audits')).getByRole('table');
    const dates = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent);
    expect(dates).toEqual(['2023-07-15', '2021-03-01', '2019-01-10']);
  });

  it('hides the organization section when requested', () => {
    const item = createItem({ crunchbase_data: ORGANIZATION });

    // Render the section by default
    const { unmount } = renderContent(item);
    expect(screen.getByRole('heading', { name: 'Organization' })).toBeInTheDocument();
    unmount();

    // Hide it on request
    renderContent(item, { hideOrganizationSection: true });
    expect(screen.queryByRole('heading', { name: 'Organization' })).not.toBeInTheDocument();
  });

  it('replaces the funding rounds table with the funding url', () => {
    renderContent(
      createItem({
        crunchbase_data: { ...ORGANIZATION, funding_rounds: [{ amount: 1000000, kind: 'series_a' }] },
        funding_url: 'https://finances.example.com',
      })
    );

    const organization = getSection('Organization');
    expect(within(organization).getByText('Funding rounds')).toBeInTheDocument();
    expect(within(organization).getByRole('link', { name: 'https://finances.example.com' })).toBeInTheDocument();
    expect(within(organization).queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the summary img onerror payload as text', () => {
    renderContent(
      createItem({
        summary: {
          business_use_case: '&lt;img src=x onerror="alert(1)"&gt;',
          use_case: '<img src=x onerror="alert(1)">Payload text',
        },
      })
    );

    const summary = getSection('Summary');
    expect(summary.querySelector('img')).toBeNull();
    expect(summary).toHaveTextContent('Payload text');
    expect(summary).toHaveTextContent('&lt;img src=x onerror="alert(1)"&gt;');
  });

  it('hides the CLOMonitor section without a report summary', () => {
    renderContent(createItem({ clomonitor_name: 'item', maturity: 'sandbox' }));

    expect(screen.queryByRole('heading', { name: 'CLOMonitor report summary' })).not.toBeInTheDocument();
  });

  it('shows the CLOMonitor section with a report summary', () => {
    renderContent(
      createItem({ clomonitor_name: 'item', clomonitor_report_summary: 'clomonitor/item.svg', maturity: 'sandbox' })
    );

    const clomonitor = getSection('CLOMonitor report summary');
    expect(within(clomonitor).getByRole('link')).toHaveAttribute('href', 'https://clomonitor.io/projects/cncf/item');
  });

  it('describes the parent project with its logo when the parent item is given', () => {
    const parentInfo = createItem({ id: 'parent', logo: 'logos/parent.svg', maturity: 'graduated', name: 'Parent' });

    renderContent(createItem({ parent_project: 'Parent' }), { parentInfo });

    const parentProject = getSection('Parent project');
    expect(within(parentProject).getByRole('img', { name: 'Parent logo' })).toBeInTheDocument();
    expect(parentProject).toHaveTextContent('Test Item is a subproject of Parent, a CNCF project.');
  });

  it('describes the parent project by name when the parent item is missing', () => {
    renderContent(createItem({ parent_project: 'Parent' }));

    const parentProject = getSection('Parent project');
    expect(within(parentProject).queryByRole('img')).not.toBeInTheDocument();
    expect(parentProject).toHaveTextContent('Test Item is a subproject of Parent.');
  });

  it('hides the parent project section for items without a parent', () => {
    renderContent(createItem());

    expect(screen.queryByRole('heading', { name: 'Parent project' })).not.toBeInTheDocument();
  });
});

// Helpers.

/** Returns the section titled with the given heading. */
const getSection = (title: string): HTMLElement => screen.getByRole('heading', { name: title }).parentElement!;

/** Renders the desktop item modal content of an item for the CNCF foundation. */
const renderContent = (
  item: Item,
  props: { hideOrganizationSection?: boolean; parentInfo?: Item } = {}
): ReturnType<typeof render> => render(() => <ItemModalContent item={item} foundation="CNCF" {...props} />);

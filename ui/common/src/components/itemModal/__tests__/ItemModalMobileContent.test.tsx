import { render, screen, within } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';

import { createItem } from '../../../test-utils';
import type { Item } from '../../../types/datasets';
import { ItemModalMobileContent } from '../ItemModalMobileContent';

// Every header link field of an item, with a GitHub primary repository
const ALL_LINKS: Partial<Item> = {
  blog_url: 'https://blog.example.com',
  devstats_url: 'https://devstats.example.com',
  discord_url: 'https://discord.com/item',
  documentation_url: 'https://docs.example.com',
  facebook_url: 'https://facebook.com/item',
  gitter_url: 'https://gitter.im/item',
  linkedin_url: 'https://linkedin.com/item',
  repositories: [{ primary: true, url: 'https://github.com/owner/repo' }],
  slack_url: 'https://slack.com/item',
  twitter_url: 'https://x.com/item',
  youtube_url: 'https://youtube.com/item',
};

describe('ItemModalMobileContent', () => {
  it('hides the CLOMonitor section when the report summary is missing', () => {
    renderContent(createItem({ clomonitor_name: 'item', maturity: 'sandbox' }));

    expect(screen.queryByRole('heading', { name: 'CLOMonitor report summary' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /CLOMonitor/ })).not.toBeInTheDocument();
  });

  it('shows the CLOMonitor section with a report summary', () => {
    renderContent(
      createItem({ clomonitor_name: 'item', clomonitor_report_summary: 'clomonitor/item.svg', maturity: 'sandbox' })
    );

    expect(screen.getByRole('heading', { name: 'CLOMonitor report summary' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'CLOMonitor report summary for Test Item' })).toHaveAttribute(
      'src',
      './clomonitor/item.svg'
    );
  });

  it('shows the organization location with its city, region and country', () => {
    renderContent(
      createItem({
        crunchbase_data: {
          city: 'City',
          country: 'Country',
          generated_at: '2024-01-01T00:00:00Z',
          name: 'Organization Inc',
          region: 'Region',
        },
      })
    );

    const organization = screen.getByRole('heading', { name: 'Organization' }).parentElement!;
    expect(within(organization).getByText('City, Region, Country')).toBeInTheDocument();
  });

  it('renders only the Website, X, Facebook and Gitter header links', () => {
    renderContent(createItem(ALL_LINKS));

    const headerLinks = screen
      .getAllByRole('link')
      .filter((link) => link.hasAttribute('aria-label'))
      .map((link) => link.getAttribute('aria-label'));
    expect(headerLinks).toEqual(['Website', 'X (Twitter)', 'Facebook', 'Gitter']);
  });

  it('renders only the Website and X header links without Facebook and Gitter urls', () => {
    renderContent(createItem({ ...ALL_LINKS, facebook_url: undefined, gitter_url: undefined }));

    const headerLinks = screen
      .getAllByRole('link')
      .filter((link) => link.hasAttribute('aria-label'))
      .map((link) => link.getAttribute('aria-label'));
    expect(headerLinks).toEqual(['Website', 'X (Twitter)']);
  });

  it('shows the full summary text', () => {
    renderContent(createItem({ summary: { use_case: 'Use case text' } }));

    expect(screen.getByText('Use case text')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('omits the TAG, accepted and end user badges', () => {
    renderContent(createItem({ accepted_at: '2020-01-01', enduser: true, maturity: 'sandbox', tag: ['a'] }));

    expect(screen.queryByText('TAG A')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Accepted at 2020-01-01')).not.toBeInTheDocument();
    expect(screen.queryByText('End user')).not.toBeInTheDocument();
  });

  it('renders a two-column audits table', () => {
    renderContent(
      createItem({
        audits: [{ date: '2023-07-15', type: 'security', url: 'https://audits.example.com/2023', vendor: 'Vendor' }],
      })
    );

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['Date', 'Vendor']);
    expect(screen.getByRole('link', { name: '2023-07-15' })).toHaveAttribute('href', 'https://audits.example.com/2023');
  });

  it('describes the parent project by name when the parent item is missing', () => {
    renderContent(createItem({ parent_project: 'Parent' }));

    const parentProject = screen.getByRole('heading', { name: 'Parent project' }).parentElement!;
    expect(parentProject).toHaveTextContent('Test Item is a subproject of Parent.');
  });
});

// Helpers.

/** Renders the mobile item modal content of an item for the CNCF foundation. */
const renderContent = (item: Item): ReturnType<typeof render> =>
  render(() => <ItemModalMobileContent item={item} foundation="CNCF" />);

import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import type { EmbedItem } from 'common/types';
import { describe, expect, it, vi } from 'vitest';

import CardItem from '../CardItem';

const ITEM: EmbedItem = {
  category: 'Provisioning',
  id: 'provisioning--automation--item',
  logo: 'logos/item.svg',
  name: 'Item',
  subcategory: 'Automation',
  website: 'https://item.example.com',
  primary_repository_url: 'https://github.com/example/item',
};

describe('CardItem', () => {
  it('renders the details link next to the icon links in link mode, without nesting', () => {
    const { container } = render(() => <CardItem item={ITEM} foundation="CNCF" />);

    expect(container.querySelectorAll('a a')).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Item details' })).toHaveAttribute(
      'href',
      `${location.origin}?item=provisioning--automation--item`
    );
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute('href', 'https://item.example.com');
    expect(screen.getByRole('link', { name: 'Repository' })).toHaveAttribute('href', 'https://github.com/example/item');
  });

  it('omits the repository link when the item has no primary repository', () => {
    render(() => <CardItem item={{ ...ITEM, primary_repository_url: undefined }} foundation="CNCF" />);

    expect(screen.queryByRole('link', { name: 'Repository' })).not.toBeInTheDocument();
  });

  it('titles the foundation badge with the foundation and the maturity badge with the maturity', () => {
    render(() => <CardItem item={{ ...ITEM, maturity: 'graduated' }} foundation="CNCF" />);

    expect(screen.getByText('CNCF')).toHaveAttribute('title', 'CNCF');
    expect(screen.getByText('graduated')).toHaveAttribute('title', 'graduated');
  });

  it('renders no website link for a javascript: website', () => {
    render(() => <CardItem item={{ ...ITEM, website: 'javascript:alert(1)' }} foundation="CNCF" />);

    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  it('calls onClick from the details button in button mode', async () => {
    // Setup
    const onClick = vi.fn();
    render(() => <CardItem item={ITEM} foundation="CNCF" onClick={onClick} />);

    // Run
    await userEvent.setup().click(screen.getByRole('button', { name: 'Item info' }));

    // Check
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole('link', { name: 'Item details' })).not.toBeInTheDocument();
  });
});

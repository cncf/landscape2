import { render, screen, within } from '@solidjs/testing-library';
import { createItem } from 'common/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../../test-utils/fixtures';
import type { LandscapeItem } from '../../../types';
import SubcategoryExtended from '../SubcategoryExtended';

vi.mock('../SubcategoryGrid', () => ({
  default: (props: { items?: LandscapeItem[] }) => (
    <div>Grid: {(props.items ?? []).map((item) => item.name).join(', ')}</div>
  ),
}));

describe('SubcategoryExtended', () => {
  beforeEach(() => {
    window.baseDS = createBaseData({
      items: [
        createItem({ category: 'Runtime', id: 'item-1', maturity: 'graduated', name: 'Item 1', subcategory: 'Sub' }),
        createItem({
          additional_categories: [{ category: 'Runtime', subcategory: 'Sub' }],
          category: 'Security',
          id: 'item-2',
          maturity: 'sandbox',
          name: 'Item 2',
          subcategory: 'Other',
        }),
        createItem({ category: 'Runtime', id: 'item-3', name: 'Item 3', subcategory: 'Sub' }),
        createItem({ category: 'Runtime', id: 'item-4', maturity: 'incubating', name: 'Item 4', subcategory: 'Other' }),
      ],
    });
  });

  it('lists the items of the subcategory, including those added through additional categories', () => {
    render(() => <SubcategoryExtended category="Runtime" subcategory="Sub" />);

    expect(screen.getByText('Grid: Item 1, Item 2, Item 3')).toBeInTheDocument();
  });

  it('lists only the items with a maturity in its table', () => {
    render(() => <SubcategoryExtended category="Runtime" subcategory="Sub" />);

    const table = screen.getByRole('table');
    const rows = within(table)
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(rows).toEqual(['Item 1 (graduated)', 'Item 2 (sandbox)']);
  });

  it('renders neither the table nor the grid when the subcategory has no items or keywords', () => {
    render(() => <SubcategoryExtended category="Runtime" subcategory="Missing" />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Grid:/)).not.toBeInTheDocument();
  });
});

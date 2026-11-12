import { render, screen } from '@solidjs/testing-library';
import { createItem } from 'common/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LandscapeItem } from '../../../types';
import type { CategoryData } from '../../../utils/itemsDataGetter';
import Grid from '../Grid';

/** Subcategories of the category, one row each because the category is overridden. */
const SUBCATEGORIES = ['Subcategory A', 'Subcategory B', 'Subcategory C'];

vi.mock('../../explore/grid/GridItem', () => ({
  default: (props: { item: LandscapeItem }) => <div>Grid item {props.item.name}</div>,
}));

describe('Grid', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200);
  });

  it('lets only the last row grow', () => {
    renderGrid();

    const rows = SUBCATEGORIES.map((name) => screen.getByText(name).closest('.flex-nowrap'));
    expect(rows[0]).not.toHaveClass('flex-grow-1');
    expect(rows[1]).not.toHaveClass('flex-grow-1');
    expect(rows[2]).toHaveClass('flex-grow-1');
  });

  it('renders the items of each subcategory once the wrapper has a width', () => {
    renderGrid();

    for (const name of SUBCATEGORIES) {
      expect(screen.getByText(`Grid item ${name} item`)).toBeInTheDocument();
    }
  });
});

// Helpers.

/** Renders the overridden category, with one item per subcategory. */
const renderGrid = () => {
  const categoryData: CategoryData = Object.fromEntries(
    SUBCATEGORIES.map((name) => [
      name,
      {
        items: [createItem({ id: `${name}-item`, name: `${name} item`, subcategory: name })],
        itemsCount: 1,
        itemsFeaturedCount: 0,
      },
    ])
  );
  render(() => (
    <Grid
      categoryName="Category"
      index={0}
      bgColor="#000000"
      isOverridden
      subcategories={SUBCATEGORIES.map((name) => ({ itemsCount: 1, itemsFeaturedCount: 0, name }))}
      categoryData={categoryData}
    />
  ));
};

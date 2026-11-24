import { screen, waitFor } from '@solidjs/testing-library';
import { createItem } from 'common/test-utils';
import { createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';

import { renderWithExploreStores } from '../../../../test-utils/render';
import type { Item } from '../../../../types';
import type { CategoriesData } from '../../../../utils/itemsDataGetter';
import GridCategory from '..';

// Width of the grid container in the tests
const GRID_WIDTH = 1200;

describe('GridCategory', () => {
  it('removes a category left without items and keeps the others', async () => {
    // Render two categories with an item each
    const [data, setData] = createSignal<CategoriesData>({
      ...categoryData('Category 1', [item('Category 1', 'item-a')]),
      ...categoryData('Category 2', [item('Category 2', 'item-b')]),
    });
    renderWithExploreStores(() => <GridCategory data={data()} initialIsVisible />, { gridWidth: GRID_WIDTH });
    expect(await screen.findByRole('img', { name: 'item-a logo' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'item-b logo' })).toBeInTheDocument();

    // Filter the items of the first category out (the grid data drops empty categories)
    setData(categoryData('Category 2', [item('Category 2', 'item-b')]));

    // Check the first category is removed and the second one is still rendered
    await waitFor(() => expect(screen.queryByRole('img', { name: 'item-a logo' })).not.toBeInTheDocument());
    expect(screen.queryByText('Category 1')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'item-b logo' })).toBeInTheDocument();
  });

  it('removes every category when no category has items left', async () => {
    // Render a category with an item
    const [data, setData] = createSignal<CategoriesData>(categoryData('Category 1', [item('Category 1', 'item-a')]));
    renderWithExploreStores(() => <GridCategory data={data()} initialIsVisible />, { gridWidth: GRID_WIDTH });
    expect(await screen.findByRole('img', { name: 'item-a logo' })).toBeInTheDocument();

    // Filter every item out
    setData({});

    // Check nothing is rendered
    await waitFor(() => expect(screen.queryByRole('img', { name: 'item-a logo' })).not.toBeInTheDocument());
    expect(screen.queryByText('Category 1')).not.toBeInTheDocument();
  });
});

// Helpers.

/** Builds the grid data of a category with a single subcategory holding the items given. */
function categoryData(category: string, items: Item[]): CategoriesData {
  return {
    [category]: {
      'Sub 1': {
        items,
        itemsCount: items.length,
        itemsFeaturedCount: items.filter((i) => i.featured).length,
      },
    },
  };
}

/** Creates an item of the category given whose id, name and logo derive from the id given. */
function item(category: string, id: string): Item {
  return createItem({ category, id, logo: `logos/${id}.svg`, name: id, subcategory: 'Sub 1' });
}

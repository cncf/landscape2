import { screen } from '@solidjs/testing-library';
import { createItem } from 'common/test-utils';
import { createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';

import { renderWithExploreStores } from '../../../../test-utils/render';
import type { Item } from '../../../../types';
import type { CategoryData } from '../../../../utils/itemsDataGetter';
import Grid, { ItemsList } from '../Grid';

/** Width of the grid container in the tests. */
const GRID_WIDTH = 1200;

/** Featured information of the featured test items. */
const FEATURED = { label: 'Graduated', order: 1 };

describe('Grid', () => {
  it('renders the new logos when the items change but the counts stay the same', async () => {
    // Render a subcategory with a single item
    const setItems = renderGrid([item('item-a')]);
    expect(await screen.findByRole('img', { name: 'item-a logo' })).toBeInTheDocument();

    // Swap the item for another one, keeping the counts
    setItems([item('item-b')]);

    // Check the new logo replaces the old one
    expect(await screen.findByRole('img', { name: 'item-b logo' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'item-a logo' })).not.toBeInTheDocument();
  });

  it('renders the new logos of a subcategory mixing featured and plain items', async () => {
    // Render a subcategory with a featured and a plain item
    const setItems = renderGrid([item('featured-a', { featured: FEATURED }), item('plain-a')]);
    expect(await screen.findByRole('img', { name: 'plain-a logo' })).toBeInTheDocument();

    // Swap both items, keeping the counts
    setItems([item('featured-b', { featured: FEATURED }), item('plain-b')]);

    // Check the new logos replace the old ones
    expect(await screen.findByRole('img', { name: 'featured-b logo' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'plain-b logo' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'plain-a logo' })).not.toBeInTheDocument();
  });

  it('places the featured items first', async () => {
    renderGrid([item('plain'), item('featured', { featured: FEATURED }), item('other')]);

    expect(await screen.findByText('Graduated')).toBeInTheDocument();
    expect(screen.getAllByRole('img').map((img) => img.getAttribute('alt'))[0]).toBe('featured logo');
  });
});

describe('ItemsList', () => {
  it('renders the new items when the list changes but keeps its length', async () => {
    // Render a list with two items
    const [items, setItems] = createSignal<Item[]>([item('first-a'), item('second-a')]);
    renderWithExploreStores(
      () => <ItemsList items={items()} percentage={100} borderColor="red" activeDropdown={false} />,
      { gridWidth: GRID_WIDTH }
    );
    expect(await screen.findByRole('img', { name: 'first-a logo' })).toBeInTheDocument();

    // Swap the items for two others
    setItems([item('first-b'), item('second-b')]);

    // Check the new items are rendered
    expect(await screen.findByRole('img', { name: 'first-b logo' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'second-b logo' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'first-a logo' })).not.toBeInTheDocument();
  });

  it('keeps the rendered items when a new list has the same ids', async () => {
    // Render a list with two items
    const [items, setItems] = createSignal<Item[]>([item('first'), item('second')]);
    renderWithExploreStores(
      () => <ItemsList items={items()} percentage={100} borderColor="red" activeDropdown={false} />,
      { gridWidth: GRID_WIDTH }
    );
    const logo = await screen.findByRole('img', { name: 'first logo' });

    // Pass copies of the same items
    setItems([item('first'), item('second')]);

    // Check the rendered nodes are kept
    expect(screen.getByRole('img', { name: 'first logo' })).toBe(logo);
  });
});

// Helpers.

/** Builds the data of a category with a single subcategory holding the items given. */
function categoryData(items: Item[]): CategoryData {
  return {
    'Sub 1': {
      items,
      itemsCount: items.length,
      itemsFeaturedCount: items.filter((i) => i.featured).length,
    },
  };
}

/** Creates an item whose id, name and logo derive from the id given. */
function item(id: string, overrides: Partial<Item> = {}): Item {
  return createItem({
    category: 'Category 1',
    id,
    logo: `logos/${id}.svg`,
    name: id,
    subcategory: 'Sub 1',
    ...overrides,
  });
}

/** Renders the grid of a category with the items given, returning a function that replaces them. */
function renderGrid(initialItems: Item[]): (items: Item[]) => void {
  const [data, setData] = createSignal<CategoryData>(categoryData(initialItems));
  renderWithExploreStores(
    () => (
      <Grid
        initialCategoryData={data()}
        categoryName="Category 1"
        isOverridden={false}
        subcategories={Object.entries(data()).map(([name, subcategory]) => ({
          itemsCount: subcategory.itemsCount,
          itemsFeaturedCount: subcategory.itemsFeaturedCount,
          name,
        }))}
        backgroundColor="red"
        categoryIndex={0}
      />
    ),
    { gridWidth: GRID_WIDTH }
  );
  return (items) => setData(categoryData(items));
}

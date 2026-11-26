import { screen, waitFor } from '@solidjs/testing-library';
import { createItem, createTextElement } from 'common/test-utils';
import { For } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

import { renderWithExploreStores } from '../../../test-utils/render';
import { ClassifyOption, Item, SortDirection, SortOption } from '../../../types';
import type { CategoriesData } from '../../../utils/itemsDataGetter';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { useGroupActive } from '../../stores/groupActive';
import Content from '../Content';

vi.mock('../card', () => ({ default: () => createTextElement('Card view') }));

// Width of the grid container in the tests
const GRID_WIDTH = 1200;

// Featured information of the test item, which is not featured in g2
const FEATURED = { excluded_groups: ['g2'], label: 'Graduated', order: 1 };

describe('Content', () => {
  it('keeps the featured items of a hidden group when another group becomes active', async () => {
    // Render the grids of two groups sharing an item featured in g1 only, with g1 active
    const { history } = renderGroups(['g1', 'g2'], '/?group=g1&view-mode=grid');
    expect(await screen.findByText('Graduated')).toBeInTheDocument();
    const logo = screen.getByRole('img', { name: 'featured logo' });

    // Make g2 active, which renders its grid and hides the g1 one
    history.set({ value: '/?group=g2&view-mode=grid' });
    await waitFor(() => expect(screen.getAllByRole('img', { name: 'featured logo' })).toHaveLength(2));

    // Check the hidden g1 grid keeps its logo, and the item is still featured there only
    expect(screen.getAllByRole('img', { name: 'featured logo' })).toContain(logo);
    expect(screen.getAllByText('Graduated')).toHaveLength(1);
  });
});

// Helpers.

/** Builds the grid data of a category with a single subcategory holding the items given. */
function categoryData(items: Item[]): CategoriesData {
  return {
    'Category 1': {
      'Sub 1': {
        items,
        itemsCount: items.length,
        itemsFeaturedCount: items.filter((i) => i.featured).length,
      },
    },
  };
}

/**
 * Renders the Content of each group given at the URL given, as Explore does, each group
 * holding the same featured item. Returns what `renderWithExploreStores` returns.
 */
function renderGroups(groups: string[], url: string) {
  vi.spyOn(itemsDataGetter, 'getGroups').mockReturnValue(groups);
  const data = categoryData([
    createItem({
      category: 'Category 1',
      featured: FEATURED,
      id: 'featured',
      logo: 'logos/featured.svg',
      name: 'featured',
      subcategory: 'Sub 1',
    }),
  ]);
  const Groups = () => {
    const activeGroup = useGroupActive();
    return (
      <For each={groups}>
        {(group: string) => (
          <Content
            group={group}
            initialSelectedGroup={activeGroup()}
            data={data}
            classify={ClassifyOption.Category}
            sorted={SortOption.Name}
            direction={SortDirection.Asc}
          />
        )}
      </For>
    );
  };
  return renderWithExploreStores(() => <Groups />, { gridWidth: GRID_WIDTH, url });
}

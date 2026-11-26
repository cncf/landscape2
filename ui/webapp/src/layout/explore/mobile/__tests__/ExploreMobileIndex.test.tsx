import { screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createItem, setViewportWidth, tabTo } from 'common/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import { createBaseData } from '../../../../test-utils/fixtures';
import { renderWithExploreStores } from '../../../../test-utils/render';
import { CardMenu, ClassifyOption, type Item, SortDirection, SortOption } from '../../../../types';
import type { CategoriesData } from '../../../../utils/itemsDataGetter';
import ExploreMobileIndex from '../ExploreMobileIndex';

/** Viewport width of a phone. */
const PHONE_WIDTH = 400;

describe('ExploreMobileIndex', () => {
  beforeEach(() => {
    setViewportWidth(PHONE_WIDTH);
    window.baseDS = createBaseData({
      categories: [
        {
          name: 'Category 1',
          normalized_name: 'category-1',
          subcategories: [
            { name: 'Sub 1', normalized_name: 'sub-1' },
            { name: 'Sub 2', normalized_name: 'sub-2' },
          ],
        },
        {
          name: 'Category 2',
          normalized_name: 'category-2',
          subcategories: [
            { name: 'Zeta', normalized_name: 'zeta' },
            { name: 'Alpha', normalized_name: 'alpha' },
          ],
        },
      ],
      categories_overridden: ['Category 2'],
    });
  });

  it.each<{ classify: ClassifyOption; menu?: CardMenu }>([
    { classify: ClassifyOption.Maturity, menu: { Maturity: ['graduated', 'sandbox'] } },
    { classify: ClassifyOption.TAG, menu: { Tag: ['runtime'] } },
    { classify: ClassifyOption.None, menu: undefined },
  ])('lists every grid section after the Card view classified by $classify', ({ classify, menu }) => {
    renderIndex(classify, menu);

    // Check the content lists every category and subcategory with items
    const content = screen.getByTestId('explore-mobile-content');
    expect(sectionIds(content)).toEqual([
      'card_category-1--sub-1',
      'card_category-1--sub-2',
      'card_category-2--zeta',
      'card_category-2--alpha',
    ]);
    expect(screen.getAllByText('Category 1')).toHaveLength(2);
    expect(screen.getAllByText('Category 2')).toHaveLength(2);
    expect(within(content).getByRole('button', { name: 'Open item-1 info' })).toBeInTheDocument();
    expect(within(content).getByRole('button', { name: 'Open item-4 info' })).toBeInTheDocument();

    // Check the index sidebar lists the same sections
    const sidebar = screen.getByRole('complementary', { name: 'Index' });
    expect(
      within(sidebar)
        .getAllByRole('button', { name: /^(Sub \d|Zeta|Alpha)$/ })
        .map((b) => b.textContent)
    ).toEqual(['Sub 1', 'Sub 2', 'Zeta', 'Alpha']);
  });

  it('skips the categories and subcategories without items', () => {
    renderIndex(ClassifyOption.Category, undefined, {
      'Category 1': { 'Sub 1': subcategory([]), 'Sub 2': subcategory([gridItem('item-2', 'Category 1', 'Sub 2')]) },
      'Category 2': { Zeta: subcategory([]) },
    });

    expect(sectionIds(screen.getByTestId('explore-mobile-content'))).toEqual(['card_category-1--sub-2']);
    expect(screen.queryByText('Category 2')).not.toBeInTheDocument();
  });

  it.each<{ classify: ClassifyOption; menu: CardMenu; title: string }>([
    { classify: ClassifyOption.Maturity, menu: { Maturity: ['graduated', 'undefined'] }, title: 'graduated' },
    { classify: ClassifyOption.TAG, menu: { Tag: ['app-delivery', 'undefined'] }, title: 'App Delivery' },
  ])('titles the Card view section of the items without a $classify as None', ({ classify, menu, title }) => {
    const [name] = Object.values(menu)[0];
    renderWithExploreStores(
      () => (
        <div data-testid="explore-mobile-content">
          <ExploreMobileIndex
            openMenuStatus={false}
            closeMenuStatus={() => {}}
            data={gridData()}
            cardData={{
              [name]: [gridItem('item-1', 'Category 1', 'Sub 1')],
              undefined: [gridItem('item-2', 'Category 1', 'Sub 2')],
            }}
            menu={menu}
            classify={classify}
            sorted={SortOption.Name}
            direction={SortDirection.Asc}
          />
        </div>
      ),
      { url: '/?view-mode=card' }
    );

    // Check the section with a value keeps its title and the other one reads None
    const content = screen.getByTestId('explore-mobile-content');
    expect(within(content).getByText(title)).toBeInTheDocument();
    expect(document.getElementById(`card_${classify}--undefined`)).toHaveTextContent(/^None$/);
    expect(within(content).queryByText('undefined')).not.toBeInTheDocument();
  });

  it('opens a Card view item with the keyboard', async () => {
    const user = userEvent.setup();

    // Render the Card view classified by maturity
    const { history } = renderWithExploreStores(
      () => (
        <ExploreMobileIndex
          openMenuStatus={false}
          closeMenuStatus={() => {}}
          data={gridData()}
          cardData={{ graduated: [gridItem('item-1', 'Category 1', 'Sub 1')] }}
          menu={{ Maturity: ['graduated'] }}
          classify={ClassifyOption.Maturity}
          sorted={SortOption.Name}
          direction={SortDirection.Asc}
        />
      ),
      { url: '/?view-mode=card' }
    );

    // Tab to the item and open it with Enter
    await tabTo(user, screen.getByRole('button', { name: 'Open item-1 details' }));
    await user.keyboard('{Enter}');

    // Check the item is open
    expect(new URL(history.get(), 'http://localhost').searchParams.get('item')).toBe('item-1');
  });
});

// Helpers.

/** Grid data of a group with two categories, the second one with overridden subcategories. */
function gridData(): CategoriesData {
  return {
    'Category 1': {
      'Sub 1': subcategory([gridItem('item-1', 'Category 1', 'Sub 1')]),
      'Sub 2': subcategory([gridItem('item-2', 'Category 1', 'Sub 2')]),
    },
    'Category 2': {
      Alpha: subcategory([gridItem('item-3', 'Category 2', 'Alpha')]),
      Zeta: subcategory([gridItem('item-4', 'Category 2', 'Zeta')]),
    },
  };
}

/** Creates a grid item named after its id. */
function gridItem(id: string, category: string, subcategory: string): Item {
  return createItem({ category, id, logo: `logos/${id}.svg`, name: id, subcategory });
}

/** Renders the mobile index in Grid view, with the Card-view menu of the classification given. */
function renderIndex(classify: ClassifyOption, menu?: CardMenu, data: CategoriesData = gridData()) {
  return renderWithExploreStores(
    () => (
      <div data-testid="explore-mobile-content">
        <ExploreMobileIndex
          openMenuStatus={false}
          closeMenuStatus={() => {}}
          data={data}
          cardData={{}}
          menu={menu}
          classify={classify}
          sorted={SortOption.Name}
          direction={SortDirection.Asc}
        />
      </div>
    ),
    { url: '/?view-mode=grid' }
  );
}

/** Returns the ids of the subcategory sections, the anchors the index navigates to, in order. */
function sectionIds(content: HTMLElement): string[] {
  return Array.from(content.querySelectorAll('[id^="card_"]')).map((section) => section.id);
}

/** Builds the grid data of a subcategory holding the items given. */
function subcategory(items: Item[]) {
  return { items, itemsCount: items.length, itemsFeaturedCount: 0 };
}

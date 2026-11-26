import { embedFixtures } from 'common/test-utils';
import type { EmbedItem, EmbedView } from 'common/types';
import { describe, expect, it } from 'vitest';

import {
  dedupeItemsById,
  filterBySelectedSubcategories,
  filterItemsBySubcategory,
  getCategoryClassification,
  prepareItemForCategoryView,
  sortItemsByName,
} from '../categoryView';

const CATEGORY_VIEW = embedFixtures['category_category-1'];

// Item listed in two categories that both have a subcategory named "Shared"
const SHARED_NAME_ITEM = createEmbedItem({
  additional_categories: [{ category: 'Category 1', subcategory: 'Other' }],
  category: 'Category 2',
  id: 'shared-name-item',
  name: 'Shared name item',
  subcategory: 'Shared',
});

describe('dedupeItemsById', () => {
  it('keeps the first item with each id', () => {
    const first = createEmbedItem({ id: 'a', name: 'First' });
    const second = createEmbedItem({ id: 'b', name: 'Second' });
    const repeated = createEmbedItem({ id: 'a', name: 'Repeated' });

    expect(dedupeItemsById([first, second, repeated])).toEqual([first, second]);
  });
});

describe('filterBySelectedSubcategories', () => {
  it('keeps the selected subcategories and the items listed in them', () => {
    const view = filterBySelectedSubcategories(CATEGORY_VIEW, ['subcategory-1-1']);

    expect(getCategoryClassification(view)?.category.subcategories.map((s) => s.normalized_name)).toEqual([
      'subcategory-1-1',
    ]);
    expect(view.items.map((item) => item.id)).toEqual([
      'category-1--subcategory-1-1--item-1',
      'category-1--subcategory-1-1--item-2',
      'category-2--subcategory-2-1--item-3',
    ]);
  });

  it.each([
    ['no selection', []],
    ['the all selection', ['all']],
    ['a blank selection', ['']],
    ['unknown subcategories', ['unknown', 'subcategory-9']],
  ])('keeps the view as it is for %s', (_, selection) => {
    expect(filterBySelectedSubcategories(CATEGORY_VIEW, selection)).toBe(CATEGORY_VIEW);
  });

  it('ignores the all entry next to a selected subcategory', () => {
    const view = filterBySelectedSubcategories(CATEGORY_VIEW, ['all', 'subcategory-1-2']);

    expect(getCategoryClassification(view)?.category.subcategories.map((s) => s.name)).toEqual(['Subcategory 1-2']);
    expect(view.items).toEqual([]);
  });

  it('does not match an item through a subcategory with the same name in another category', () => {
    // Setup
    const view = createCategoryView(
      [
        { name: 'Other', normalized_name: 'other' },
        { name: 'Shared', normalized_name: 'shared' },
      ],
      [SHARED_NAME_ITEM]
    );

    // Run
    const sharedView = filterBySelectedSubcategories(view, ['shared']);
    const otherView = filterBySelectedSubcategories(view, ['other']);

    // Check
    expect(sharedView.items).toEqual([]);
    expect(otherView.items).toEqual([SHARED_NAME_ITEM]);
  });

  it('keeps views of other classifications as they are', () => {
    const view = embedFixtures.maturity_all;

    expect(filterBySelectedSubcategories(view, ['subcategory-1-1'])).toBe(view);
  });
});

describe('filterItemsBySubcategory', () => {
  it('selects the items listed directly or through an additional category', () => {
    const items = filterItemsBySubcategory(CATEGORY_VIEW.items, 'Category 1', 'Subcategory 1-1');

    expect(items.map((item) => [item.id, item.category, item.subcategory])).toEqual([
      ['category-1--subcategory-1-1--item-1', 'Category 1', 'Subcategory 1-1'],
      ['category-1--subcategory-1-1--item-2', 'Category 1', 'Subcategory 1-1'],
      ['category-2--subcategory-2-1--item-3', 'Category 1', 'Subcategory 1-1'],
    ]);
  });

  it('selects nothing for a subcategory with the same name in another category', () => {
    expect(filterItemsBySubcategory([SHARED_NAME_ITEM], 'Category 1', 'Shared')).toEqual([]);
  });
});

describe('getCategoryClassification', () => {
  it('returns the classification of a category view', () => {
    expect(getCategoryClassification(CATEGORY_VIEW)?.category.name).toBe('Category 1');
  });

  it.each(['maturity_all', 'tag_all'])('returns null for the %s view', (key) => {
    expect(getCategoryClassification(embedFixtures[key])).toBeNull();
  });
});

describe('prepareItemForCategoryView', () => {
  it('keeps an item listed directly in the subcategory as it is', () => {
    const item = createEmbedItem({ category: 'Category 1', subcategory: 'Subcategory 1-1' });

    expect(prepareItemForCategoryView(item, 'Category 1', 'Subcategory 1-1')).toBe(item);
  });

  it('swaps the primary category of an item matched through an additional category', () => {
    // Setup
    const item = createEmbedItem({
      additional_categories: [
        { category: 'Category 1', subcategory: 'Subcategory 1-1' },
        { category: 'Category 2', subcategory: 'Subcategory 2-1' },
        { category: 'Category 3', subcategory: 'Subcategory 3-1' },
      ],
      category: 'Category 2',
      subcategory: 'Subcategory 2-1',
    });

    // Run
    const prepared = prepareItemForCategoryView(item, 'Category 1', 'Subcategory 1-1');

    // Check
    expect(prepared).toMatchObject({ category: 'Category 1', subcategory: 'Subcategory 1-1' });
    expect(prepared.additional_categories).toEqual([
      { category: 'Category 2', subcategory: 'Subcategory 2-1' },
      { category: 'Category 3', subcategory: 'Subcategory 3-1' },
    ]);
    expect(item.category).toBe('Category 2');
  });
});

describe('sortItemsByName', () => {
  it('sorts by name ignoring case, without changing the input', () => {
    const items = [
      createEmbedItem({ name: 'beta' }),
      createEmbedItem({ name: 'Gamma' }),
      createEmbedItem({ name: 'Alpha' }),
    ];

    expect(sortItemsByName(items).map((item) => item.name)).toEqual(['Alpha', 'beta', 'Gamma']);
    expect(items.map((item) => item.name)).toEqual(['beta', 'Gamma', 'Alpha']);
  });
});

// Helpers.

/** Builds a "Category 1" embed view with the subcategories and items given. */
function createCategoryView(subcategories: { name: string; normalized_name: string }[], items: EmbedItem[]): EmbedView {
  return {
    classification: { category: { name: 'Category 1', normalized_name: 'category-1', subcategories } },
    foundation: 'Foundation',
    items,
  };
}

/** Builds an embed item, overriding the defaults with the fields given. */
function createEmbedItem(fields: Partial<EmbedItem>): EmbedItem {
  return {
    category: 'Category 1',
    id: 'item',
    logo: 'item.svg',
    name: 'Item',
    subcategory: 'Subcategory 1-1',
    website: 'https://item.example',
    ...fields,
  };
}

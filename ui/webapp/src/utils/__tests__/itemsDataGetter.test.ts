import { createItem, flushPromises } from 'common/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../test-utils/fixtures';
import { BaseData, ClassifyOption, FilterCategory, FullDataset, Item } from '../../types';
import { type ClassifyAndSortOptions, ItemsDataGetter, type ItemsDataLoadStatus } from '../itemsDataGetter';

/** Items of the test landscape: `item-2` is also listed in Category B through an additional category. */
const ITEMS: Item[] = [
  createItem({
    category: 'Category A',
    id: 'item-1',
    maturity: 'graduated',
    name: 'Item 1',
    subcategory: 'Sub A1',
    tag: ['runtime'],
  }),
  createItem({
    additional_categories: [{ category: 'Category B', subcategory: 'Sub B1' }],
    category: 'Category A',
    featured: { label: 'Featured' },
    id: 'item-2',
    maturity: 'archived',
    name: 'Item 2',
    subcategory: 'Sub A2',
  }),
  createItem({ category: 'Category B', id: 'item-3', name: 'Item 3', subcategory: 'Sub B1', tag: ['security'] }),
  createItem({ category: 'Category B', id: 'item-4', maturity: 'sandbox', name: 'Item 4', subcategory: 'Sub B1' }),
];

describe('ItemsDataGetter', () => {
  beforeEach(() => {
    window.baseDS = testBaseData();
  });

  describe('init', () => {
    it('sets ready with the classify and sort options already prepared when the subscriber is notified', () => {
      // Setup
      const getter = new ItemsDataGetter();
      const notified: { options: Record<string, ClassifyAndSortOptions>; status: ItemsDataLoadStatus }[] = [];
      getter.subscribe({
        updateStatus: (status) => notified.push({ options: getter.getClassifyAndSortOptions(), status }),
      });

      // Run
      getter.init(fullDataset());

      // Check
      expect(getter.getStatus()).toBe('ready');
      expect(notified.map(({ status }) => status)).toEqual(['loading', 'ready']);
      expect(notified[1].options.all.classify).toEqual([
        ClassifyOption.None,
        ClassifyOption.Category,
        ClassifyOption.Maturity,
        ClassifyOption.TAG,
      ]);
      expect(Object.keys(notified[1].options).sort()).toEqual(['all', 'g1', 'g2']);
    });

    it.each([
      ['the request fails', () => Promise.reject(new Error('offline'))],
      ['the response is not ok', () => Promise.resolve(new Response('', { status: 500 }))],
    ])('sets error when %s, and init() retries', async (_, failedFetch) => {
      // Setup
      const fetchMock = vi
        .fn<() => Promise<Response>>()
        .mockImplementationOnce(failedFetch)
        .mockResolvedValueOnce(Response.json(fullDataset()));
      vi.stubGlobal('fetch', fetchMock);
      const getter = new ItemsDataGetter();
      getter.prepareGroups();

      // Run the failed load
      getter.init();
      await flushPromises();

      // Check
      expect(getter.getStatus()).toBe('error');
      expect(getter.getItemById('item-1')).toBeUndefined();

      // Run the retry
      getter.init();
      await flushPromises();

      // Check
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(getter.getStatus()).toBe('ready');
      expect(getter.getItemById('item-1')?.name).toBe('Item 1');
    });
  });

  describe('subscribe', () => {
    it('returns a function that stops the notifications of that subscriber only', () => {
      // Setup
      const getter = new ItemsDataGetter();
      const first = vi.fn();
      const second = vi.fn();
      const unsubscribeFirst = getter.subscribe({ updateStatus: first });
      getter.subscribe({ updateStatus: second });

      // Run
      unsubscribeFirst();
      getter.init(fullDataset());

      // Check
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenLastCalledWith('ready');
    });
  });

  describe('prepareGroups', () => {
    it('keeps only the groups that share categories with the landscape', () => {
      // Setup
      window.baseDS = testBaseData({
        groups: [
          { categories: ['Category A'], name: 'Group 1', normalized_name: 'g1' },
          { categories: ['Unknown category'], name: 'Group 2', normalized_name: 'g2' },
          { categories: ['Category B', 'Unknown category'], name: 'Group 3', normalized_name: 'g3' },
        ],
      });
      const getter = new ItemsDataGetter();

      // Run
      getter.prepareGroups();

      // Check
      expect(getter.getGroups()).toEqual(['g1', 'g3']);
    });
  });

  describe('getCategoriesAndSubcategoriesWithItems', () => {
    it('drops the subcategories and categories without items', () => {
      // Setup
      window.baseDS = testBaseData({
        categories: [
          {
            name: 'Category A',
            normalized_name: 'category-a',
            subcategories: [
              { name: 'Sub A1', normalized_name: 'sub-a1' },
              { name: 'Sub A2', normalized_name: 'sub-a2' },
              { name: 'Empty', normalized_name: 'empty' },
            ],
          },
          {
            name: 'Category B',
            normalized_name: 'category-b',
            subcategories: [{ name: 'Sub B1', normalized_name: 'sub-b1' }],
          },
          {
            name: 'Empty category',
            normalized_name: 'empty-category',
            subcategories: [{ name: 'Empty', normalized_name: 'empty' }],
          },
        ],
      });

      // Run
      const categories = new ItemsDataGetter().getCategoriesAndSubcategoriesWithItems();

      // Check
      expect(categories.map((category) => [category.name, category.subcategories.map((s) => s.name)])).toEqual([
        ['Category A', ['Sub A1', 'Sub A2']],
        ['Category B', ['Sub B1']],
      ]);
    });
  });

  describe('getGroupedData', () => {
    it('lists once the items pulled into a group through additional categories', () => {
      // Setup
      window.baseDS = testBaseData({
        groups: [{ categories: ['Category A', 'Category B'], name: 'Group 1', normalized_name: 'g1' }],
      });
      const getter = new ItemsDataGetter();

      // Run
      getter.init(fullDataset());

      // Check
      expect(ids(getter.getGroupedData().g1)).toEqual(['item-1', 'item-2', 'item-3', 'item-4']);
    });

    it('caches the base data grouping until the full data is ready, then replaces it', () => {
      // Setup
      const getter = new ItemsDataGetter();
      getter.prepareGroups();

      // Run before the full data is ready
      const baseGrouping = getter.getGroupedData();

      // Check
      expect(getter.getGroupedData()).toBe(baseGrouping);
      expect(baseGrouping.g1[0]).toBe(window.baseDS.items![0]);

      // Run once the full data is ready
      getter.init(fullDataset());
      const fullGrouping = getter.getGroupedData();

      // Check
      expect(fullGrouping).not.toBe(baseGrouping);
      expect(fullGrouping.g1[0]).toBe(getter.getItemById('item-1'));
    });
  });

  describe('getGridData', () => {
    it('counts the items and keeps the subcategory order of the overridden categories', () => {
      // Setup
      window.baseDS = testBaseData({
        categories: [
          {
            name: 'Category A',
            normalized_name: 'category-a',
            subcategories: [
              { name: 'Sub A2', normalized_name: 'sub-a2' },
              { name: 'Sub A1', normalized_name: 'sub-a1' },
            ],
          },
          {
            name: 'Category B',
            normalized_name: 'category-b',
            subcategories: [{ name: 'Sub B1', normalized_name: 'sub-b1' }],
          },
        ],
        categories_overridden: ['Category A'],
      });
      const getter = new ItemsDataGetter();
      getter.prepareGroups();

      // Run
      const gridData = getter.getGridData(true);

      // Check
      expect(Object.keys(gridData.all['Category A'])).toEqual(['Sub A2', 'Sub A1']);
      expect(gridData.all['Category A']['Sub A2']).toMatchObject({ itemsCount: 1, itemsFeaturedCount: 1 });
      expect(gridData.all['Category B']['Sub B1']).toMatchObject({ itemsCount: 3, itemsFeaturedCount: 1 });
      expect(ids(gridData.g2['Category B']['Sub B1'].items)).toEqual(['item-3', 'item-4', 'item-2']);
      expect(gridData.g2['Category B']['Sub B1'].items[2].category).toBe('Category B');
    });
  });

  describe('classifyItems', () => {
    it('puts the untagged items under undefined when classifying by TAG', () => {
      // Run
      const classified = new ItemsDataGetter().classifyItems(ITEMS, ClassifyOption.TAG, 'all') as Record<
        string,
        Item[]
      >;

      // Check
      expect(Object.keys(classified)).toEqual(['runtime', 'undefined', 'security']);
      expect(ids(classified.undefined)).toEqual(['item-2', 'item-4']);
    });
  });

  describe('queryItems', () => {
    it('lists archived and undefined last in the menu', () => {
      // Setup
      const getter = new ItemsDataGetter();
      getter.init(fullDataset());

      // Run
      const result = getter.queryItems({}, 'all', ClassifyOption.Maturity);

      // Check
      expect(result.menu.all).toEqual({ Maturity: ['graduated', 'sandbox', 'archived', 'undefined'] });
    });

    it('reuses the classification of the groups that are not active', () => {
      // Setup
      const getter = new ItemsDataGetter();
      getter.init(fullDataset());
      const classifyItems = vi.spyOn(getter, 'classifyItems');

      // Run with two different filters on the active group
      const first = getter.queryItems({}, 'g1', ClassifyOption.Category);
      const second = getter.queryItems({ [FilterCategory.Maturity]: ['graduated'] }, 'g1', ClassifyOption.Category);

      // Check: g2 and all are classified once, g1 on every query
      expect(second.card.g2).toBe(first.card.g2);
      expect(second.menu.g2).toBe(first.menu.g2);
      expect(classifyItems.mock.calls.map(([, , group]) => group)).toEqual(['g1', 'g2', 'all', 'g1']);
    });
  });

  describe('getItemById', () => {
    it('resolves the items of the full data by id', () => {
      // Setup
      const getter = new ItemsDataGetter();
      getter.init(fullDataset());

      // Run and check
      expect(getter.getItemById('item-3')).toMatchObject({ id: 'item-3', name: 'Item 3' });
      expect(getter.getItemById('unknown')).toBeUndefined();
    });

    it('returns undefined before the full data is ready', () => {
      expect(new ItemsDataGetter().getItemById('item-1')).toBeUndefined();
    });
  });

  describe('getItemByName', () => {
    it('resolves the items of the full data by name', () => {
      // Setup
      const getter = new ItemsDataGetter();
      getter.init(fullDataset());

      // Run and check
      expect(getter.getItemByName('Item 4')).toMatchObject({ id: 'item-4', name: 'Item 4' });
      expect(getter.getItemByName('Unknown')).toBeUndefined();
    });
  });

  describe('getItemsBySubcategory', () => {
    it('lists the base items of a subcategory, including those added through additional categories', () => {
      const getter = new ItemsDataGetter();

      expect(ids(getter.getItemsBySubcategory('Category B', 'Sub B1'))).toEqual(['item-2', 'item-3', 'item-4']);
      expect(ids(getter.getItemsBySubcategory('Category A', 'Sub A2'))).toEqual(['item-2']);
      expect(getter.getItemsBySubcategory('Category A', 'Unknown')).toEqual([]);
    });

    it('indexes the items again when the base dataset changes', () => {
      // Setup
      const getter = new ItemsDataGetter();
      expect(ids(getter.getItemsBySubcategory('Category A', 'Sub A1'))).toEqual(['item-1']);

      // Run
      window.baseDS = testBaseData({ items: [createItem({ ...ITEMS[0], id: 'item-5' })] });

      // Check
      expect(ids(getter.getItemsBySubcategory('Category A', 'Sub A1'))).toEqual(['item-5']);
    });
  });

  describe('getLogoItem', () => {
    it('matches the name, category and subcategory case-insensitively', () => {
      // Setup
      window.baseDS = testBaseData({
        items: [createItem({ ...ITEMS[2], logo: 'logos/item-3.svg' })],
      });
      const getter = new ItemsDataGetter();

      // Run and check
      expect(getter.getLogoItem('ITEM 3')).toBe('logos/item-3.svg');
      expect(getter.getLogoItem('item 3', 'CATEGORY B')).toBe('logos/item-3.svg');
      expect(getter.getLogoItem('item 3', 'category b', 'SUB B1')).toBe('logos/item-3.svg');
      expect(getter.getLogoItem('item 3', 'category a')).toBeNull();
    });
  });
});

// Helpers.

/** Returns the full dataset of the test landscape. */
function fullDataset(): FullDataset {
  return { items: ITEMS };
}

/** Returns the ids of the given items. */
function ids(items: { id: string }[]): string[] {
  return items.map((item) => item.id);
}

/** Returns the base dataset of the test landscape; overrides replace the default fields. */
function testBaseData(overrides: Partial<BaseData> = {}): BaseData {
  return createBaseData({
    categories: [
      {
        name: 'Category A',
        normalized_name: 'category-a',
        subcategories: [
          { name: 'Sub A1', normalized_name: 'sub-a1' },
          { name: 'Sub A2', normalized_name: 'sub-a2' },
        ],
      },
      {
        name: 'Category B',
        normalized_name: 'category-b',
        subcategories: [{ name: 'Sub B1', normalized_name: 'sub-b1' }],
      },
    ],
    groups: [
      { categories: ['Category A'], name: 'Group 1', normalized_name: 'g1' },
      { categories: ['Category B'], name: 'Group 2', normalized_name: 'g2' },
    ],
    items: ITEMS,
    ...overrides,
  });
}

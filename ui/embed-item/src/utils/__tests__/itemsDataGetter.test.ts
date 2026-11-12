import type { FullDataset } from 'common';
import { createDeferred } from 'common/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ItemsDataGetter } from '../itemsDataGetter';

const CRUNCHBASE_URL = 'https://www.crunchbase.com/organization/org';
const EMBED_ITEM_PAGE_PATH = '/landscape/embed/embed-item.html';
const ORGANIZATION = { generated_at: '2024-01-01T00:00:00Z', name: 'Organization' };

const FULL_DATASET: FullDataset = {
  crunchbase_data: {
    [CRUNCHBASE_URL]: ORGANIZATION,
  },
  items: [
    {
      category: 'Category',
      clomonitor_report_summary: 'clomonitor/item-a.svg',
      crunchbase_url: CRUNCHBASE_URL,
      homepage_url: 'https://item-a.example',
      id: 'item-a',
      logo: 'logos/item-a.svg',
      name: 'Item A',
      subcategory: 'Subcategory',
      website: 'https://item-a.example',
    },
    {
      category: 'Category',
      homepage_url: 'https://item-b.example',
      id: 'item-b',
      logo: 'logos/item-b.svg',
      name: 'Item B',
      subcategory: 'Subcategory',
      website: 'https://item-b.example',
    },
  ],
};

describe('ItemsDataGetter', () => {
  let fetchMock: ReturnType<typeof vi.fn<(url: string) => Promise<Response>>>;
  let initialUrl: string;
  let itemsDataGetter: ItemsDataGetter;

  beforeEach(() => {
    // Serve the page from the embed directory of a landscape with a base path
    initialUrl = window.location.href;
    window.history.replaceState(null, '', EMBED_ITEM_PAGE_PATH);

    fetchMock = vi.fn<(url: string) => Promise<Response>>(() => Promise.resolve(jsonResponse(FULL_DATASET)));
    vi.stubGlobal('fetch', fetchMock);
    itemsDataGetter = new ItemsDataGetter();
  });

  afterEach(() => {
    window.history.replaceState(null, '', initialUrl);
  });

  describe('fetchItems', () => {
    it('fetches the embed dataset of a single key, resolved against the document', async () => {
      await itemsDataGetter.fetchItems('category', 'category-1');

      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
        new URL('../data/embed_full_category_category-1.json', document.baseURI).href
      );
      expect(fetchMock.mock.calls[0][0]).toBe(
        `${window.location.origin}/landscape/data/embed_full_category_category-1.json`
      );
    });

    it('fetches the full dataset when categories are provided', async () => {
      await itemsDataGetter.fetchItems('category', 'category-1', ['Category']);

      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${window.location.origin}/landscape/data/full.json`);
    });

    it('fetches the dataset from the development server in development', async () => {
      // Setup
      vi.stubEnv('MODE', 'development');

      // Run
      await itemsDataGetter.fetchItems('category', 'category-1');

      // Check
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
        'http://localhost:8000/data/embed_full_category_category-1.json'
      );
    });

    it('shares one fetch between concurrent calls', async () => {
      // Setup a request that stays pending until both calls are made
      const response = createDeferred<Response>();
      fetchMock.mockReturnValueOnce(response.promise);

      // Run two calls for the same dataset
      const firstCall = itemsDataGetter.fetchItems('category', 'category-1');
      const secondCall = itemsDataGetter.fetchItems('category', 'category-1');
      response.resolve(jsonResponse(FULL_DATASET));
      await Promise.all([firstCall, secondCall]);

      // Check only one request was made
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not fetch a dataset that is already cached', async () => {
      await itemsDataGetter.fetchItems('category', 'category-1');
      await itemsDataGetter.fetchItems('category', 'category-1');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('rejects when the response is not ok, and fetches again on retry', async () => {
      // Run a call whose response is an error
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
      await expect(itemsDataGetter.fetchItems('category', 'category-1')).rejects.toThrow(
        'Unable to load item data: 500'
      );
      expect(itemsDataGetter.getItemById('category', 'category-1', 'item-a')).toBeUndefined();

      // Retry and check the dataset is fetched again
      await itemsDataGetter.fetchItems('category', 'category-1');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(itemsDataGetter.getItemById('category', 'category-1', 'item-a')).toBeDefined();
    });
  });

  describe('getItemById', () => {
    it('returns the items joined with their Crunchbase data', async () => {
      await itemsDataGetter.fetchItems('category', 'category-1');

      const item = itemsDataGetter.getItemById('category', 'category-1', 'item-a');
      expect(item?.crunchbase_data).toEqual(ORGANIZATION);
    });

    it('prefixes the logo and report summary paths with ../ and keeps an absent report undefined', async () => {
      await itemsDataGetter.fetchItems('category', 'category-1');

      const itemA = itemsDataGetter.getItemById('category', 'category-1', 'item-a');
      expect(itemA?.logo).toBe('../logos/item-a.svg');
      expect(itemA?.clomonitor_report_summary).toBe('../clomonitor/item-a.svg');
      const itemB = itemsDataGetter.getItemById('category', 'category-1', 'item-b');
      expect(itemB?.logo).toBe('../logos/item-b.svg');
      expect(itemB?.clomonitor_report_summary).toBeUndefined();
    });

    it('prefixes the logo and report summary paths with the development server origin in development', async () => {
      // Setup
      vi.stubEnv('MODE', 'development');

      // Run
      await itemsDataGetter.fetchItems('category', 'category-1');

      // Check
      const item = itemsDataGetter.getItemById('category', 'category-1', 'item-a');
      expect(item?.logo).toBe('http://localhost:8000/logos/item-a.svg');
      expect(item?.clomonitor_report_summary).toBe('http://localhost:8000/clomonitor/item-a.svg');
    });

    it('returns undefined for an unknown key or id', async () => {
      await itemsDataGetter.fetchItems('category', 'category-1');

      expect(itemsDataGetter.getItemById('category', 'unknown', 'item-a')).toBeUndefined();
      expect(itemsDataGetter.getItemById('category', 'category-1', 'unknown')).toBeUndefined();
    });
  });

  describe('getItemByName', () => {
    it('returns the item with the given name from the loaded dataset', async () => {
      await itemsDataGetter.fetchItems('category', 'category-1');

      expect(itemsDataGetter.getItemByName('category', 'category-1', 'Item B')?.id).toBe('item-b');
    });

    it('returns undefined for an unknown key or name', async () => {
      await itemsDataGetter.fetchItems('category', 'category-1');

      expect(itemsDataGetter.getItemByName('category', 'unknown', 'Item B')).toBeUndefined();
      expect(itemsDataGetter.getItemByName('category', 'category-1', 'Unknown')).toBeUndefined();
    });
  });
});

// Helpers.

/** Creates a successful JSON response with the given body. */
const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status: 200 });

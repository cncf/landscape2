import { joinFullDataset } from 'common';
import { createItem, fullFixture } from 'common/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('search', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('indexes the resolved description', async () => {
    // Index the Rust-produced items in a fresh search engine: Item 3 and Member 1
    // resolve their description from Crunchbase, while Item 2 resolves it from its
    // repository, so its Crunchbase description is not indexed
    const { default: searchEngine } = await import('../search');
    searchEngine.init(joinFullDataset(fullFixture));

    // Verify the search matches the resolved descriptions only
    const results = await vi.waitFor(() => searchEngine.searchTerm('organization'));
    expect(results.map((result) => result.id).sort()).toEqual([
      'category-2--subcategory-2-1--item-3',
      'members--gold--member-1',
    ]);
  });

  it('returns at most 30 results', async () => {
    // Setup
    const { default: searchEngine } = await import('../search');
    searchEngine.init(
      Array.from({ length: 31 }, (_, index) => createItem({ id: `item-${index}`, name: `Match ${index}` }))
    );

    // Run
    const results = await vi.waitFor(() => searchEngine.searchTerm('match'));

    // Check
    expect(results).toHaveLength(30);
  });

  it('ranks name matches above other field matches', async () => {
    // Setup: without the name boost, the shorter description field would rank its match first
    const { default: searchEngine } = await import('../search');
    searchEngine.init([
      createItem({ description: 'Proxy', id: 'description-match', name: 'Envoy' }),
      createItem({
        description: 'Service mesh for the services in the cluster',
        id: 'name-match',
        name: 'Proxy server',
      }),
    ]);

    // Run
    const results = await vi.waitFor(() => searchEngine.searchTerm('proxy'));

    // Check
    expect(results.map((result) => result.id)).toEqual(['name-match', 'description-match']);
  });

  it('ranks archived items below the other matches', async () => {
    // Setup
    const { default: searchEngine } = await import('../search');
    searchEngine.init([
      createItem({ id: 'archived', maturity: 'archived', name: 'Proxy A' }),
      createItem({ id: 'sandbox', maturity: 'sandbox', name: 'Proxy B' }),
    ]);

    // Run
    const results = await vi.waitFor(() => searchEngine.searchTerm('proxy'));

    // Check
    expect(results.map((result) => result.id)).toEqual(['sandbox', 'archived']);
  });

  it('rejects with an Error while the index is not ready', async () => {
    // Setup
    const { default: searchEngine } = await import('../search');

    // Run
    const error = await searchEngine.searchTerm('proxy').catch((err: unknown) => err);

    // Check
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Preparing search index...');
  });
});

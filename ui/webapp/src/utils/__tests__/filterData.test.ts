import { createGithubRepository, createItem, createRepository } from 'common/test-utils';
import { describe, expect, it } from 'vitest';

import { type ActiveFilters, FilterCategory, type Item } from '../../types';
// Imported before any module that loads `data`, so a `data` import cycle fails here at load time
import filterData from '../filterData';
import getFoundationNameLabel from '../getFoundationNameLabel';

/** Generation date of the Crunchbase fixtures. */
const GENERATED_AT = '2024-06-01T00:00:00Z';

describe('filterData', () => {
  it('loads before data and keeps items when no filters are active', () => {
    const items = [createItem({ id: 'first-item' }), createItem({ id: 'second-item' })];

    expect(filterData(items, {})).toEqual(items);
  });

  it('returns the same array when the filters are empty', () => {
    const items = [createItem({ id: 'first-item' })];

    expect(filterData(items, {})).toBe(items);
  });

  it('matches categories through the additional categories', () => {
    const items = [
      createItem({ category: 'Runtime', id: 'primary' }),
      createItem({
        additional_categories: [{ category: 'Runtime', subcategory: 'Container Runtime' }],
        category: 'Orchestration',
        id: 'additional',
      }),
      createItem({ category: 'Orchestration', id: 'other' }),
    ];

    expect(ids(filterData(items, { [FilterCategory.Category]: ['Runtime'] }))).toEqual(['primary', 'additional']);
  });

  it.each([
    ['non-oss alone keeps only the items that are not open source', ['non-oss'], ['closed']],
    ['a license keeps only the open source items with it', ['MIT'], ['mit']],
    ['non-oss and a license keep both kinds of items', ['non-oss', 'MIT'], ['closed', 'mit']],
  ])('applies the License filter: %s', (_, licenses, expected) => {
    const items = [
      createItem({ id: 'closed' }),
      createItem({ id: 'mit', oss: true, repositories: [createRepository({ license: 'MIT' })] }),
      createItem({ id: 'apache', oss: true, repositories: [createRepository({ license: 'Apache-2.0' })] }),
      createItem({ id: 'no-repositories', oss: true }),
    ];

    expect(ids(filterData(items, { [FilterCategory.License]: licenses }))).toEqual(expected);
  });

  it('takes the repository license over the GitHub license', () => {
    const items = [
      createItem({
        id: 'overridden',
        oss: true,
        repositories: [
          createRepository({ github_data: createGithubRepository({ license: 'MIT' }), license: 'Apache-2.0' }),
        ],
      }),
      createItem({
        id: 'github',
        oss: true,
        repositories: [createRepository({ github_data: createGithubRepository({ license: 'MIT' }) })],
      }),
    ];

    expect(ids(filterData(items, { [FilterCategory.License]: ['MIT'] }))).toEqual(['github']);
    expect(ids(filterData(items, { [FilterCategory.License]: ['Apache-2.0'] }))).toEqual(['overridden']);
  });

  it('keeps the items without maturity, and the levels selected, for the non-foundation value', async () => {
    const { FOUNDATION } = await import('../../data');
    const nonFoundation = `non-${getFoundationNameLabel(FOUNDATION)}`;
    const items = [
      createItem({ id: 'graduated', maturity: 'graduated' }),
      createItem({ id: 'sandbox', maturity: 'sandbox' }),
      createItem({ id: 'no-maturity' }),
    ];

    expect(ids(filterData(items, { [FilterCategory.Maturity]: [nonFoundation] }))).toEqual(['no-maturity']);
    expect(ids(filterData(items, { [FilterCategory.Maturity]: [nonFoundation, 'graduated'] }))).toEqual([
      'graduated',
      'no-maturity',
    ]);
    expect(ids(filterData(items, { [FilterCategory.Maturity]: ['graduated'] }))).toEqual(['graduated']);
  });

  it('keeps the items sharing a TAG with the filter', () => {
    const items = [
      createItem({ id: 'runtime', tag: ['runtime'] }),
      createItem({ id: 'both', tag: ['runtime', 'security'] }),
      createItem({ id: 'security', tag: ['security'] }),
      createItem({ id: 'no-tag' }),
    ];

    expect(ids(filterData(items, { [FilterCategory.TAG]: ['runtime', 'observability'] }))).toEqual(['runtime', 'both']);
  });

  it('excludes the items without Crunchbase categories from the Industry filter', () => {
    const items = [
      createItem({ crunchbase_data: { categories: ['Cloud'], generated_at: GENERATED_AT }, id: 'cloud' }),
      createItem({ crunchbase_data: { categories: ['Security'], generated_at: GENERATED_AT }, id: 'security' }),
      createItem({ crunchbase_data: { generated_at: GENERATED_AT }, id: 'no-categories' }),
      createItem({ id: 'no-crunchbase' }),
    ];

    expect(ids(filterData(items, { [FilterCategory.Industry]: ['Cloud'] }))).toEqual(['cloud']);
  });

  it('combines different filter categories with AND', () => {
    const items = [
      createItem({ category: 'Runtime', id: 'both', tag: ['runtime'] }),
      createItem({ category: 'Runtime', id: 'category-only', tag: ['security'] }),
      createItem({ category: 'Orchestration', id: 'tag-only', tag: ['runtime'] }),
    ];
    const activeFilters: ActiveFilters = {
      [FilterCategory.Category]: ['Runtime'],
      [FilterCategory.TAG]: ['runtime'],
    };

    expect(ids(filterData(items, activeFilters))).toEqual(['both']);
  });
});

// Helpers.

/** Returns the ids of the items, in order. */
const ids = (items: Item[]): string[] => items.map((item) => item.id);

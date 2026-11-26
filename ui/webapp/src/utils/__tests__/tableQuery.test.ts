import { describe, expect, it } from 'vitest';

import { FilterCategory } from '../../types';
import { buildTableQuery, parseTableQuery, TableQueryConfig, TableSort } from '../tableQuery';

/** Default sort of the test tables. */
const DEFAULT_SORT: TableSort = { by: 'date', direction: 'desc' };

/** Configuration of a table without kinds. */
const CONFIG: TableQueryConfig = {
  defaultSort: DEFAULT_SORT,
  filterCategories: [FilterCategory.Organization, FilterCategory.Membership],
  sortOptions: [DEFAULT_SORT, { by: 'date', direction: 'asc' }, { by: 'amount', direction: 'desc' }],
};

/** Configuration of a table with kinds, each with its own sort options. */
const KINDS_CONFIG: TableQueryConfig<'a' | 'b'> = {
  defaultKind: 'a',
  defaultSort: DEFAULT_SORT,
  filterCategories: [FilterCategory.Organization],
  kinds: ['a', 'b'],
  sortOptions: {
    a: [DEFAULT_SORT, { by: 'amount', direction: 'desc' }],
    b: [DEFAULT_SORT, { by: 'price', direction: 'desc' }],
  },
};

describe('parseTableQuery', () => {
  it('gives the defaults for an empty query', () => {
    expect(parseTableQuery('', CONFIG)).toEqual({ filters: {}, page: 1, sort: DEFAULT_SORT });
    expect(parseTableQuery('', KINDS_CONFIG)).toEqual({ filters: {}, kind: 'a', page: 1, sort: DEFAULT_SORT });
  });

  it('reads valid kind, page, sort and filter values', () => {
    expect(parseTableQuery('?kind=b&page=4&sort-by=price&sort-direction=desc&organization=Org', KINDS_CONFIG)).toEqual({
      filters: { [FilterCategory.Organization]: ['Org'] },
      kind: 'b',
      page: 4,
      sort: { by: 'price', direction: 'desc' },
    });
  });

  it.each([
    ['an unknown kind', '?kind=foo'],
    ['a repeated kind', '?kind=a&kind=b'],
  ])('gives the default kind for %s', (_, search) => {
    expect(parseTableQuery(search, KINDS_CONFIG).kind).toBe('a');
  });

  it.each([
    ['NaN', '?page=abc'],
    ['0', '?page=0'],
    ['a negative number', '?page=-2'],
    ['a decimal number', '?page=1.5'],
    ['an empty value', '?page='],
    ['a repeated value', '?page=2&page=3'],
  ])('gives page 1 for %s', (_, search) => {
    expect(parseTableQuery(search, CONFIG).page).toBe(1);
  });

  it.each([
    ['an unknown field', '?sort-by=foo&sort-direction=asc'],
    ['an unknown direction', '?sort-by=date&sort-direction=up'],
    ['a direction that the field does not offer', '?sort-by=amount&sort-direction=asc'],
    ['a missing direction', '?sort-by=amount'],
  ])('gives the default sort for %s', (_, search) => {
    expect(parseTableQuery(search, CONFIG).sort).toEqual(DEFAULT_SORT);
  });

  it("validates the sort against the parsed kind's options", () => {
    expect(parseTableQuery('?kind=a&sort-by=price&sort-direction=desc', KINDS_CONFIG).sort).toEqual(DEFAULT_SORT);
    expect(parseTableQuery('?kind=b&sort-by=price&sort-direction=desc', KINDS_CONFIG).sort).toEqual({
      by: 'price',
      direction: 'desc',
    });
  });

  it('accumulates repeated filter keys and ignores empty values, duplicates and other keys', () => {
    const search = '?organization=A&membership=Gold&organization=B&organization=A&organization=&project=x&item=i';

    expect(parseTableQuery(search, CONFIG).filters).toEqual({
      [FilterCategory.Membership]: ['Gold'],
      [FilterCategory.Organization]: ['A', 'B'],
    });
  });
});

describe('buildTableQuery', () => {
  it('writes the kind, page, sort and filters', () => {
    expect(
      buildTableQuery({
        filters: { [FilterCategory.Organization]: ['A', 'B'] },
        kind: 'b',
        page: 2,
        search: '',
        sort: { by: 'price', direction: 'asc' },
      })
    ).toBe('?kind=b&page=2&sort-by=price&sort-direction=asc&organization=A&organization=B');
  });

  it('omits the kind and the page when they are not given', () => {
    expect(buildTableQuery({ filters: {}, search: '', sort: DEFAULT_SORT })).toBe('?sort-by=date&sort-direction=desc');
  });

  it('replaces the table params and keeps the other params of the search', () => {
    const search = '?item=x&page=3&organization=A&sort-by=amount&sort-direction=desc&overlay-data=y';

    expect(buildTableQuery({ filters: {}, page: 1, search, sort: DEFAULT_SORT })).toBe(
      '?item=x&overlay-data=y&page=1&sort-by=date&sort-direction=desc'
    );
  });

  it('round-trips through parseTableQuery', () => {
    const query = {
      filters: { [FilterCategory.Organization]: ['A, Inc.', 'B & Co'] },
      kind: 'b' as const,
      page: 7,
      sort: { by: 'price', direction: 'desc' } as TableSort,
    };

    expect(parseTableQuery(buildTableQuery({ ...query, search: '' }), KINDS_CONFIG)).toEqual(query);
  });
});

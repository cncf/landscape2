import { describe, expect, it } from 'vitest';

import { ActiveFilters, ClassifyOption, FilterCategory, SortDirection, SortOption, ViewMode } from '../../types';
import { buildExploreSearch, buildFiltersQuery, ExploreQueryContext, parseExploreQuery } from '../exploreQuery';

const FOUNDATION_LABEL = 'tf';
const LICENSES = ['Apache-2.0', 'MIT'];
const MATURITY_OPTIONS = ['graduated', 'incubating', 'sandbox'];

const CTX: ExploreQueryContext = {
  classifyOptions: Object.values(ClassifyOption),
  foundationLabel: FOUNDATION_LABEL,
  licenseOptions: LICENSES,
  maturityOptions: MATURITY_OPTIONS,
  sortOptions: Object.values(SortOption),
};

describe('parseExploreQuery', () => {
  it.each<[string, ActiveFilters, string, ExploreQueryContext]>([
    [
      'both Extra filters',
      { [FilterCategory.Extra]: ['specification', 'enduser'] },
      'specification=true&enduser=true',
      CTX,
    ],
    ['a repeated tag', { [FilterCategory.TAG]: ['app-delivery', 'runtime'] }, 'tag=app-delivery&tag=runtime', CTX],
    [
      'the foundation label for all maturity options',
      { [FilterCategory.Maturity]: MATURITY_OPTIONS },
      'project=tf',
      CTX,
    ],
    [
      'the foundation label plus the non-foundation value',
      { [FilterCategory.Maturity]: [...MATURITY_OPTIONS, 'non-tf'] },
      'project=tf&project=non-tf',
      CTX,
    ],
    ['oss for all licenses', { [FilterCategory.License]: LICENSES }, 'license=oss', CTX],
    [
      'oss for all licenses plus the non-oss value',
      { [FilterCategory.License]: [...LICENSES, 'non-oss'] },
      'license=oss&license=non-oss',
      CTX,
    ],
    [
      'oss kept as is with an empty license list',
      { [FilterCategory.License]: ['oss'] },
      'license=oss',
      { ...CTX, licenseOptions: [] },
    ],
    [
      'a license value not collapsed with an empty license list',
      { [FilterCategory.License]: ['non-oss'] },
      'license=non-oss',
      { ...CTX, licenseOptions: [] },
    ],
  ])('round-trips %s', (_, filters, query, ctx) => {
    // Build the query of the filters
    const params = buildFiltersQuery(filters, ctx);
    expect(params.toString()).toBe(query);

    // Parse it back and verify the same filters come out
    expect(parseExploreQuery(params.toString(), ctx).filters).toEqual(filters);
  });

  it('ignores unknown keys', () => {
    const { filters } = parseExploreQuery('?foo=bar&group=g1&item=x&overlay-data=u&tag=runtime&extra=enduser', CTX);

    expect(filters).toEqual({ [FilterCategory.TAG]: ['runtime'] });
  });

  it('ignores Extra keys whose value is not true', () => {
    const { filters } = parseExploreQuery('?specification=false&enduser=1', CTX);

    expect(filters).toEqual({});
  });

  it('accumulates repeated keys without duplicates', () => {
    const { filters } = parseExploreQuery('?project=graduated&project=tf&project=graduated', CTX);

    expect(filters).toEqual({ [FilterCategory.Maturity]: MATURITY_OPTIONS });
  });

  it('gives the classify and sort values of the query when they are available', () => {
    const query = parseExploreQuery('?classify=maturity&sort-by=stars&sort-direction=desc', CTX);

    expect(query).toEqual({
      classify: ClassifyOption.Maturity,
      filters: {},
      sortBy: SortOption.Stars,
      sortDirection: SortDirection.Desc,
    });
  });

  it.each([
    ['unknown values', '?classify=foo&sort-by=foo&sort-direction=foo', CTX],
    [
      'repeated values',
      '?classify=tag&classify=none&sort-by=stars&sort-by=name&sort-direction=desc&sort-direction=asc',
      CTX,
    ],
    [
      'values not available in the group',
      '?classify=tag&sort-by=stars',
      { ...CTX, classifyOptions: [ClassifyOption.None, ClassifyOption.Category], sortOptions: [SortOption.Name] },
    ],
  ])('gives the default classify and sort values for %s', (_, search, ctx) => {
    const query = parseExploreQuery(search, ctx);

    expect(query.classify).toBe(ClassifyOption.Category);
    expect(query.sortBy).toBe(SortOption.Name);
    expect(query.sortDirection).toBe(SortDirection.Asc);
  });
});

describe('buildFiltersQuery', () => {
  it('writes Extra values as keys set to true', () => {
    const params = buildFiltersQuery({ [FilterCategory.Extra]: ['enduser'], [FilterCategory.TAG]: ['runtime'] }, CTX);

    expect(params.toString()).toBe('enduser=true&tag=runtime');
  });

  it('writes every maturity value when not all maturity options are selected', () => {
    const params = buildFiltersQuery({ [FilterCategory.Maturity]: ['graduated', 'non-tf'] }, CTX);

    expect(params.toString()).toBe('project=graduated&project=non-tf');
  });
});

describe('buildExploreSearch', () => {
  it('replaces the Explore params and keeps the other ones', () => {
    // Build the search of a Card view state over a URL with filters, an item and overlay params
    const search = buildExploreSearch(
      {
        classify: ClassifyOption.Maturity,
        filters: { [FilterCategory.Extra]: ['specification'], [FilterCategory.Maturity]: MATURITY_OPTIONS },
        group: 'g2',
        search: '?overlay-data=u&group=g1&view-mode=grid&tag=runtime&enduser=true&item=x',
        sortBy: SortOption.Stars,
        sortDirection: SortDirection.Desc,
        viewMode: ViewMode.Card,
      },
      CTX
    );

    // Verify the old filters are gone, the other params stay and the state is written
    expect(search).toBe(
      '?overlay-data=u&group=g2&view-mode=card&item=x&classify=maturity&sort-by=stars&sort-direction=desc' +
        '&specification=true&project=tf'
    );
  });

  it('writes no group param when the landscape has no groups', () => {
    const search = buildExploreSearch(
      { filters: { [FilterCategory.TAG]: ['runtime'] }, search: '?tag=app', viewMode: ViewMode.Grid },
      CTX
    );

    expect(search).toBe('?view-mode=grid&tag=runtime');
  });

  it('removes the classify and sort params when they are not set', () => {
    const search = buildExploreSearch(
      {
        filters: {},
        group: 'g1',
        search: '?group=g1&view-mode=card&classify=tag&sort-by=stars&sort-direction=desc',
        viewMode: ViewMode.Grid,
      },
      CTX
    );

    expect(search).toBe('?group=g1&view-mode=grid');
  });
});

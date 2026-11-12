import { createGithubRepository, createItem } from 'common/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ALL_OPTION } from '../../data';
import { createBaseData } from '../../test-utils/fixtures';
import { FilterCategory, type FilterSection, type Item } from '../../types';
import itemsDataGetter from '../itemsDataGetter';
import getFiltersPerGroup, { prepareFilters } from '../prepareFilters';

/** Time the test Crunchbase data was collected at. */
const GENERATED_AT = '2024-06-01T00:00:00Z';

/** Url of the test repositories. */
const REPOSITORY_URL = 'https://github.com/example/repo';

describe('getFiltersPerGroup', () => {
  it('prepares the filters of every group', () => {
    // Setup the grouped items of two groups
    vi.spyOn(itemsDataGetter, 'getGroupedData').mockReturnValue({
      [ALL_OPTION]: [createItem({ maturity: 'graduated' }), createItem({ tag: ['runtime'] })],
      group: [createItem({ maturity: 'graduated' })],
    });

    // Run the preparation
    const filtersPerGroup = getFiltersPerGroup();

    // Check each group gets its own filters
    expect(sectionValues(filtersPerGroup[ALL_OPTION].filters)).toEqual([FilterCategory.Maturity, FilterCategory.TAG]);
    expect(sectionValues(filtersPerGroup.group.filters)).toEqual([FilterCategory.Maturity]);
  });
});

describe('prepareFilters', () => {
  beforeEach(() => {
    window.baseDS = createBaseData({
      groups: [{ categories: ['Category 1', 'Category 2'], name: 'Group', normalized_name: 'group' }],
    });
  });

  it('adds the Extra section for items without Crunchbase data', () => {
    const items = [createItem({ enduser: true }), createItem({ specification: true })];

    const { filters } = prepareFilters(items, ALL_OPTION);

    expect(section(filters, FilterCategory.Extra)?.options).toEqual([
      { name: 'End user', value: 'enduser' },
      { name: 'Specification', value: 'specification' },
    ]);
  });

  it('adds the Organization type section for organizations without industries', () => {
    const items = [createItem({ crunchbase_data: { company_type: 'for_profit', generated_at: GENERATED_AT } })];

    const { filters } = prepareFilters(items, ALL_OPTION);

    expect(section(filters, FilterCategory.Industry)).toBeUndefined();
    expect(section(filters, FilterCategory.OrgType)?.options).toEqual([{ name: 'for_profit', value: 'for_profit' }]);
  });

  it('adds no Category section for a single category', () => {
    const items = [createItem({ category: 'Category 1' }), createItem({ category: 'Category 1' })];

    const { filters } = prepareFilters(items, 'group');

    expect(section(filters, FilterCategory.Category)).toBeUndefined();
  });

  it('excludes the additional categories outside the group', () => {
    // Setup items with additional categories in and outside the group
    const items = [
      createItem({
        additional_categories: [
          { category: 'Category 2', subcategory: 'Sub 2' },
          { category: 'Outside', subcategory: 'Sub 3' },
        ],
        category: 'Category 1',
      }),
    ];

    // Run the preparation for the group
    const { filters } = prepareFilters(items, 'group');

    // Check only the group categories are listed
    expect(section(filters, FilterCategory.Category)?.options).toEqual([
      { name: 'Category 1', value: 'Category 1' },
      { name: 'Category 2', value: 'Category 2' },
    ]);
  });

  it('deduplicates and sorts the options', () => {
    // Setup items repeating their values out of order
    const items = [
      createItem({
        crunchbase_data: {
          categories: ['Software', 'Cloud'],
          country: 'Spain',
          generated_at: GENERATED_AT,
          name: 'Org B',
        },
        maturity: 'sandbox',
        repositories: [{ license: 'MIT', url: REPOSITORY_URL }],
      }),
      createItem({
        crunchbase_data: { categories: ['Cloud'], country: 'Canada', generated_at: GENERATED_AT, name: 'Org A' },
        maturity: 'graduated',
        repositories: [{ license: 'Apache-2.0', url: REPOSITORY_URL }],
      }),
      createItem({
        crunchbase_data: { categories: ['Software'], country: 'Spain', generated_at: GENERATED_AT, name: 'Org B' },
        maturity: 'sandbox',
        repositories: [{ license: 'MIT', url: REPOSITORY_URL }],
      }),
    ];

    // Run the preparation
    const { filters } = prepareFilters(items, ALL_OPTION);

    // Check every section lists unique values in order
    expect(optionValues(filters, FilterCategory.Maturity)).toEqual(['graduated', 'sandbox']);
    expect(optionValues(filters, FilterCategory.Organization)).toEqual(['Org A', 'Org B']);
    expect(optionValues(filters, FilterCategory.License)).toEqual(['Apache-2.0', 'MIT']);
    expect(optionValues(filters, FilterCategory.Country)).toEqual(['Canada', 'Spain']);
    expect(optionValues(filters, FilterCategory.Industry)).toEqual(['Cloud', 'Software']);
    expect(section(filters, FilterCategory.Maturity)?.options[0].name).toBe('Graduated');
  });

  it('reads the license of the GitHub data when the repository sets none', () => {
    const items = [
      createItem({
        repositories: [
          {
            github_data: createGithubRepository({ license: 'BSD-3-Clause' }),
            url: REPOSITORY_URL,
          },
        ],
      }),
    ];

    expect(optionValues(prepareFilters(items, ALL_OPTION).filters, FilterCategory.License)).toEqual(['BSD-3-Clause']);
  });

  it.each([
    {
      expected: { itemsWithoutLicense: false, itemsWithoutMaturity: false },
      items: [{ maturity: 'sandbox', oss: true }],
    },
    { expected: { itemsWithoutLicense: true, itemsWithoutMaturity: false }, items: [{ maturity: 'sandbox' }] },
    { expected: { itemsWithoutLicense: false, itemsWithoutMaturity: true }, items: [{ oss: true }] },
    {
      expected: { itemsWithoutLicense: true, itemsWithoutMaturity: true },
      items: [{ maturity: 'sandbox', oss: true }, {}],
    },
  ])('sets the options flags to $expected', ({ expected, items }) => {
    const { options } = prepareFilters(
      items.map((overrides: Partial<Item>) => createItem(overrides)),
      ALL_OPTION
    );

    expect(options).toEqual(expected);
  });

  it('formats the TAG names', () => {
    const items = [createItem({ tag: ['app-delivery', 'runtime'] }), createItem({ tag: ['runtime'] })];

    const { filters } = prepareFilters(items, ALL_OPTION);

    expect(section(filters, FilterCategory.TAG)?.options).toEqual([
      { name: 'App Delivery', value: 'app-delivery' },
      { name: 'Runtime', value: 'runtime' },
    ]);
  });
});

// Helpers.

/** Returns the option values of a section, `undefined` when the section is missing. */
function optionValues(filters: FilterSection[], category: FilterCategory): string[] | undefined {
  return section(filters, category)?.options.map((option) => option.value);
}

/** Returns the section of a category. */
function section(filters: FilterSection[], category: FilterCategory): FilterSection | undefined {
  return filters.find((filter) => filter.value === category);
}

/** Returns the categories of the sections, in order. */
function sectionValues(filters: FilterSection[]): FilterCategory[] {
  return filters.map((filter) => filter.value);
}

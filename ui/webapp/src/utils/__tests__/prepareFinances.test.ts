import { createItem } from 'common/test-utils';
import { describe, expect, it } from 'vitest';

import { FilterCategory, FinancesKind, type FullDataset } from '../../types';
import prepareFinances from '../prepareFinances';

/** Time the test Crunchbase data was collected at. */
const GENERATED_AT = '2024-06-01T00:00:00Z';

/** Crunchbase url of the member organization. */
const MEMBER_URL = 'https://www.crunchbase.com/organization/member';

/** Crunchbase url of the organization that isn't a member. */
const OTHER_URL = 'https://www.crunchbase.com/organization/other';

/** Crunchbase data of two organizations, listed in reverse alphabetical order, with unsorted dates. */
const CRUNCHBASE_DATA: NonNullable<FullDataset['crunchbase_data']> = {
  [OTHER_URL]: {
    acquisitions: [{ acquiree_name: 'Acquiree B', announced_on: '2022-03-01', price: 100 }],
    funding_rounds: [
      { amount: 20, announced_on: '2023-07-01', kind: 'series_b' },
      { amount: 10, announced_on: '2019-02-01', kind: 'seed' },
    ],
    generated_at: GENERATED_AT,
    name: 'Zeta Corp',
  },
  [MEMBER_URL]: {
    acquisitions: [{ acquiree_name: 'Acquiree A', announced_on: '2021-08-15' }],
    funding_rounds: [{ amount: 30, announced_on: '2020-05-10', kind: 'angel' }],
    generated_at: GENERATED_AT,
    name: 'Alpha Inc',
  },
};

/** Items of the landscape: two of the member organization (the first one wins) and none of the other. */
const ITEMS = [
  createItem({ crunchbase_url: MEMBER_URL, id: 'member-1', member_subcategory: 'Gold' }),
  createItem({ crunchbase_url: MEMBER_URL, id: 'member-2', member_subcategory: 'Silver' }),
  createItem({ id: 'project' }),
];

describe('prepareFinances', () => {
  it('looks up the membership of each organization through its Crunchbase url', () => {
    const finances = prepareFinances(CRUNCHBASE_DATA, ITEMS);

    expect(finances.funding.map((round) => [round.organization_name, round.membership, round.crunchbase_url])).toEqual([
      ['Zeta Corp', undefined, OTHER_URL],
      ['Zeta Corp', undefined, OTHER_URL],
      ['Alpha Inc', 'Gold', MEMBER_URL],
    ]);
    expect(finances.acquisitions.map((acquisition) => acquisition.membership)).toEqual([undefined, 'Gold']);
  });

  it('builds sorted filter options for each kind', () => {
    const finances = prepareFinances(CRUNCHBASE_DATA, ITEMS);

    expect(finances.filters[FinancesKind.Funding]).toEqual([
      {
        options: [
          { name: 'Alpha Inc', value: 'Alpha Inc' },
          { name: 'Zeta Corp', value: 'Zeta Corp' },
        ],
        title: 'Organization',
        value: FilterCategory.Organization,
      },
      { options: [{ name: 'Gold', value: 'Gold' }], title: 'Membership', value: FilterCategory.Membership },
      {
        options: [
          { name: 'Angel', value: 'angel' },
          { name: 'Seed', value: 'seed' },
          { name: 'Series B', value: 'series_b' },
        ],
        title: 'Investment type',
        value: FilterCategory.InvestmentType,
      },
    ]);
    expect(finances.filters[FinancesKind.Acquisitions]).toEqual([
      {
        options: [
          { name: 'Alpha Inc', value: 'Alpha Inc' },
          { name: 'Zeta Corp', value: 'Zeta Corp' },
        ],
        title: 'Organization',
        value: FilterCategory.Organization,
      },
      { options: [{ name: 'Gold', value: 'Gold' }], title: 'Membership', value: FilterCategory.Membership },
    ]);
  });

  it('sets the earliest date of each kind as its first date', () => {
    expect(prepareFinances(CRUNCHBASE_DATA, ITEMS).firstDate).toEqual({
      [FinancesKind.Acquisitions]: '2021-08-15',
      [FinancesKind.Funding]: '2019-02-01',
    });
  });

  it('keeps the rows of organizations without a name out of the organization filter', () => {
    // Setup an organization without a name next to a named one
    const crunchbaseData: NonNullable<FullDataset['crunchbase_data']> = {
      [MEMBER_URL]: { funding_rounds: [{ announced_on: '2020-01-01' }], generated_at: GENERATED_AT },
      [OTHER_URL]: { funding_rounds: [{ announced_on: '2021-01-01' }], generated_at: GENERATED_AT, name: 'Zeta Corp' },
    };

    // Run
    const finances = prepareFinances(crunchbaseData, ITEMS);

    // Check both rows are kept, and only the named organization is a filter option
    expect(finances.funding.map((round) => round.crunchbase_url)).toEqual([MEMBER_URL, OTHER_URL]);
    expect(finances.filters[FinancesKind.Funding][0]).toEqual({
      options: [{ name: 'Zeta Corp', value: 'Zeta Corp' }],
      title: 'Organization',
      value: FilterCategory.Organization,
    });
  });
});

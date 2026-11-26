import { describe, expect, it } from 'vitest';

import { fullFixture } from '../../test-utils';
import type { FullDataset } from '../../types/generated';
import { joinFullDataset } from '../joinFullDataset';

describe('joinFullDataset', () => {
  it('joins the organizations by crunchbase url and the repositories by url', () => {
    const items = joinFullDataset(fullFixture);

    // Check the item organization data
    const item = items.find((candidate) => candidate.name === 'Item 2')!;
    expect(item.crunchbase_data).toBe(fullFixture.crunchbase_data!['https://www.crunchbase.com/organization/item-2']);

    // Check the item repositories data
    expect(item.repositories).toEqual([
      {
        github_data: fullFixture.github_data!['https://github.com/example/item-2'],
        primary: true,
        url: 'https://github.com/example/item-2',
      },
    ]);
  });

  it('leaves the entries missing from the dataset undefined', () => {
    const full: FullDataset = {
      crunchbase_data: {},
      github_data: {},
      items: [
        {
          category: 'Category',
          crunchbase_url: 'https://www.crunchbase.com/organization/missing',
          homepage_url: 'https://item.example',
          id: 'category--subcategory--item',
          logo: 'item.svg',
          name: 'Item',
          repositories: [{ primary: true, url: 'https://github.com/example/missing' }],
          subcategory: 'Subcategory',
          website: 'https://item.example',
        },
      ],
    };

    const [item] = joinFullDataset(full);

    expect(item.crunchbase_data).toBeUndefined();
    expect(item.repositories).toEqual([{ primary: true, url: 'https://github.com/example/missing' }]);
    expect(item.repositories![0].github_data).toBeUndefined();
  });

  it('does not mutate the input items', () => {
    const full = structuredClone(fullFixture);

    const items = joinFullDataset(full);

    // Check the input is unchanged and shares no item or repository with the output
    expect(full).toEqual(fullFixture);
    expect(items.every((item, index) => item !== full.items![index])).toBe(true);
    expect(items.flatMap((item) => item.repositories ?? [])).not.toContain(full.items![0].repositories![0]);
  });

  it('returns no items when the dataset has none', () => {
    expect(joinFullDataset({})).toEqual([]);
  });
});

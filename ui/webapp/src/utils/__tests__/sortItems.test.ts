import { createGithubRepository, createItem, createRepository } from 'common/test-utils';
import { describe, expect, it } from 'vitest';

import { type GithubRepository, type Item, type Repository, SortDirection, SortOption } from '../../types';
import sortItems from '../sortItems';

/** Url of the commits of the test repositories. */
const COMMIT_URL = 'https://github.com/example/repo/commit/1';

/** Url of the contributors of the test repositories. */
const CONTRIBUTORS_URL = 'https://github.com/example/repo/graphs/contributors';

/** Time the test data was collected at. */
const GENERATED_AT = '2024-06-01T00:00:00Z';

/** Sort case: items listed in ascending order, with the ones lacking the data last. */
interface SortCase {
  option: SortOption;
  items: Item[];
  ascending: string[];
  missing: string[];
}

const SORT_CASES: SortCase[] = [
  {
    option: SortOption.Name,
    items: [createItem({ id: 'b', name: 'beta' }), createItem({ id: 'a', name: 'Alpha' })],
    ascending: ['a', 'b'],
    missing: [],
  },
  {
    option: SortOption.Stars,
    items: [
      createItem({ id: 'many', name: 'many', repositories: [repository({ stars: 10 }), repository({ stars: 30 })] }),
      createItem({ id: 'few', name: 'few', repositories: [repository({ stars: 20 })] }),
      createItem({ id: 'no-github', name: 'no-github', repositories: [repository(undefined)] }),
      createItem({ id: 'no-repo', name: 'no-repo' }),
    ],
    ascending: ['few', 'many'],
    missing: ['no-github', 'no-repo'],
  },
  {
    option: SortOption.DateAdded,
    items: [
      createItem({ accepted_at: '2021-01-01', id: 'accepted', joined_at: '2018-01-01', name: 'accepted' }),
      createItem({ id: 'joined', joined_at: '2019-01-01', name: 'joined' }),
      createItem({ id: 'no-date', name: 'no-date' }),
    ],
    ascending: ['joined', 'accepted'],
    missing: ['no-date'],
  },
  {
    option: SortOption.Contributors,
    items: [
      createItem({
        id: 'secondary-large',
        name: 'secondary-large',
        repositories: [
          repository({ contributors: { count: 5, url: CONTRIBUTORS_URL } }, true),
          repository({ contributors: { count: 500, url: CONTRIBUTORS_URL } }),
        ],
      }),
      createItem({
        id: 'primary-large',
        name: 'primary-large',
        repositories: [repository({ contributors: { count: 50, url: CONTRIBUTORS_URL } }, true)],
      }),
      createItem({ id: 'no-primary-data', name: 'no-primary-data', repositories: [repository(undefined, true)] }),
    ],
    ascending: ['secondary-large', 'primary-large'],
    missing: ['no-primary-data'],
  },
  {
    option: SortOption.FirstCommit,
    items: [
      createItem({ id: 'recent', name: 'recent', repositories: [repository({ first_commit: commit('2022-01-01') })] }),
      createItem({
        id: 'oldest-repo',
        name: 'oldest-repo',
        repositories: [
          repository({ first_commit: commit('2023-01-01') }),
          repository({ first_commit: commit('2015-01-01') }),
        ],
      }),
      createItem({ id: 'no-commit', name: 'no-commit', repositories: [repository({ first_commit: undefined })] }),
    ],
    ascending: ['oldest-repo', 'recent'],
    missing: ['no-commit'],
  },
  {
    option: SortOption.LatestCommit,
    items: [
      createItem({
        id: 'newest-repo',
        name: 'newest-repo',
        repositories: [
          repository({ latest_commit: commit('2018-01-01') }),
          repository({ latest_commit: commit('2024-01-01') }),
        ],
      }),
      createItem({ id: 'stale', name: 'stale', repositories: [repository({ latest_commit: commit('2022-01-01') })] }),
      createItem({
        id: 'no-commit',
        name: 'no-commit',
        repositories: [repository({ latest_commit: { url: COMMIT_URL } })],
      }),
    ],
    ascending: ['stale', 'newest-repo'],
    missing: ['no-commit'],
  },
  {
    option: SortOption.Funding,
    items: [
      createItem({
        crunchbase_data: { funding: 900, generated_at: GENERATED_AT, name: 'Large' },
        id: 'large',
        name: 'large',
      }),
      createItem({
        crunchbase_data: { funding: 100, generated_at: GENERATED_AT, name: 'Small' },
        id: 'small',
        name: 'small',
      }),
      createItem({ crunchbase_data: { generated_at: GENERATED_AT, name: 'Unknown' }, id: 'unknown', name: 'unknown' }),
    ],
    ascending: ['small', 'large'],
    missing: ['unknown'],
  },
];

describe('sortItems', () => {
  it.each(SORT_CASES)(
    'sorts by $option in ascending order with missing data last',
    ({ ascending, items, missing, option }) => {
      expect(ids(sortItems(items, option, SortDirection.Asc))).toEqual([...ascending, ...missing]);
    }
  );

  it.each(SORT_CASES)(
    'sorts by $option in descending order with missing data last',
    ({ ascending, items, missing, option }) => {
      expect(ids(sortItems(items, option, SortDirection.Desc))).toEqual([...[...ascending].reverse(), ...missing]);
    }
  );

  it.each([SortDirection.Asc, SortDirection.Desc])('breaks ties by case-insensitive name (%s)', (direction) => {
    const items = [
      createItem({ id: 'charlie', name: 'charlie', repositories: [repository({ stars: 7 })] }),
      createItem({ id: 'alpha', name: 'Alpha', repositories: [repository({ stars: 7 })] }),
      createItem({ id: 'bravo', name: 'bravo', repositories: [repository({ stars: 7 })] }),
    ];

    expect(ids(sortItems(items, SortOption.Stars, direction))).toEqual(['alpha', 'bravo', 'charlie']);
  });

  it('sorts by latest commit using the newest repository of each item', () => {
    // Setup an item whose old repository is staler than every repository of the other item
    const items = [
      createItem({
        id: 'old-and-new',
        name: 'old-and-new',
        repositories: [
          repository({ latest_commit: commit('2010-01-01') }),
          repository({ latest_commit: commit('2024-01-01') }),
        ],
      }),
      createItem({ id: 'middle', name: 'middle', repositories: [repository({ latest_commit: commit('2020-01-01') })] }),
    ];

    // Check the newest repository decides the order
    expect(ids(sortItems(items, SortOption.LatestCommit, SortDirection.Desc))).toEqual(['old-and-new', 'middle']);
  });

  it('returns an empty array for no items', () => {
    expect(sortItems([], SortOption.Stars, SortDirection.Asc)).toEqual([]);
  });

  it('keeps the input array untouched', () => {
    const items = [createItem({ id: 'b', name: 'b' }), createItem({ id: 'a', name: 'a' })];

    sortItems(items, SortOption.Name, SortDirection.Asc);

    expect(ids(items)).toEqual(['b', 'a']);
  });
});

// Helpers.

/** Creates a commit made on the date given. */
function commit(date: string) {
  return { ts: `${date}T00:00:00Z`, url: COMMIT_URL };
}

/** Returns the ids of the items, in order. */
function ids(items: Item[]): string[] {
  return items.map((item) => item.id);
}

/** Creates a repository carrying the GitHub data overrides given, or no GitHub data when `undefined`. */
function repository(githubDataOverrides: Partial<GithubRepository> | undefined, primary = false): Repository {
  return createRepository({
    github_data:
      githubDataOverrides && createGithubRepository({ first_commit: commit('2020-01-15'), ...githubDataOverrides }),
    primary,
  });
}

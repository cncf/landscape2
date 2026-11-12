import type { GithubRepository, Item, Repository } from '../types/datasets';

/** Creates valid GitHub data of a repository; overrides replace or extend the default fields. */
export const createGithubRepository = (overrides: Partial<GithubRepository> = {}): GithubRepository => ({
  contributors: { count: 1, url: 'https://github.com/example/repo/graphs/contributors' },
  description: 'Repository description',
  generated_at: '2024-06-01T00:00:00Z',
  latest_commit: { ts: '2024-05-15T12:00:00Z', url: 'https://github.com/example/repo/commit/2' },
  participation_stats: [],
  stars: 1,
  url: 'https://github.com/example/repo',
  ...overrides,
});

/** Creates a minimal valid item; overrides replace or extend the default fields. */
export const createItem = (overrides: Partial<Item> = {}): Item => ({
  category: 'Test Category',
  homepage_url: 'https://example.com',
  id: 'test-item',
  logo: 'logos/test-item.svg',
  name: 'Test Item',
  subcategory: 'Test Subcategory',
  website: 'https://example.com',
  ...overrides,
});

/** Creates a minimal valid repository with no GitHub data; overrides replace or extend the default fields. */
export const createRepository = (overrides: Partial<Repository> = {}): Repository => ({
  url: 'https://github.com/example/repo',
  ...overrides,
});

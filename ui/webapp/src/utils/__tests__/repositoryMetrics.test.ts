import { createGithubRepository, createItem, createRepository } from 'common/test-utils';
import { describe, expect, it } from 'vitest';

import type { GithubRepository, Repository } from '../../types';
import { getCommitTimestamp, getItemStars } from '../repositoryMetrics';

describe('getItemStars', () => {
  it('returns undefined for an item without repositories', () => {
    expect(getItemStars(createItem())).toBeUndefined();
    expect(getItemStars(createItem({ repositories: [] }))).toBeUndefined();
  });

  it('returns the stars of a single repository', () => {
    expect(getItemStars(createItem({ repositories: [repository({ stars: 42 })] }))).toBe(42);
  });

  it('sums the stars of every repository', () => {
    const item = createItem({
      repositories: [repository({ stars: 3 }), repository({ stars: 5 }), repository({ stars: 8 })],
    });

    expect(getItemStars(item)).toBe(16);
  });

  it('sums every repository when the first one has no stars', () => {
    const item = createItem({
      repositories: [repository({ stars: 0 }), repository({ stars: 7 }), repository({ stars: 9 })],
    });

    expect(getItemStars(item)).toBe(16);
  });

  it('skips the repositories without GitHub data', () => {
    const item = createItem({ repositories: [repository({ stars: 4 }), repository(undefined)] });

    expect(getItemStars(item)).toBe(4);
  });

  it('returns undefined when no repository has GitHub data', () => {
    const item = createItem({ repositories: [repository(undefined), repository(undefined)] });

    expect(getItemStars(item)).toBeUndefined();
  });
});

describe('getCommitTimestamp', () => {
  it('picks the newest latest commit and the oldest first commit', () => {
    // Setup an item with an old and a new repository
    const item = createItem({
      repositories: [
        repository({
          first_commit: { ts: '2016-01-01T00:00:00Z', url: 'https://github.com/example/old/commit/1' },
          latest_commit: { ts: '2019-01-01T00:00:00Z', url: 'https://github.com/example/old/commit/2' },
        }),
        repository({
          first_commit: { ts: '2020-01-01T00:00:00Z', url: 'https://github.com/example/new/commit/1' },
          latest_commit: { ts: '2024-01-01T00:00:00Z', url: 'https://github.com/example/new/commit/2' },
        }),
      ],
    });

    // Check each kind picks its own end of the range
    expect(getCommitTimestamp(item, 'latest')).toBe(Date.parse('2024-01-01T00:00:00Z'));
    expect(getCommitTimestamp(item, 'first')).toBe(Date.parse('2016-01-01T00:00:00Z'));
  });

  it('skips the repositories without a first commit or GitHub data', () => {
    const item = createItem({
      repositories: [
        repository({ first_commit: undefined }),
        repository(undefined),
        repository({
          first_commit: { ts: '2021-06-01T00:00:00Z', url: 'https://github.com/example/repo/commit/1' },
        }),
      ],
    });

    expect(getCommitTimestamp(item, 'first')).toBe(Date.parse('2021-06-01T00:00:00Z'));
  });

  it('returns undefined when no repository has the commit', () => {
    const item = createItem({
      repositories: [
        repository({
          first_commit: undefined,
          latest_commit: { url: 'https://github.com/example/repo/commit/2' },
        }),
        repository(undefined),
      ],
    });

    expect(getCommitTimestamp(item, 'first')).toBeUndefined();
    expect(getCommitTimestamp(item, 'latest')).toBeUndefined();
    expect(getCommitTimestamp(createItem(), 'latest')).toBeUndefined();
  });
});

// Helpers.

/** Creates a repository carrying the GitHub data overrides given, or no GitHub data when `undefined`. */
const repository = (githubDataOverrides: Partial<GithubRepository> | undefined): Repository =>
  createRepository({ github_data: githubDataOverrides && createGithubRepository(githubDataOverrides) });

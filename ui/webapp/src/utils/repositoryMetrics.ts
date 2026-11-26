import isUndefined from 'lodash/isUndefined';

import { LandscapeItem } from '../types';

/** Commit of a repository whose timestamp `getCommitTimestamp` reads. */
export type CommitKind = 'first' | 'latest';

/**
 * Returns the commit timestamp of an item across its repositories: the earliest
 * first commit, or the most recent latest commit. Repositories without GitHub data
 * or without that commit are skipped.
 *
 * @param item - Item whose repositories are read
 * @param kind - Commit to read from each repository
 * @returns The timestamp in milliseconds, or `undefined` when no repository has the commit
 */
export const getCommitTimestamp = (item: LandscapeItem, kind: CommitKind): number | undefined => {
  const timestamps: number[] = [];
  for (const repository of item.repositories ?? []) {
    const commit = kind === 'first' ? repository.github_data?.first_commit : repository.github_data?.latest_commit;
    const timestamp = isUndefined(commit?.ts) ? NaN : Date.parse(commit.ts);
    if (!Number.isNaN(timestamp)) {
      timestamps.push(timestamp);
    }
  }

  if (timestamps.length === 0) return undefined;
  return kind === 'first' ? Math.min(...timestamps) : Math.max(...timestamps);
};

/**
 * Returns the GitHub stars of an item, summed over all its repositories.
 *
 * @param item - Item whose repositories are read
 * @returns The stars, or `undefined` when no repository has GitHub data
 */
export const getItemStars = (item: LandscapeItem): number | undefined => {
  let stars: number | undefined;
  for (const repository of item.repositories ?? []) {
    if (!isUndefined(repository.github_data)) {
      stars = (stars ?? 0) + repository.github_data.stars;
    }
  }
  return stars;
};

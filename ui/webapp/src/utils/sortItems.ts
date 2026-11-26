import isUndefined from 'lodash/isUndefined';
import orderBy from 'lodash/orderBy';

import { DEFAULT_SORT_DIRECTION } from '../data';
import { LandscapeItem, SortDirection, SortOption } from '../types';
import { getCommitTimestamp, getItemStars } from './repositoryMetrics';

/** Value an item is sorted by, `undefined` when the item lacks the data. */
type SortValueGetter = (item: LandscapeItem) => number | undefined;

/** Value getter of each sort option other than the name. */
const SORT_VALUE_GETTERS: Record<Exclude<SortOption, SortOption.Name>, SortValueGetter> = {
  [SortOption.Contributors]: (item) =>
    item.repositories?.find((repository) => repository.primary === true)?.github_data?.contributors.count,
  [SortOption.DateAdded]: (item) => {
    const date = item.accepted_at || item.joined_at;
    return isUndefined(date) ? undefined : new Date(date).valueOf();
  },
  [SortOption.FirstCommit]: (item) => getCommitTimestamp(item, 'first'),
  [SortOption.Funding]: (item) => item.crunchbase_data?.funding,
  [SortOption.LatestCommit]: (item) => getCommitTimestamp(item, 'latest'),
  [SortOption.Stars]: getItemStars,
};

/**
 * Sorts items by the option and direction given. Items lacking the sorted data go
 * last in both directions, and ties are ordered by case-insensitive name.
 *
 * @param items - Items to sort
 * @param option - Sort option
 * @param direction - Sort direction
 * @returns A new sorted array
 */
const sortItems = <T extends LandscapeItem>(items: T[], option: SortOption, direction: SortDirection): T[] => {
  if (!Array.isArray(items) || items.length === 0) return [];
  if (option === SortOption.Name) return orderBy(items, [getSortName], direction);

  const getValue = SORT_VALUE_GETTERS[option];
  const missingValue = direction === SortDirection.Asc ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
  return orderBy(
    items,
    [(item: T) => getValue(item) ?? missingValue, getSortName],
    [direction, DEFAULT_SORT_DIRECTION]
  );
};

export default sortItems;

/** Returns the case-insensitive name items are sorted by. */
const getSortName = (item: LandscapeItem): string => item.name.toLowerCase();

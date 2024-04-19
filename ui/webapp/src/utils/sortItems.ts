import isUndefined from 'lodash/isUndefined';
import orderBy from 'lodash/orderBy';

import { DEFAULT_SORT_DIRECTION } from '../data';
import { Item, SortDirection, SortOption } from '../types';

const sortItems = (items: Item[], option: SortOption, direction: SortDirection): Item[] => {
  if (!Array.isArray(items) || items.length === 0) return [];

  switch (option) {
    case SortOption.DateAdded:
      return orderBy(
        items,
        [
          (item: Item) => {
            const date = item.accepted_at || item.joined_at;
            if (!isUndefined(date)) {
              return new Date(date).valueOf();
            } else {
              return direction === SortDirection.Asc ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
            }
          },
          (item: Item) => item.name.toLowerCase().toString(),
        ],
        [direction, DEFAULT_SORT_DIRECTION]
      );

    case SortOption.Stars:
      return orderBy(
        items,
        [
          (item: Item) => {
            if (item.repositories) {
              let stars = 0;
              item.repositories.forEach((repo) => {
                if (repo.github_data) {
                  stars += repo.github_data.stars;
                }
              });
              return stars;
            } else {
              return direction === SortDirection.Asc ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
            }
          },
          (item: Item) => item.name.toLowerCase().toString(),
        ],
        [direction, DEFAULT_SORT_DIRECTION]
      );

    case SortOption.Contributors:
      return orderBy(
        items,
        [
          (item: Item) => {
            if (item.repositories) {
              let contributors = 0;
              const primaryRepo = item.repositories.find((repo) => repo.primary === true);
              if (primaryRepo && primaryRepo.github_data) {
                contributors += primaryRepo.github_data.contributors.count;
              }
              return contributors;
            } else {
              return direction === SortDirection.Asc ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
            }
          },
          (item: Item) => item.name.toLowerCase().toString(),
        ],
        [direction, DEFAULT_SORT_DIRECTION]
      );

    case SortOption.FirstCommit:
      return orderBy(
        items,
        [
          (item: Item) => {
            let firstCommit: number | undefined = undefined;
            if (item.repositories) {
              item.repositories.forEach((repo) => {
                if (repo.github_data) {
                  const commitDate = new Date(repo.github_data.first_commit.ts).valueOf();
                  if (isUndefined(firstCommit) || commitDate < firstCommit) {
                    firstCommit = commitDate;
                  }
                }
              });
            }
            if (firstCommit) {
              return firstCommit;
            } else {
              return direction === SortDirection.Asc ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
            }
          },
          (item: Item) => item.name.toLowerCase().toString(),
        ],
        [direction, DEFAULT_SORT_DIRECTION]
      );

    case SortOption.LatestCommit:
      return orderBy(
        items,
        [
          (item: Item) => {
            let latestCommit: number | undefined = undefined;
            if (item.repositories) {
              item.repositories.forEach((repo) => {
                if (repo.github_data) {
                  const commitDate = new Date(repo.github_data.latest_commit.ts).valueOf();
                  if (isUndefined(latestCommit) || commitDate < latestCommit) {
                    latestCommit = commitDate;
                  }
                }
              });
            }
            if (latestCommit) {
              return latestCommit;
            } else {
              return direction === SortDirection.Asc ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
            }
          },
          (item: Item) => item.name.toLowerCase().toString(),
        ],
        [direction, DEFAULT_SORT_DIRECTION]
      );

    case SortOption.Funding:
      return orderBy(
        items,
        [
          (item: Item) => {
            if (item.crunchbase_data && !isUndefined(item.crunchbase_data.funding)) {
              return item.crunchbase_data.funding;
            } else {
              return direction === SortDirection.Asc ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
            }
          },
          (item: Item) => item.name.toLowerCase().toString(),
        ],
        [direction, DEFAULT_SORT_DIRECTION]
      );

    // Default sort by name
    default:
      return orderBy(items, [(item: Item) => item.name.toLowerCase().toString()], direction);
  }
};

export default sortItems;

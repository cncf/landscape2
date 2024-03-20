import { orderBy } from 'lodash';

import { Item, SortDirection, SortOption } from '../types';

const sortItems = (items: Item[], option: SortOption, direction: SortDirection): Item[] => {
  if (!Array.isArray(items) || items.length === 0) return [];

  switch (option) {
    case SortOption.DateAdded:
      return orderBy(items, [(item: Item) => item.accepted_at || item.joined_at], direction);

    case SortOption.Stars:
      return orderBy(
        items,
        [
          (item: Item) => {
            let stars = 0;
            if (item.repositories) {
              item.repositories.forEach((repo) => {
                if (repo.github_data) {
                  stars += repo.github_data.stars;
                }
              });
            }
            return stars;
          },
        ],
        direction
      );

    case SortOption.FirstCommit:
      return orderBy(
        items,
        [
          (item: Item) => {
            let firstCommit = new Date();
            if (item.repositories) {
              item.repositories.forEach((repo) => {
                if (repo.github_data) {
                  const commitDate = new Date(repo.github_data.first_commit.ts);
                  if (commitDate < firstCommit) {
                    firstCommit = commitDate;
                  }
                }
              });
            }
            return firstCommit;
          },
        ],
        direction
      );

    default:
      return orderBy(items, [(item: Item) => item.name.toLowerCase().toString()], direction);
  }
};

export default sortItems;

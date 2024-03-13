import { orderBy } from 'lodash';

import { Item, SortOption } from '../types';

const sortItems = (items: Item[], option: SortOption): Item[] => {
  switch (option) {
    case SortOption.DateAdded:
      return orderBy(items, [(item: Item) => item.accepted_at], 'asc');

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
        'desc'
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
        'asc'
      );

    default:
      return orderBy(items, [(item: Item) => item.name.toLowerCase().toString()], 'asc');
  }
};

export default sortItems;

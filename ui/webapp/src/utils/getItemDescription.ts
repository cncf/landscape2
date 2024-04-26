import { Item, Repository } from '../types';
import cleanEmojis from './cleanEmojis';

// Get item's description
const getItemDescription = (item?: Item | null): string => {
  if (item) {
    if (item.description && item.description !== '') {
      return item.description;
    } else if (item.repositories) {
      const primaryRepo = item.repositories.find((repo: Repository) => repo.primary);
      if (
        primaryRepo &&
        primaryRepo.github_data &&
        primaryRepo.github_data.description &&
        primaryRepo.github_data.description !== ''
      ) {
        return cleanEmojis(primaryRepo.github_data.description);
      }
    } else if (item.crunchbase_data && item.crunchbase_data.description && item.crunchbase_data.description !== '') {
      return cleanEmojis(item.crunchbase_data.description);
    }
  }

  return 'This item does not have a description available yet';
};

export default getItemDescription;

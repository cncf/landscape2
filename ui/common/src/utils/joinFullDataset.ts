import type { Item, Repository } from '../types/datasets';
import type { FullDataset } from '../types/generated';

/**
 * Joins the Crunchbase and GitHub data of the full dataset into its items: each
 * item gets the organization matching its `crunchbase_url`, and each repository
 * the GitHub data matching its url. Entries missing from the dataset stay
 * `undefined`. The input items are not mutated.
 *
 * @param full - Full dataset, as written by the build
 * @returns New items carrying their Crunchbase and GitHub data
 */
export const joinFullDataset = (full: FullDataset): Item[] =>
  (full.items ?? []).map(({ repositories, ...fullItem }) => {
    const item: Item = { ...fullItem };

    // Join the organization data
    const organization = fullItem.crunchbase_url ? full.crunchbase_data?.[fullItem.crunchbase_url] : undefined;
    if (organization) {
      item.crunchbase_data = organization;
    }

    // Join the repositories data
    if (repositories) {
      item.repositories = repositories.map((repository): Repository => {
        const githubData = full.github_data?.[repository.url];
        return githubData ? { ...repository, github_data: githubData } : { ...repository };
      });
    }

    return item;
  });

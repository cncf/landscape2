import MiniSearch, { SearchResult } from 'minisearch';

import { Item } from '../types';

const MAX_RESULTS = 30;

class Search {
  private index: MiniSearch | undefined = undefined;

  public init(items: Item[]): void {
    this.indexItems(items);
  }

  private async indexItems(items: Item[]) {
    const miniSearch = new MiniSearch({
      fields: ['crunchbaseCategories', 'description', 'name', 'primaryRepositoryTopics', 'summaryTags'],
      extractField: (item, fieldName) => {
        let value = '';

        switch (fieldName) {
          case 'crunchbaseCategories':
            if (item.crunchbase_data && item.crunchbase_data.categories) {
              value = item.crunchbase_data.categories.join(' ');
            }
            break;

          case 'description':
            if (item.description && item.description !== '') {
              value = item.description;
            } else if (item.repositories) {
              for (let i = 0; i < item.repositories.length; i++) {
                const repo = item.repositories[i];
                if (
                  repo.primary &&
                  repo.github_data &&
                  repo.github_data.description &&
                  repo.github_data.description !== ''
                ) {
                  value = repo.github_data.description;
                  break;
                }
              }
            }
            break;

          case 'primaryRepositoryTopics':
            if (item.repositories) {
              for (let i = 0; i < item.repositories.length; i++) {
                const repo = item.repositories[i];
                if (repo.primary && repo.github_data && repo.github_data.topics) {
                  value = repo.github_data.topics.join(' ');
                  break;
                }
              }
            }
            break;

          case 'summaryTags':
            if (item.summary && item.summary.tags) {
              value = item.summary.tags.join(' ');
            }
            break;

          default:
            value = item[fieldName];
            break;
        }

        return value;
      },
      storeFields: ['id', 'category', 'featured', 'logo', 'maturity', 'name', 'subcategory'],
      searchOptions: {
        boost: { name: 3 },
        boostDocument: (_id, _term, storedFields) => {
          // Default boost factor
          let boostFactor = 1;

          if (storedFields) {
            // Boost -non archived- projects
            if (storedFields.maturity && storedFields.maturity !== 'archived') {
              boostFactor += 0.5;
            }

            // Boost featured items
            if (storedFields.featured) {
              boostFactor += 0.5;
            }
          }

          return boostFactor;
        },
        combineWith: 'AND',
        prefix: true,
      },
    });

    await miniSearch.addAllAsync(items, { chunkSize: 30 });
    this.index = miniSearch;
  }

  public async searchTerm(term: string): Promise<SearchResult[]> {
    if (!this.index) {
      return Promise.reject('Preparing search index...');
    }
    return Promise.resolve(this.index.search(term).slice(0, MAX_RESULTS - 1));
  }
}

const searchEngine = new Search();
export default searchEngine;

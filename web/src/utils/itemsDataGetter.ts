import isUndefined from 'lodash/isUndefined';

import { ActiveSection, CrunchbaseData, FilterOption, GithubData, GithubOrgData, Item, LandscapeData, Repository } from '../types';
import capitalizeFirstLetter from './capitalizeFirstLetter';

export interface ItemsDataStatus {
  updateStatus(status: boolean): void;
}

export interface LogosOptionsGroup {
  id: LogosPreviewOptions;
  name: string;
  options: FilterOption[];
}

export enum LogosPreviewOptions {
  Maturity = 'maturity',
  Categories = 'categories',
  Other = 'other',
}

interface CategoryOpt {
  [key: string]: string[];
}

export class ItemsDataGetter {
  private updateStatus?: ItemsDataStatus;
  public ready = false;
  public landscapeData?: LandscapeData;

  public subscribe(updateStatus: ItemsDataStatus) {
    this.updateStatus = updateStatus;
  }

  public init() {
    if (!this.ready) {
      fetch(import.meta.env.MODE === 'development' ? '../../static/data/full.json' : './data/full.json')
        .then((res) => res.json())
        .then((data: LandscapeData) => {
          const extendedItems = this.extendItemsData(data.items, data.crunchbase_data, data.github_data, data.github_org_data);
          this.landscapeData = {
            ...data,
            items: extendedItems,
          };
          this.ready = true;
          if (this.updateStatus) {
            this.updateStatus.updateStatus(true);
          }
        });
    }
  }

  public getAll(): Item[] {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items;
    }
    return [];
  }

  public getCrunchbaseData(): CrunchbaseData | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.crunchbase_data) {
      return this.landscapeData.crunchbase_data;
    }
    return undefined;
  }

  public getGithubData(): GithubData | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.github_data) {
      return this.landscapeData.github_data;
    }
    return undefined;
  }

  private extendItemsData(items?: Item[], crunchbaseData?: CrunchbaseData, githubData?: GithubData, githubOrgData?: GithubOrgData): Item[] {
    const itemsList: Item[] = [];

    if (!isUndefined(items)) {
      items.forEach((item: Item) => {
        const extendedItem = { ...item };
        // Extend Item with crunchbase_data
        if (
          !isUndefined(item.crunchbase_url) &&
          !isUndefined(crunchbaseData) &&
          !isUndefined(crunchbaseData[item.crunchbase_url!])
        ) {
          extendedItem.crunchbase_data = crunchbaseData[item.crunchbase_url!];
        }

        if (!isUndefined(item.github_org_url) && !isUndefined(githubOrgData) && !isUndefined(githubOrgData[item.github_org_url])) {
          extendedItem.github_org_stats = githubOrgData[item.github_org_url];
        }

        // Extend repositories Item with github_data
        if (!isUndefined(item.repositories) && !isUndefined(githubData)) {
          const tmpRepositories: Repository[] = [];
          item.repositories.forEach((repo: Repository) => {
            const tmpRepo = { ...repo };
            if (!isUndefined(githubData[repo.url])) {
              tmpRepo.github_data = githubData[repo.url];
            }
            tmpRepositories.push(tmpRepo);
          });
          extendedItem.repositories = tmpRepositories;
        }
        itemsList.push(extendedItem);
      });
    }
    return itemsList;
  }

  public findById(id: string): Item | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.find((i: Item) => id === i.id);
    }
  }

  public filterItemsBySection(activeSection: ActiveSection): Item[] | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.filter(
        (i: Item) => activeSection.subcategory === i.subcategory && activeSection.category === i.category
      );
    }
  }

  public filterItemsByMaturity(level: string): Item[] | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.filter((i: Item) => i.maturity === level);
    }
  }

  public filterItemsByEndUser(): Item[] | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.filter((i: Item) => i.enduser && window.baseDS.members_category === i.category);
    }
  }

  public prepareLogosOptions(): LogosOptionsGroup[] {
    const options: LogosOptionsGroup[] = [];
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      const maturityTypes: string[] = [];
      const categories: CategoryOpt = {};

      for (const i of this.landscapeData!.items!) {
        if (i.maturity) {
          maturityTypes.push(i.maturity);
        }
        if (i.category) {
          categories[i.category] = [...(categories[i.category] || []), i.subcategory];
        }
      }

      if (maturityTypes.length > 0) {
        options.push({
          id: LogosPreviewOptions.Maturity,
          name: 'maturity',
          options: [...new Set(maturityTypes)].sort().map((m: string) => ({
            value: m,
            name: capitalizeFirstLetter(m),
          })),
        });
      }

      if (Object.keys(categories).length > 0) {
        const sortedCategories = Object.keys(categories).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: 'base' })
        );

        const opts = sortedCategories.map((c: string) => {
          const suboptions = [...new Set(categories[c])].sort().map((s: string) => ({
            value: s,
            name: s,
          }));
          return {
            value: c,
            name: c,
            suboptions: suboptions,
          };
        });

        options.push({
          id: LogosPreviewOptions.Categories,
          name: 'category / subcategory',
          options: opts,
        });
      }

      options.push({
        id: LogosPreviewOptions.Other,
        name: 'Other',
        options: [
          {
            value: 'enduser',
            name: 'End user members',
          },
        ],
      });
    }
    return options;
  }
}

const itemsDataGetter = new ItemsDataGetter();
export default itemsDataGetter;

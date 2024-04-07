import groupBy from 'lodash/groupBy';
import intersection from 'lodash/intersection';
import isUndefined from 'lodash/isUndefined';

import { ALL_OPTION } from '../data';
import {
  ActiveFilters,
  ActiveSection,
  BaseItem,
  CardMenu,
  Category,
  ClassifiedOption,
  CrunchbaseData,
  FilterOption,
  GithubData,
  Group,
  Item,
  LandscapeData,
  Repository,
  Subcategory,
} from '../types';
import capitalizeFirstLetter from './capitalizeFirstLetter';
import filterData from './filterData';
import nestArray from './nestArray';
import sortMenuOptions from './sortMenuOptions';

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

export interface GroupData {
  [key: string]: CategoriesData;
}

export interface CategoriesData {
  [key: string]: CategoryData;
}

export interface CategoryData {
  [key: string]: SubcategoryData;
}

export interface SubcategoryData {
  items: (BaseItem | Item)[];
  itemsCount: number;
  itemsFeaturedCount: number;
}

interface CategoryOpt {
  [key: string]: string[];
}

export class ItemsDataGetter {
  private updateStatus?: ItemsDataStatus;
  private ready = false;
  private landscapeData?: LandscapeData;
  private initialQuery?: {
    grid: GroupData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    card: any;
    menu: { [key: string]: CardMenu | undefined };
    numItems: { [key: string]: number };
  };

  // Subscribe to the updateStatus
  public subscribe(updateStatus: ItemsDataStatus) {
    this.updateStatus = updateStatus;
  }

  // Initialize the data
  public init() {
    if (!this.ready) {
      fetch(import.meta.env.MODE === 'development' ? '../../static/data/full.json' : './data/full.json')
        .then((res) => res.json())
        .then((data: LandscapeData) => {
          const extendedItems = this.extendItemsData(data.items, data.crunchbase_data, data.github_data);
          this.landscapeData = {
            ...data,
            items: extendedItems,
          };
          this.ready = true;
          if (this.updateStatus) {
            this.updateStatus.updateStatus(true);
          }
          this.saveInitialData();
        });
    }
  }

  // Get all items
  public getAll(): Item[] {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items;
    }
    return [];
  }

  // Get crunchbase data
  public getCrunchbaseData(): CrunchbaseData | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.crunchbase_data) {
      return this.landscapeData.crunchbase_data;
    }
    return undefined;
  }

  // Extend items with crunchbase and github data
  private extendItemsData(items?: Item[], crunchbaseData?: CrunchbaseData, githubData?: GithubData): Item[] {
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

  // Group items
  private groupData(items: (BaseItem | Item)[]): { [key: string]: (Item | BaseItem)[] } {
    const gData = groupBy(items, 'category');
    const groups: Group[] = window.baseDS.groups || [];

    const groupedItems: { [key: string]: (BaseItem | Item)[] } = {};

    for (const group of groups) {
      groupedItems[group.normalized_name] = [];
      group.categories.forEach((c: string) => {
        const groupData = gData[c];
        if (groupData) {
          groupedItems[group.normalized_name].push(...groupData);
        }
      });
    }
    groupedItems[ALL_OPTION] = [...items];

    return groupedItems;
  }

  // Classify items
  public classifyItems(items: (BaseItem | Item)[], classified: ClassifiedOption): unknown | undefined {
    switch (classified) {
      case ClassifiedOption.None:
        return items;
      case ClassifiedOption.Category:
        return nestArray(items, ['category', 'subcategory']);
      case ClassifiedOption.Maturity:
        return groupBy(items, 'maturity');
      case ClassifiedOption.Tag:
        return groupBy(items, 'tag');
    }
  }

  // Prepare grid data
  private prepareGridData(grouped: { [key: string]: (Item | BaseItem)[] }, withAllOption = true) {
    const data: GroupData = {};
    if (!isUndefined(grouped)) {
      const groupedItems = { ...grouped };
      if (!withAllOption) {
        delete groupedItems[ALL_OPTION];
      }

      Object.keys(groupedItems).forEach((group: string) => {
        data[group] = {};
        const items = groupedItems![group];
        items.forEach((item: BaseItem | Item) => {
          if (data[group][item.category]) {
            if (data[group][item.category][item.subcategory]) {
              data[group][item.category][item.subcategory].items.push(item);
              data[group][item.category][item.subcategory].itemsCount++;
              if (item.featured) {
                data[group][item.category][item.subcategory].itemsFeaturedCount++;
              }
            } else {
              data[group][item.category][item.subcategory] = {
                items: [item],
                itemsCount: 1,
                itemsFeaturedCount: item.featured ? 1 : 0,
              };
            }
          } else {
            data[group][item.category] = {
              [item.subcategory]: {
                items: [item],
                itemsCount: 1,
                itemsFeaturedCount: item.featured ? 1 : 0,
              },
            };
          }
        });
      });
    }
    return data;
  }

  public getGridData(withAllOption: boolean): GroupData {
    return this.prepareGridData(this.getGroupedData(), withAllOption);
  }

  public getGroupedData(): { [key: string]: (Item | BaseItem)[] } {
    return this.groupData(this.ready ? this.getAll() : window.baseDS.items);
  }

  private saveInitialData() {
    const items = this.ready ? this.getAll() : window.baseDS.items;
    const groupedItemsList = this.groupData(items);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classifiedFullCardData: any = {};
    const menuFullData: { [key: string]: CardMenu | undefined } = {};
    const numItems: { [key: string]: number } = {};
    Object.keys(groupedItemsList).forEach((group: string) => {
      const classifiedGroup = this.classifyItems(groupedItemsList[group], ClassifiedOption.Category);
      classifiedFullCardData[group] = classifiedGroup;
      menuFullData[group] = this.getMenuOptions(classifiedGroup, ClassifiedOption.Category);
      numItems[group as string] = groupedItemsList[group].length;
    });

    const fullGridData = this.prepareGridData(groupedItemsList);
    const fullQuery = { grid: fullGridData, card: classifiedFullCardData, menu: menuFullData, numItems: numItems };
    this.initialQuery = fullQuery;
  }

  // Prepare menu options
  private getMenuOptions = (data: unknown, classified: ClassifiedOption) => {
    const menu: CardMenu = {};
    let options: string[] = [];
    switch (classified) {
      case ClassifiedOption.None:
        return;
      case ClassifiedOption.Category:
        Object.keys(data as never)
          .sort()
          .forEach((category: string) => {
            let tmpSubcategories = Object.keys((data as { [key: string]: never })[category]).sort();
            const isOverriden =
              !isUndefined(window.baseDS.categories_overridden) &&
              window.baseDS.categories_overridden.includes(category);
            if (isOverriden) {
              const currentCategory = window.baseDS.categories.find((c: Category) => c.name === category);
              if (currentCategory) {
                const subcategories: string[] = currentCategory.subcategories.map((s: Subcategory) => s.name);
                tmpSubcategories = intersection(subcategories, tmpSubcategories);
              }
            }
            menu[category] = tmpSubcategories;
          });
        return menu;
      case ClassifiedOption.Maturity:
        options = sortMenuOptions(Object.keys(data as { [key: string]: never }));
        return options.length > 0 ? { Maturity: options } : {};
      case ClassifiedOption.Tag:
        options = sortMenuOptions(Object.keys(data as { [key: string]: never }));
        return options.length > 0 ? { Tag: options } : {};
    }
  };

  // Query items
  public queryItems(input: ActiveFilters, group: string, classified: ClassifiedOption) {
    const items = this.ready ? this.getAll() : window.baseDS.items;
    const filteredItems = filterData(items, input);
    const groupedItems = this.groupData(filteredItems);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classifiedCardData: any = {};
    const menuData: { [key: string]: CardMenu | undefined } = {};
    const numItems: { [key: string]: number } = {};
    Object.keys(groupedItems).forEach((group: string) => {
      const classifiedGroup = this.classifyItems(groupedItems[group], classified);
      classifiedCardData[group] = classifiedGroup;
      menuData[group] = this.getMenuOptions(classifiedGroup, classified);
      numItems[group] = groupedItems[group].length;
    });

    const gridData = this.prepareGridData(groupedItems);
    let currentQuery = { grid: gridData, card: classifiedCardData, menu: menuData, numItems: numItems };

    if (!isUndefined(this.initialQuery)) {
      currentQuery = {
        grid: { ...this.initialQuery.grid, [group]: gridData[group] },
        card: { ...this.initialQuery.card, [group]: classifiedCardData[group] },
        menu: { ...this.initialQuery.menu, [group]: menuData[group] },
        numItems: { ...this.initialQuery.numItems, [group]: numItems[group] },
      };
    }
    return currentQuery;
  }

  // Get item by id
  public getItemById(id: string): Item | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.find((i: Item) => id === i.id);
    }
  }

  // Get items by section
  public getItemsBySection(activeSection: ActiveSection): Item[] | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.filter(
        (i: Item) => activeSection.subcategory === i.subcategory && activeSection.category === i.category
      );
    }
  }

  // Get items by maturity status
  public getItemsByMaturity(level: string): Item[] | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.filter((i: Item) => i.maturity === level);
    }
  }

  // Get items by end user
  public getItemsByEndUser(): Item[] | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.filter((i: Item) => i.enduser && window.baseDS.members_category === i.category);
    }
  }

  // Prepare logos options
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

// Create an instance of the ItemsDataGetter
const itemsDataGetter = new ItemsDataGetter();
export default itemsDataGetter;

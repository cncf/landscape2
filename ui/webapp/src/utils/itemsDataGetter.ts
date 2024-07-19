import { capitalizeFirstLetter } from 'common';
import { uniqBy } from 'lodash';
import compact from 'lodash/compact';
import groupBy from 'lodash/groupBy';
import intersection from 'lodash/intersection';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import some from 'lodash/some';
import uniq from 'lodash/uniq';
import uniqWith from 'lodash/uniqWith';

import { ALL_OPTION, DEFAULT_CLASSIFY } from '../data';
import {
  ActiveFilters,
  ActiveSection,
  AdditionalCategory,
  BaseItem,
  CardMenu,
  Category,
  ClassifyOption,
  CrunchbaseData,
  FilterOption,
  GithubData,
  Group,
  Item,
  LandscapeData,
  Repository,
  SortOption,
  Subcategory,
} from '../types';
import checkIfCategoryInGroup from './checkIfCategoryInGroup';
import filterData from './filterData';
import search from './search';
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

export interface ClassifyAndSortOptions {
  classify: ClassifyOption[];
  sort: SortOption[];
}

export class ItemsDataGetter {
  private updateStatus?: ItemsDataStatus;
  private ready = false;
  private groups: string[] | undefined;
  private landscapeData?: LandscapeData;
  private classifyAndSortOptions: { [key: string]: ClassifyAndSortOptions } | undefined;
  private allDataGrouped: { [key: string]: (Item | BaseItem)[] } | undefined;

  // Subscribe to the updateStatus
  public subscribe(updateStatus: ItemsDataStatus) {
    this.updateStatus = updateStatus;
  }

  // Initialize the data
  public init(landscapeData?: LandscapeData) {
    if (!this.ready) {
      if (landscapeData) {
        this.prepareGroups();
        this.initialDataPreparation(landscapeData);
      } else {
        fetch(import.meta.env.MODE === 'development' ? '../../static/data/full.json' : './data/full.json')
          .then((res) => res.json())
          .then((data: LandscapeData) => {
            this.initialDataPreparation(data);
          });
      }
    }
  }

  public prepareGroups() {
    const groups: string[] = [];

    if (window.baseDS && window.baseDS.groups) {
      const categories: string[] = [];
      if (window.baseDS.categories) {
        window.baseDS.categories.forEach((c: Category) => {
          categories.push(c.name);
        });
      }
      window.baseDS.groups.forEach((g: Group) => {
        if (intersection(categories, g.categories).length > 0) {
          groups.push(g.normalized_name);
        }
      });
      this.groups = groups;
    }
  }

  public getGroups(): string[] | undefined {
    return this.groups;
  }

  private initialDataPreparation(data: LandscapeData) {
    const extendedItems = this.extendItemsData(data.items, data.crunchbase_data, data.github_data);
    // Search engine initialization
    search.init(extendedItems);
    this.landscapeData = {
      ...data,
      items: extendedItems,
    };
    this.ready = true;
    if (this.updateStatus) {
      this.updateStatus.updateStatus(true);
    }
    this.saveData();
  }

  public isReady(): boolean {
    return this.ready;
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

  // Get categories and subcategories list with items
  public getCategoriesAndSubcategoriesList(): Category[] {
    const list: { [key: string]: string[] } = {};
    window.baseDS.items.forEach((i: Item) => {
      if (list[i.category]) {
        list[i.category].push(i.subcategory);
      } else {
        list[i.category] = [i.subcategory];
      }
    });
    const categories: Category[] = [];
    window.baseDS.categories.forEach((c: Category) => {
      if (list[c.name]) {
        const subcategories: Subcategory[] = [];
        c.subcategories.forEach((s: Subcategory) => {
          if (list[c.name].includes(s.name)) {
            subcategories.push(s);
          }
        });
        categories.push({ ...c, subcategories: subcategories });
      }
    });

    return categories;
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
    const additionalItems: { [key: string]: (Item | BaseItem)[] } = {};
    const itemsWithAdditionalCategories = items.filter((i: BaseItem | Item) => !isUndefined(i.additional_categories));
    itemsWithAdditionalCategories.forEach((item: BaseItem | Item) => {
      if (item.additional_categories) {
        item.additional_categories.forEach((x: AdditionalCategory) => {
          if (additionalItems[x.category]) {
            additionalItems[x.category].push(item);
          } else {
            additionalItems[x.category] = [item];
          }
        });
      }
    });

    const groups: Group[] = window.baseDS.groups || [];
    const groupedItems: { [key: string]: (BaseItem | Item)[] } = {};

    for (const group of groups) {
      // Check if the group is in the list of valid groups
      if (this.groups && this.groups.includes(group.normalized_name)) {
        const itemsTmp: (BaseItem | Item)[] = [];
        group.categories.forEach((c: string) => {
          const groupData = gData[c];
          const additionalData = additionalItems[c];
          if (groupData) {
            itemsTmp.push(...groupData);
          }
          if (additionalData) {
            itemsTmp.push(...additionalData);
          }
        });
        // Clean duplicates due to additional categories
        groupedItems[group.normalized_name] = uniqWith(itemsTmp, isEqual);
      }
    }
    groupedItems[ALL_OPTION] = [...items];

    return groupedItems;
  }

  private getClassifyAndSortOptionsPerGroup = (items: (BaseItem | Item)[]): ClassifyAndSortOptions => {
    const classify: ClassifyOption[] = [ClassifyOption.None, ClassifyOption.Category];
    const sort: SortOption[] = [SortOption.Name];

    if (some(items, (i: Item) => !isUndefined(i.maturity))) {
      classify.push(ClassifyOption.Maturity);
    }
    if (some(items, (i: Item) => !isUndefined(i.tag))) {
      classify.push(ClassifyOption.Tag);
    }

    if (some(items, (i: Item) => !isUndefined(i.repositories))) {
      sort.push(SortOption.Stars);
      sort.push(SortOption.FirstCommit);
      sort.push(SortOption.LatestCommit);
      sort.push(SortOption.Contributors);
    }

    if (some(items, (i: Item) => !isUndefined(i.accepted_at) || !isUndefined(i.joined_at))) {
      sort.push(SortOption.DateAdded);
    }

    if (some(items, (i: Item) => !isUndefined(i.crunchbase_data))) {
      sort.push(SortOption.Funding);
    }

    return {
      classify,
      sort,
    };
  };

  private prepareClassifyAndSortOptions(groupedItems: { [key: string]: (Item | BaseItem)[] }): void {
    const options: { [key: string]: ClassifyAndSortOptions } = {};

    Object.keys(groupedItems).forEach((group: string) => {
      options[group] = this.getClassifyAndSortOptionsPerGroup(groupedItems[group]);
    });

    this.classifyAndSortOptions = options;
  }

  public getClassifyAndSortOptions(): { [key: string]: ClassifyAndSortOptions } {
    return this.classifyAndSortOptions || {};
  }

  private classifyItemsByCatAndSub(
    items: (BaseItem | Item)[],
    group: string,
    activeCategoryFilters?: string[]
  ): { [key: string]: { [key: string]: (BaseItem | Item)[] } } {
    const groupedItems: { [key: string]: { [key: string]: (BaseItem | Item)[] } } = {};

    if (items && items.length > 0) {
      const addItem = (category: string, subcategory: string, item: BaseItem | Item) => {
        if (groupedItems[category]) {
          if (groupedItems[category][subcategory]) {
            groupedItems[category][subcategory].push(item);
          } else {
            groupedItems[category][subcategory] = [item];
          }
        } else {
          groupedItems[category] = { [subcategory]: [item] };
        }
      };

      const validateCategory = (category: string): boolean => {
        if (!checkIfCategoryInGroup(category, group)) return false;
        if (activeCategoryFilters && activeCategoryFilters.length > 0) {
          return activeCategoryFilters.includes(category);
        }
        return true;
      };

      for (const item of items) {
        if (validateCategory(item.category)) {
          addItem(item.category, item.subcategory, item);
        }
        if (item.additional_categories) {
          item.additional_categories.forEach((ad: AdditionalCategory) => {
            if (validateCategory(ad.category)) {
              addItem(ad.category, ad.subcategory, item);
            }
          });
        }
      }
    }

    return groupedItems;
  }

  // Classify items
  public classifyItems(
    items: (BaseItem | Item)[],
    classify: ClassifyOption,
    group: string,
    activeCategoryFilters?: string[]
  ): unknown | undefined {
    switch (classify) {
      case ClassifyOption.None:
        return items;
      case ClassifyOption.Category:
        return this.classifyItemsByCatAndSub(items, group, activeCategoryFilters);
      case ClassifyOption.Maturity:
        return groupBy(items, 'maturity');
      case ClassifyOption.Tag:
        return groupBy(items, 'tag');
    }
  }

  // Prepare grid data
  private prepareGridData(
    grouped: { [key: string]: (Item | BaseItem)[] },
    withAllOption: boolean,
    activeCategoryFilters?: string[]
  ) {
    const data: GroupData = {};
    if (!isUndefined(grouped)) {
      const groupedItems = { ...grouped };
      if (!withAllOption) {
        delete groupedItems[ALL_OPTION];
      }

      const addItem = (group: string, category: string, subcategory: string, item: Item | BaseItem) => {
        if (data[group][category]) {
          if (data[group][category][subcategory]) {
            data[group][category][subcategory].items.push(item);
            data[group][category][subcategory].itemsCount++;
            if (item.featured) {
              data[group][category][subcategory].itemsFeaturedCount++;
            }
          } else {
            data[group][category][subcategory] = {
              items: [item],
              itemsCount: 1,
              itemsFeaturedCount: item.featured ? 1 : 0,
            };
          }
        } else {
          data[group][category] = {
            [subcategory]: {
              items: [item],
              itemsCount: 1,
              itemsFeaturedCount: item.featured ? 1 : 0,
            },
          };
        }
      };

      const validateCategory = (category: string, group: string): boolean => {
        if (!checkIfCategoryInGroup(category, group)) return false;
        if (activeCategoryFilters && activeCategoryFilters.length > 0) {
          return activeCategoryFilters.includes(category);
        }
        return true;
      };

      Object.keys(groupedItems).forEach((group: string) => {
        data[group] = {};
        const items = groupedItems![group];
        if (!isUndefined(items)) {
          items.forEach((item: BaseItem | Item) => {
            if (validateCategory(item.category, group)) {
              addItem(group, item.category, item.subcategory, item);
            }
            if (item.additional_categories) {
              for (const ac of item.additional_categories) {
                if (validateCategory(ac.category, group)) {
                  addItem(group, ac.category, ac.subcategory, item);
                }
              }
            }
          });
        }
      });
    }
    return data;
  }

  public getGridData(withAllOption: boolean): GroupData {
    return this.prepareGridData(this.getGroupedData(), withAllOption);
  }

  public getGroupedData(): { [key: string]: (Item | BaseItem)[] } {
    if (this.allDataGrouped) {
      return this.allDataGrouped;
    } else {
      const grouped = this.groupData(this.ready ? this.getAll() : window.baseDS.items);
      if (this.ready) {
        this.allDataGrouped = grouped;
      }
      return grouped;
    }
  }

  private saveData() {
    const groupedItemsList = this.getGroupedData();
    this.prepareClassifyAndSortOptions(groupedItemsList);
  }

  // Prepare menu options
  private getMenuOptions = (data: unknown, classify: ClassifyOption) => {
    const menu: CardMenu = {};
    let options: string[] = [];
    switch (classify) {
      case ClassifyOption.None:
        return;
      case ClassifyOption.Category:
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
      case ClassifyOption.Maturity:
        options = sortMenuOptions(Object.keys(data as { [key: string]: never }));
        return options.length > 0 ? { Maturity: options } : {};
      case ClassifyOption.Tag:
        options = sortMenuOptions(Object.keys(data as { [key: string]: never }));
        return options.length > 0 ? { Tag: options } : {};
    }
  };

  // Query items
  public queryItems(input: ActiveFilters, activeGroup: string, classify: ClassifyOption) {
    const allGroupedItems = this.getGroupedData();
    // Filter only the active group
    const filteredItems = !isEmpty(input)
      ? filterData(allGroupedItems[activeGroup], input)
      : allGroupedItems[activeGroup];
    const groupedItems = { ...allGroupedItems, [activeGroup]: filteredItems };

    let activeCategoryFilters: string[] | undefined;
    if (classify === ClassifyOption.Category && !isUndefined(input.category) && !isEmpty(input.category)) {
      activeCategoryFilters = input.category;
    }

    const gridData = this.prepareGridData(groupedItems, true, activeCategoryFilters);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classifyCardData: any = {};
    const menuData: { [key: string]: CardMenu | undefined } = {};
    const numItems: { [key: string]: number } = {};

    Object.keys(groupedItems).forEach((group: string) => {
      if (group === activeGroup) {
        // Update group active data
        const classifyGroup = this.classifyItems(
          groupedItems[activeGroup],
          classify,
          activeGroup,
          activeCategoryFilters
        );
        classifyCardData[activeGroup] = classifyGroup;
        menuData[activeGroup] = this.getMenuOptions(classifyGroup, classify);
        numItems[activeGroup] = groupedItems[activeGroup] ? groupedItems[activeGroup].length : 0;
      } else {
        const classifiedOption =
          !isUndefined(this.classifyAndSortOptions) && this.classifyAndSortOptions[group].classify.includes(classify)
            ? classify
            : DEFAULT_CLASSIFY;
        const classifiedGroup = this.classifyItems(allGroupedItems[group], classifiedOption, group);
        classifyCardData[group] = classifiedGroup;
        menuData[group] = this.getMenuOptions(classifiedGroup, classifiedOption);
      }
    });

    return { grid: gridData, card: classifyCardData, menu: menuData, numItems: numItems };
  }

  // Get item by id
  public getItemById(id: string): Item | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.find((i: Item) => id === i.id);
    }
  }

  // Get item by name
  public getItemByName(name: string): Item | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.find((i: Item) => name === i.name);
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

  // Get items with defined maturity status
  public getItemsWithMaturity(): Item[] | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      // Unique items by name with maturity status
      return uniqBy(
        this.landscapeData.items.filter((i: Item) => !isUndefined(i.maturity) && !isUndefined(i.accepted_at)),
        'name'
      );
    }
  }

  // Get items by end user
  public getItemsByEndUser(): Item[] | undefined {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.filter((i: Item) => i.enduser && window.baseDS.members_category === i.category);
    }
  }

  // Get maturity options
  public getMaturityOptions(): string[] {
    const maturity = window.baseDS.items.map((i: Item) => i.maturity);
    return uniq(compact(maturity)) || [];
  }

  // Get license options
  public getLicenseOptionsPerGroup(group: string): string[] {
    if (this.ready && this.landscapeData && this.landscapeData.items) {
      const allGroupedItems = this.getGroupedData();
      const options: string[] = [];
      if (!isUndefined(allGroupedItems[group])) {
        allGroupedItems[group].forEach((i: Item) => {
          if (i.repositories) {
            i.repositories.forEach((r: Repository) => {
              if (r.github_data) {
                options.push(r.github_data!.license);
              }
            });
          }
        });
      }
      return uniq(compact(options));
    }
    return [];
  }

  public getLogoItem(itemName: string, category?: string, subcategory?: string): string | undefined | null {
    let item: Item | undefined = window.baseDS.items.find((i: Item) => i.name === itemName && i.category === category);
    if (!isUndefined(subcategory) && !isUndefined(category)) {
      item = window.baseDS.items.find(
        (i: Item) =>
          i.name.toLowerCase() === itemName.toLowerCase() &&
          i.category.toLowerCase() === category.toLowerCase() &&
          i.subcategory.toLowerCase() === subcategory.toLowerCase()
      );
    } else if (!isUndefined(category)) {
      item = window.baseDS.items.find(
        (i: Item) =>
          i.name.toLowerCase() === itemName.toLowerCase() && i.category.toLowerCase() === category.toLowerCase()
      );
    } else {
      item = window.baseDS.items.find((i: Item) => i.name.toLowerCase() === itemName.toLowerCase());
    }
    if (item) {
      return item.logo;
    } else {
      return null;
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

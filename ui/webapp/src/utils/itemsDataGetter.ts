import { capitalizeFirstLetter, type ClassificationOption, type FullDataset, joinFullDataset } from 'common';
import groupBy from 'lodash/groupBy';
import intersection from 'lodash/intersection';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import mapValues from 'lodash/mapValues';
import reduce from 'lodash/reduce';
import some from 'lodash/some';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';

import { ALL_OPTION, DEFAULT_CLASSIFY } from '../data';
import {
  ActiveFilters,
  ActiveSection,
  AdditionalCategory,
  BaseData,
  BaseItem,
  CardMenu,
  Category,
  ClassifyOption,
  FilterOption,
  Group,
  Item,
  LandscapeItem,
  SortOption,
  Subcategory,
} from '../types';
import checkIfCategoryInGroup from './checkIfCategoryInGroup';
import filterData from './filterData';
import getRepositoryLicenses from './getRepositoryLicenses';
import search from './search';
import sortCategoriesByGroupOrder from './sortCategoriesByGroupOrder';
import sortMenuOptions from './sortMenuOptions';
import sortSubcategories from './sortSubcategories';

export interface ItemsDataStatus {
  updateStatus(status: ItemsDataLoadStatus): void;
}

export type ItemsDataLoadStatus = 'error' | 'loading' | 'ready';

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
  items: LandscapeItem[];
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

/** Items of each subcategory, keyed by category and subcategory names. */
export type CategorizedItems = { [category: string]: { [subcategory: string]: LandscapeItem[] } };

/** Items of each classification option (maturity level or TAG), keyed by the option. */
export type ItemsByOption = { [option: string]: LandscapeItem[] };

/** Card view data of each classify option. */
export interface CardDataByClassify {
  [ClassifyOption.None]: LandscapeItem[];
  [ClassifyOption.Category]: CategorizedItems;
  [ClassifyOption.Maturity]: ItemsByOption;
  [ClassifyOption.TAG]: ItemsByOption;
}

/** Card view data of a group, whose shape depends on the classify option. */
export type CardData = CardDataByClassify[ClassifyOption];

/** Full dataset with the Crunchbase and GitHub data joined into its items. */
type JoinedFullDataset = Omit<FullDataset, 'items'> & { items: Item[] };

/** Items of each group, keyed by the group normalized name (plus the all option). */
type GroupedItems = { [key: string]: LandscapeItem[] };

/** Classified items of a group and the menu built from them. */
interface ClassifiedGroup {
  card: CardData;
  menu: CardMenu | undefined;
}

/** Loads the full dataset and serves the grouped, classified and filtered items the views read. */
export class ItemsDataGetter {
  private status: ItemsDataLoadStatus = 'loading';
  private subscribers: Set<ItemsDataStatus> = new Set();
  private pendingRequest?: Promise<void>;
  private groups: string[] | undefined;
  private landscapeData?: JoinedFullDataset;
  private itemsById: Map<string, Item> = new Map();
  private itemsByName: Map<string, Item> = new Map();
  private classifyAndSortOptions: { [key: string]: ClassifyAndSortOptions } | undefined;
  private allDataGrouped: GroupedItems | undefined;
  // Grouping of the base data used until the full data is ready, with the base dataset it was built from
  private baseDataGrouped: { grouped: GroupedItems; source: BaseData } | undefined;
  // Classification of the unfiltered groups, keyed by group and classify option
  private classifiedGroups: Map<string, ClassifiedGroup> = new Map();
  // Base items of each subcategory, with the base dataset they were indexed from
  private baseItemsBySubcategory: { index: Map<string, BaseItem[]>; source: BaseData } | undefined;

  /**
   * Subscribes to the full data loading status changes.
   * @param subscriber - Receives each new status
   * @returns A function that removes the subscription
   */
  public subscribe(subscriber: ItemsDataStatus): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private setStatus(status: ItemsDataLoadStatus) {
    this.status = status;
    this.subscribers.forEach((subscriber) => subscriber.updateStatus(status));
  }

  /** Loads the full dataset, or uses the one given (overlay), unless it is ready or loading. */
  public init(landscapeData?: FullDataset) {
    if (this.status === 'ready' || this.pendingRequest) return;

    this.setStatus('loading');
    if (landscapeData) {
      this.prepareGroups();
      this.initialDataPreparation(landscapeData);
      return;
    }

    this.pendingRequest = this.loadData().finally(() => {
      this.pendingRequest = undefined;
    });
  }

  private async loadData(): Promise<void> {
    try {
      const response = await fetch(
        import.meta.env.MODE === 'development' ? '../../static/data/full.json' : './data/full.json'
      );
      if (!response.ok) {
        throw new Error(`Unable to load full data: ${response.status}`);
      }

      const data = (await response.json()) as FullDataset;
      this.initialDataPreparation(data);
    } catch {
      this.setStatus('error');
    }
  }

  /** Prepares the groups that have categories in the base dataset, resetting the cached groupings. */
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
        if (!isUndefined(g.normalized_name) && intersection(categories, g.categories).length > 0) {
          groups.push(g.normalized_name);
        }
      });
      this.groups = groups;
    }
    // The cached groupings depend on the groups
    this.baseDataGrouped = undefined;
    this.classifiedGroups.clear();
  }

  /** Returns the normalized names of the groups with categories, `undefined` when the landscape has no groups. */
  public getGroups(): string[] | undefined {
    return this.groups;
  }

  private initialDataPreparation(data: FullDataset) {
    const extendedItems = joinFullDataset(data);
    // Search engine initialization
    search.init(extendedItems);
    this.landscapeData = {
      ...data,
      items: extendedItems,
    };
    // Items indexes, keeping the first item when several share a name
    this.itemsById = new Map();
    this.itemsByName = new Map();
    extendedItems.forEach((item: Item) => {
      if (!this.itemsById.has(item.id)) {
        this.itemsById.set(item.id, item);
      }
      if (!this.itemsByName.has(item.name)) {
        this.itemsByName.set(item.name, item);
      }
    });
    // Subscribers read the grouped data and the options as soon as they are notified
    this.saveData();
    this.setStatus('ready');
  }

  /** Checks whether the full dataset is ready. */
  public isReady(): boolean {
    return this.status === 'ready';
  }

  /** Return the current full-data loading status. */
  public getStatus(): ItemsDataLoadStatus {
    return this.status;
  }

  /** Returns every item of the full dataset (none until it is ready). */
  public getAll(): Item[] {
    if (this.isReady() && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items;
    }
    return [];
  }

  /** Returns the Crunchbase data of the full dataset (`undefined` until it is ready). */
  public getCrunchbaseData(): FullDataset['crunchbase_data'] {
    if (this.isReady() && this.landscapeData && this.landscapeData.crunchbase_data) {
      return this.landscapeData.crunchbase_data;
    }
    return undefined;
  }

  /** Returns the categories with only their subcategories that have items, in base dataset order. */
  public getCategoriesAndSubcategoriesWithItems(): Category[] {
    const categoriesToKeep: { [key: string]: string[] } = {};
    (window.baseDS.items ?? []).forEach((i: BaseItem) => {
      if (categoriesToKeep[i.category]) {
        if (!categoriesToKeep[i.category].includes(i.subcategory)) {
          categoriesToKeep[i.category].push(i.subcategory);
        }
      } else {
        categoriesToKeep[i.category] = [i.subcategory];
      }
      // Add additional categories
      if (i.additional_categories) {
        i.additional_categories.forEach((ac: AdditionalCategory) => {
          if (categoriesToKeep[ac.category]) {
            if (!categoriesToKeep[ac.category].includes(ac.subcategory)) {
              categoriesToKeep[ac.category].push(ac.subcategory);
            }
          } else {
            categoriesToKeep[ac.category] = [ac.subcategory];
          }
        });
      }
    });

    const categoriesWithItems: Category[] = [];
    (window.baseDS.categories ?? []).forEach((c: Category) => {
      // Check if the category is in the list of valid categories
      // and if it has subcategories
      if (categoriesToKeep[c.name] && c.subcategories.length > 0) {
        const subcategoriesWithItems: Subcategory[] = [];
        c.subcategories.forEach((s: Subcategory) => {
          if (categoriesToKeep[c.name].includes(s.name)) {
            subcategoriesWithItems.push(s);
          }
        });
        // Check if the category has subcategories with items
        if (subcategoriesWithItems.length > 0) {
          categoriesWithItems.push({ ...c, subcategories: subcategoriesWithItems });
        }
      }
    });

    return categoriesWithItems;
  }

  // Group items
  private groupData(items: LandscapeItem[]): GroupedItems {
    const gData = groupBy(items, 'category');
    const additionalItems: { [key: string]: LandscapeItem[] } = {};
    const itemsWithAdditionalCategories = items.filter((i: LandscapeItem) => !isUndefined(i.additional_categories));
    itemsWithAdditionalCategories.forEach((item: LandscapeItem) => {
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
    const groupedItems: GroupedItems = {};

    for (const group of groups) {
      // Check if the group is in the list of valid groups
      if (!isUndefined(group.normalized_name) && this.groups && this.groups.includes(group.normalized_name)) {
        const itemsTmp: LandscapeItem[] = [];
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
        groupedItems[group.normalized_name] = uniqBy(itemsTmp, 'id');
      }
    }
    groupedItems[ALL_OPTION] = [...items];

    return groupedItems;
  }

  private getClassifyAndSortOptionsPerGroup = (items: LandscapeItem[]): ClassifyAndSortOptions => {
    const classify: ClassifyOption[] = [ClassifyOption.None, ClassifyOption.Category];
    const sort: SortOption[] = [SortOption.Name];

    if (some(items, (i) => !isUndefined(i.maturity))) {
      classify.push(ClassifyOption.Maturity);
    }
    if (some(items, (i) => !isUndefined(i.tag) && i.tag.length > 0)) {
      classify.push(ClassifyOption.TAG);
    }

    if (some(items, (i) => !isUndefined(i.repositories))) {
      sort.push(SortOption.Stars);
      sort.push(SortOption.FirstCommit);
      sort.push(SortOption.LatestCommit);
      sort.push(SortOption.Contributors);
    }

    if (some(items, (i) => !isUndefined(i.accepted_at) || !isUndefined(i.joined_at))) {
      sort.push(SortOption.DateAdded);
    }

    if (some(items, (i) => !isUndefined(i.crunchbase_data))) {
      sort.push(SortOption.Funding);
    }

    return { classify, sort };
  };

  private prepareClassifyAndSortOptions(groupedItems: { [key: string]: LandscapeItem[] }): void {
    const options: { [key: string]: ClassifyAndSortOptions } = {};

    Object.keys(groupedItems).forEach((group: string) => {
      options[group] = this.getClassifyAndSortOptionsPerGroup(groupedItems[group]);
    });

    this.classifyAndSortOptions = options;
  }

  /** Returns the classify and sort options available in each group. */
  public getClassifyAndSortOptions(): { [key: string]: ClassifyAndSortOptions } {
    return this.classifyAndSortOptions || {};
  }

  private classifyItemsByCatAndSub(
    items: LandscapeItem[],
    group: string,
    activeCategoryFilters?: string[]
  ): CategorizedItems {
    const categorizedItems: CategorizedItems = {};
    items.forEach((item: LandscapeItem) => this.addToCategory(categorizedItems, item, group, activeCategoryFilters));
    return categorizedItems;
  }

  // Add an item to each of its primary and additional subcategories that belong to the
  // group and match the active category filters
  private addToCategory(
    categorizedItems: CategorizedItems,
    item: LandscapeItem,
    group: string,
    activeCategoryFilters?: string[]
  ): void {
    const sections = [
      { category: item.category, subcategory: item.subcategory },
      ...(item.additional_categories ?? []),
    ];
    sections.forEach(({ category, subcategory }) => {
      const filteredOut =
        !isUndefined(activeCategoryFilters) &&
        activeCategoryFilters.length > 0 &&
        !activeCategoryFilters.includes(category);
      if (!checkIfCategoryInGroup(category, group) || filteredOut) return;

      const preparedItem = this.prepareItemForCategory(item, category, subcategory, activeCategoryFilters);
      ((categorizedItems[category] ??= {})[subcategory] ??= []).push(preparedItem);
    });
  }

  // Align item metadata with the category view consuming this entry
  private prepareItemForCategory(
    item: LandscapeItem,
    category: string,
    subcategory: string,
    activeCategoryFilters?: string[]
  ): LandscapeItem {
    const categoryFilters =
      !isUndefined(activeCategoryFilters) && activeCategoryFilters.length > 0 ? activeCategoryFilters : undefined;
    const shouldFilterAdditionalCategories = !isUndefined(categoryFilters);

    const filteredAdditionalCategories =
      categoryFilters && item.additional_categories
        ? item.additional_categories.filter((additionalCategory: AdditionalCategory) =>
            categoryFilters.includes(additionalCategory.category)
          )
        : item.additional_categories;

    const requiresClone =
      item.category !== category || item.subcategory !== subcategory || shouldFilterAdditionalCategories;

    if (!requiresClone) {
      return item;
    }

    const preparedItem: LandscapeItem = {
      ...item,
      category,
      subcategory,
    };

    if (shouldFilterAdditionalCategories) {
      if (!isUndefined(filteredAdditionalCategories) && filteredAdditionalCategories.length > 0) {
        preparedItem.additional_categories = filteredAdditionalCategories;
      } else {
        delete preparedItem.additional_categories;
      }
    }

    return preparedItem;
  }

  // Group items by tags (considering items can have multiple tags)
  private groupByTags(items: LandscapeItem[]): ItemsByOption {
    return reduce(
      items,
      (acc: ItemsByOption, item) => {
        const tags = item.tag && item.tag.length > 0 ? item.tag : ['undefined']; // Assign to 'undefined' tag if no tags are present

        tags.forEach((tag) => {
          (acc[tag] ||= []).push(item);
        });

        return acc;
      },
      {}
    );
  }

  /**
   * Classifies the items of a group for the Card view.
   * @param items - Items to classify
   * @param classify - Classify option, which sets the shape of the result
   * @param group - Group the items belong to
   * @param activeCategoryFilters - Active category filters, which also filter the additional categories
   * @returns The items as a list, by category and subcategory, or by maturity level or TAG
   */
  public classifyItems<T extends ClassifyOption>(
    items: LandscapeItem[],
    classify: T,
    group: string,
    activeCategoryFilters?: string[]
  ): CardDataByClassify[T] {
    const classifiers: { [K in ClassifyOption]: () => CardDataByClassify[K] } = {
      [ClassifyOption.None]: () => items,
      [ClassifyOption.Category]: () => this.classifyItemsByCatAndSub(items, group, activeCategoryFilters),
      [ClassifyOption.Maturity]: () => groupBy(items, 'maturity'),
      [ClassifyOption.TAG]: () => this.groupByTags(items),
    };
    return classifiers[classify]();
  }

  // Prepare grid data
  private prepareGridData(grouped: GroupedItems, withAllOption: boolean, activeCategoryFilters?: string[]): GroupData {
    const data: GroupData = {};
    Object.keys(grouped).forEach((group: string) => {
      if (!withAllOption && group === ALL_OPTION) return;

      data[group] = mapValues(
        this.classifyItemsByCatAndSub(grouped[group] ?? [], group, activeCategoryFilters),
        (subcategories) =>
          mapValues(subcategories, (items) => ({
            items,
            itemsCount: items.length,
            itemsFeaturedCount: items.filter((item: LandscapeItem) => item.featured).length,
          }))
      );
    });

    return this.sortSubcategoriesInGridData(data);
  }

  private sortSubcategoriesInGridData = (data: GroupData): GroupData => {
    const sortedData: GroupData = {};

    Object.keys(data).forEach((group: string) => {
      sortedData[group] = {};
      sortCategoriesByGroupOrder(Object.keys(data[group]), group).forEach((category: string) => {
        const isOverridden =
          !isUndefined(window.baseDS.categories_overridden) && window.baseDS.categories_overridden.includes(category);
        if (!isOverridden) {
          sortedData[group][category] = data[group][category];
        } else {
          const currentCategory = (window.baseDS.categories ?? []).find((c: Category) => c.name === category);
          if (currentCategory && currentCategory.subcategories) {
            const subcategories = currentCategory.subcategories.map((s: Subcategory) => s.name);
            const sortedSubcategories: { [key: string]: SubcategoryData } = {};
            subcategories.forEach((subcat: string) => {
              if (data[group][category][subcat]) {
                sortedSubcategories[subcat] = data[group][category][subcat];
              }
            });
            sortedData[group][category] = sortedSubcategories;
          } else {
            sortedData[group][category] = data[group][category];
          }
        }
      });
    });

    return sortedData;
  };

  /** Returns the Grid view data of every group, with the all option when asked. */
  public getGridData(withAllOption: boolean): GroupData {
    return this.prepareGridData(this.getGroupedData(), withAllOption);
  }

  /** Returns the items of each group: the full items once ready, the base items until then. */
  public getGroupedData(): GroupedItems {
    if (this.allDataGrouped) {
      return this.allDataGrouped;
    }

    // Until the full data is ready, the base data grouping is built once per base dataset
    if (isUndefined(this.baseDataGrouped) || this.baseDataGrouped.source !== window.baseDS) {
      this.baseDataGrouped = { grouped: this.groupData(window.baseDS.items ?? []), source: window.baseDS };
      this.classifiedGroups.clear();
    }
    return this.baseDataGrouped.grouped;
  }

  private saveData() {
    // The full data grouping replaces the base data one
    this.allDataGrouped = this.groupData(this.landscapeData?.items ?? []);
    this.baseDataGrouped = undefined;
    this.classifiedGroups.clear();
    this.prepareClassifyAndSortOptions(this.allDataGrouped);
  }

  // Classify an unfiltered group, reusing the result while the grouped data doesn't change
  private getClassifiedGroup(items: LandscapeItem[], classify: ClassifyOption, group: string): ClassifiedGroup {
    const key = `${group}:${classify}`;
    let classifiedGroup = this.classifiedGroups.get(key);
    if (isUndefined(classifiedGroup)) {
      const card = this.classifyItems(items, classify, group);
      classifiedGroup = { card, menu: this.getMenuOptions(card, classify) };
      this.classifiedGroups.set(key, classifiedGroup);
    }
    return classifiedGroup;
  }

  // Prepare menu options
  private getMenuOptions = (data: CardData, classify: ClassifyOption): CardMenu | undefined => {
    if (classify === ClassifyOption.None || Array.isArray(data)) return;

    if (classify === ClassifyOption.Category) {
      const menu: CardMenu = {};
      Object.keys(data)
        .sort()
        .forEach((category: string) => {
          menu[category] = sortSubcategories(category, Object.keys(data[category]));
        });
      return menu;
    }

    const options = sortMenuOptions(Object.keys(data));
    if (options.length === 0) return {};
    return classify === ClassifyOption.Maturity ? { Maturity: options } : { Tag: options };
  };

  /** Returns the grid data, card data, menu and number of items of each group for the active filters. */
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

    const classifyCardData: { [key: string]: CardData } = {};
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
        // Groups other than the active one are not filtered, so their classification is reused
        const classifiedGroup = this.getClassifiedGroup(allGroupedItems[group], classifiedOption, group);
        classifyCardData[group] = classifiedGroup.card;
        menuData[group] = classifiedGroup.menu;
      }
    });

    return { grid: gridData, card: classifyCardData, menu: menuData, numItems };
  }

  /** Returns the item with the id given (`undefined` until the full data is ready). */
  public getItemById(id: string): Item | undefined {
    return this.itemsById.get(id);
  }

  /** Returns the first item with the name given (`undefined` until the full data is ready). */
  public getItemByName(name: string): Item | undefined {
    return this.itemsByName.get(name);
  }

  /** Returns the items of a subcategory, including those listed in it through an additional category. */
  public getItemsBySection(activeSection: ActiveSection): Item[] | undefined {
    if (this.isReady() && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.filter(
        (i: Item) =>
          (activeSection.subcategory === i.subcategory && activeSection.category === i.category) ||
          i.additional_categories?.some(
            (ac: AdditionalCategory) =>
              ac.category === activeSection.category && ac.subcategory === activeSection.subcategory
          )
      );
    }
  }

  /**
   * Returns the base items of a subcategory, including the items listed in it through
   * an additional category, in base dataset order. The index is built once per base
   * dataset.
   * @param category - Category name
   * @param subcategory - Subcategory name
   * @returns Items of the subcategory (empty when it has none)
   */
  public getItemsBySubcategory(category: string, subcategory: string): BaseItem[] {
    if (isUndefined(this.baseItemsBySubcategory) || this.baseItemsBySubcategory.source !== window.baseDS) {
      this.baseItemsBySubcategory = {
        index: indexItemsBySubcategory(window.baseDS.items ?? []),
        source: window.baseDS,
      };
    }
    return this.baseItemsBySubcategory.index.get(subcategoryKey(category, subcategory)) ?? [];
  }

  /** Returns the items with the maturity level given. */
  public getItemsByMaturity(level: string): Item[] | undefined {
    if (this.isReady() && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.filter((i: Item) => i.maturity === level);
    }
  }

  /** Returns the items with a maturity and an acceptance date, unique by name. */
  public getItemsWithMaturity(): Item[] | undefined {
    if (this.isReady() && this.landscapeData && this.landscapeData.items) {
      // Unique items by name with maturity status
      return uniqBy(
        this.landscapeData.items.filter((i: Item) => !isUndefined(i.maturity) && !isUndefined(i.accepted_at)),
        'name'
      );
    }
  }

  /** Returns the end user items, leaving out the subcategories given. */
  public getItemsByEndUser(excludeSubcategories?: string[]): Item[] | undefined {
    if (this.isReady() && this.landscapeData && this.landscapeData.items) {
      return this.landscapeData.items.filter(
        (i: Item) => i.enduser && (!excludeSubcategories || !excludeSubcategories.includes(i.subcategory))
      );
    }
  }

  /** Returns the maturity options shipped by the base dataset, sorted by name. */
  public getMaturityOptions(): ClassificationOption[] {
    return window.baseDS.maturity_options ?? [];
  }

  /** Returns the TAG options shipped by the base dataset, sorted by name. */
  public getTagOptions(): ClassificationOption[] {
    return window.baseDS.tag_options ?? [];
  }

  /** Returns the repository licenses of the items of a group (none until the full data is ready). */
  public getLicenseOptionsPerGroup(group: string): string[] {
    if (this.isReady() && this.landscapeData && this.landscapeData.items) {
      const allGroupedItems = this.getGroupedData();
      const options = (allGroupedItems[group] ?? []).flatMap((i: LandscapeItem) =>
        getRepositoryLicenses(i.repositories)
      );
      return uniq(options);
    }
    return [];
  }

  /** Returns the logo of the item with the name given (and category and subcategory, when given), `null` when missing. */
  public getLogoItem(itemName: string, category?: string, subcategory?: string): string | undefined | null {
    const items = window.baseDS.items ?? [];
    let item: BaseItem | undefined;
    if (!isUndefined(subcategory) && !isUndefined(category)) {
      item = items.find(
        (i: BaseItem) =>
          i.name.toLowerCase() === itemName.toLowerCase() &&
          i.category.toLowerCase() === category.toLowerCase() &&
          i.subcategory.toLowerCase() === subcategory.toLowerCase()
      );
    } else if (!isUndefined(category)) {
      item = items.find(
        (i: BaseItem) =>
          i.name.toLowerCase() === itemName.toLowerCase() && i.category.toLowerCase() === category.toLowerCase()
      );
    } else {
      item = items.find((i: BaseItem) => i.name.toLowerCase() === itemName.toLowerCase());
    }
    return item ? item.logo : null;
  }

  /** Prepares the option groups of the logos preview page. */
  public prepareLogosOptions(): LogosOptionsGroup[] {
    const options: LogosOptionsGroup[] = [];
    if (this.isReady() && this.landscapeData && this.landscapeData.items) {
      const maturityTypes: string[] = [];
      const categories: CategoryOpt = {};

      for (const i of this.landscapeData.items) {
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
          return { value: c, name: c, suboptions };
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
          {
            value: 'enduser-notsupporters',
            name: 'End user members (excluding End User Supporter and Contributor)',
          },
        ],
      });
    }
    return options;
  }
}

/** Indexes the items by the subcategories they belong to, primary and additional ones. */
const indexItemsBySubcategory = (items: BaseItem[]): Map<string, BaseItem[]> => {
  const index = new Map<string, BaseItem[]>();
  items.forEach((item: BaseItem) => {
    const sections = [
      { category: item.category, subcategory: item.subcategory },
      ...(item.additional_categories ?? []),
    ];
    sections.forEach((section) => {
      const key = subcategoryKey(section.category, section.subcategory);
      const subcategoryItems = index.get(key) ?? [];
      // An item is listed once even when several of its sections are the same subcategory
      if (subcategoryItems[subcategoryItems.length - 1] !== item) {
        subcategoryItems.push(item);
      }
      index.set(key, subcategoryItems);
    });
  });
  return index;
};

/** Builds the index key of a subcategory, which can't collide whatever the names contain. */
const subcategoryKey = (category: string, subcategory: string): string => JSON.stringify([category, subcategory]);

/** Shared items data getter instance. */
const itemsDataGetter = new ItemsDataGetter();
export default itemsDataGetter;

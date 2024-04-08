import isUndefined from 'lodash/isUndefined';
import some from 'lodash/some';

import { BaseItem, ClassifyOption, Item, SortOption } from '../types';
import itemsDataGetter from './itemsDataGetter';

export interface ClassifyAndSortOptions {
  classify: ClassifyOption[];
  sort: SortOption[];
}

const getOptions = (items: (BaseItem | Item)[]): ClassifyAndSortOptions => {
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

const getClassifyAndSortOptions = (): { [key: string]: ClassifyAndSortOptions } => {
  const options: { [key: string]: ClassifyAndSortOptions } = {};

  const groupedItems = itemsDataGetter.getGroupedData();
  Object.keys(groupedItems).forEach((group: string) => {
    options[group] = getOptions(groupedItems[group]);
  });

  return options;
};

export default getClassifyAndSortOptions;

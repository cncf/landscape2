import intersection from 'lodash/intersection';

import { Group } from '../types';

const ALL_GROUP = 'all';

/**
 * Sort category names using the order configured for the selected group.
 */
const sortCategoriesByGroupOrder = (categories: string[], group: string): string[] => {
  if (group === ALL_GROUP || !window.baseDS.groups) {
    return categories;
  }

  const selectedGroup = window.baseDS.groups.find((item: Group) => item.normalized_name === group);
  if (!selectedGroup) {
    return categories;
  }

  const orderedCategories = intersection(selectedGroup.categories, categories);
  const remainingCategories = categories.filter((category: string) => !orderedCategories.includes(category));

  return [...orderedCategories, ...remainingCategories];
};

export default sortCategoriesByGroupOrder;

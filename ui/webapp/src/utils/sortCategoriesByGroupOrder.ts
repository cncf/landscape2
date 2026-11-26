import intersection from 'lodash/intersection';

import { ALL_OPTION } from '../data';
import { Group } from '../types';

/**
 * Sorts category names in the order configured for the selected group: the group
 * categories first, in group order, then the remaining ones in their given order.
 */
const sortCategoriesByGroupOrder = (categories: string[], group: string): string[] => {
  const selectedGroup =
    group === ALL_OPTION ? undefined : window.baseDS.groups?.find((item: Group) => item.normalized_name === group);
  if (!selectedGroup) {
    return categories;
  }

  const orderedCategories = intersection(selectedGroup.categories, categories);
  const remainingCategories = categories.filter((category: string) => !orderedCategories.includes(category));

  return [...orderedCategories, ...remainingCategories];
};

export default sortCategoriesByGroupOrder;

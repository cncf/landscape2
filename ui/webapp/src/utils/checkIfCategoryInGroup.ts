import { ALL_OPTION } from '../data';
import { Group } from '../types';

const checkIfCategoryInGroup = (category: string, group: string): boolean => {
  if (window.baseDS.groups && group !== ALL_OPTION) {
    const selectedGroup = window.baseDS.groups!.find((g: Group) => g.normalized_name === group);
    if (selectedGroup) {
      return selectedGroup.categories.includes(category);
    } else {
      return false;
    }
  } else {
    return true;
  }
};

export default checkIfCategoryInGroup;

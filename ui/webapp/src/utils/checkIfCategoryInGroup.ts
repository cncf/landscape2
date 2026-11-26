import { ALL_OPTION } from '../data';
import { Group } from '../types';

/**
 * Checks whether a category belongs to a group. Every category belongs to the all
 * option and to any group of a landscape without groups; none belongs to an unknown group.
 */
const checkIfCategoryInGroup = (category: string, group: string): boolean => {
  const groups = window.baseDS.groups;
  if (!groups || group === ALL_OPTION) return true;

  return groups.find((g: Group) => g.normalized_name === group)?.categories.includes(category) ?? false;
};

export default checkIfCategoryInGroup;

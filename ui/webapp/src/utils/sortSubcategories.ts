import intersection from 'lodash/intersection';
import isUndefined from 'lodash/isUndefined';

/**
 * Sorts the subcategory names of a category alphabetically, or in the order the
 * landscape defines when the category is in `categories_overridden`.
 *
 * @param category - Category name
 * @param subcategories - Names of the subcategories to sort
 * @returns A new array with the sorted names
 */
const sortSubcategories = (category: string, subcategories: string[]): string[] => {
  const sortedSubcategories = [...subcategories].sort();
  if (!window.baseDS.categories_overridden?.includes(category)) return sortedSubcategories;

  const landscapeCategory = (window.baseDS.categories ?? []).find((c) => c.name === category);
  if (isUndefined(landscapeCategory)) return sortedSubcategories;
  return intersection(
    landscapeCategory.subcategories.map((s) => s.name),
    sortedSubcategories
  );
};

export default sortSubcategories;

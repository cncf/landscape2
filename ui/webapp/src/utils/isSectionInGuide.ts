import isUndefined from 'lodash/isUndefined';

/** Checks whether the guide has a section for the category, or for its subcategory when one is given. */
const isSectionInGuide = (categoryName: string, subcategoryName?: string): boolean => {
  const subcategories = window.baseDS.guide_summary?.[categoryName];
  return !isUndefined(subcategories) && (isUndefined(subcategoryName) || subcategories.includes(subcategoryName));
};

export default isSectionInGuide;

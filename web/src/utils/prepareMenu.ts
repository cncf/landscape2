import isUndefined from 'lodash/isUndefined';

import { CardMenu } from '../types';
import { SubcategoryDetails } from './gridCategoryLayout';
import { CategoriesData } from './itemsDataGetter';

const prepareMenu = (d: CategoriesData, overridenCategories?: string[]): CardMenu => {
  const menuTmp: CardMenu = {};

  Object.keys(d).forEach((cat: string) => {
    const isOverriden = !isUndefined(overridenCategories) && overridenCategories.includes(cat);

    const subcategories: SubcategoryDetails[] = [];
    const subcategoriesList: string[] = [];
    Object.keys(d[cat]).forEach((subcat: string) => {
      if (d[cat][subcat].items.length > 0) {
        subcategoriesList.push(subcat);
        subcategories.push({
          name: subcat,
          itemsCount: d[cat][subcat].itemsCount,
          itemsFeaturedCount: d[cat][subcat].itemsFeaturedCount,
        });
      }
    });

    if (subcategories.length !== 0) {
      const sortedSubcategories: string[] = isOverriden ? subcategoriesList : subcategoriesList.sort();
      menuTmp[cat] = sortedSubcategories;
    }
  });
  return menuTmp;
};

export default prepareMenu;

import isUndefined from 'lodash/isUndefined';

import { Category, Subcategory } from '../types';

interface NameResult {
  category: string;
  subcategory?: string;
}

const getName = (text: string): NameResult | null => {
  const parts = text.split('--');
  const selectedCat = window.baseDS.categories.find((cat: Category) => cat.normalized_name === parts[0]);
  if (!isUndefined(selectedCat)) {
    if (parts.length === 2) {
      const selectedSubcat = selectedCat.subcategories.find(
        (subcat: Subcategory) => subcat.normalized_name === parts[1]
      );
      if (!isUndefined(selectedSubcat)) {
        return { category: selectedCat.name, subcategory: selectedSubcat.name };
      } else {
        return null;
      }
    } else {
      return { category: selectedCat.name };
    }
  } else {
    return null;
  }
};

export default getName;

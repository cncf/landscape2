import isUndefined from 'lodash/isUndefined';

import { Category, Subcategory } from '../types';

interface Name {
  title: string;
  subtitle?: string;
  grouped?: boolean;
}

const REGEX = /\//g;
const REGEX_1 = /[^\w\s-]/g;
const REGEX_2 = /[\s_-]+/g;
const REGEX_3 = /^-+|-+$/g;

const slugify = (text: string): string => {
  return text.toLowerCase().trim().replace(REGEX, '-').replace(REGEX_1, '').replace(REGEX_2, '-').replace(REGEX_3, '');
};

const getNormalizedName = (opt: Name): string => {
  const selectedCat = window.baseDS.categories.find((cat: Category) => cat.name === opt.title);

  if (!isUndefined(selectedCat)) {
    if (isUndefined(opt.subtitle)) {
      return selectedCat.normalized_name;
    } else {
      const selectedSubcat = selectedCat.subcategories.find((subcat: Subcategory) => subcat.name === opt.subtitle);
      if (!isUndefined(selectedSubcat)) {
        if (isUndefined(opt.grouped) || !opt.grouped) {
          return selectedSubcat.normalized_name;
        } else {
          return `${selectedCat.normalized_name}--${selectedSubcat.normalized_name}`;
        }
      } else {
        return `${slugify(opt.title)}--${slugify(opt.subtitle)}`;
      }
    }
  } else {
    return `${slugify(opt.title)}${!isUndefined(opt.subtitle) ? `--${slugify(opt.subtitle)}` : ''}`;
  }
};

export default getNormalizedName;

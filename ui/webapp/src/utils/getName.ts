import { Category, Subcategory } from '../types';

interface NameResult {
  category: string;
  subcategory?: string;
}

/**
 * Resolves the category and subcategory names of an anchor id (`category` or
 * `category--subcategory`), `null` when the id names an unknown category or subcategory.
 */
const getName = (text: string): NameResult | null => {
  const parts = text.split('--');
  const category = (window.baseDS.categories ?? []).find((cat: Category) => cat.normalized_name === parts[0]);
  if (!category) return null;
  if (parts.length !== 2) return { category: category.name };

  const subcategory = category.subcategories.find((subcat: Subcategory) => subcat.normalized_name === parts[1]);
  return subcategory ? { category: category.name, subcategory: subcategory.name } : null;
};

export default getName;

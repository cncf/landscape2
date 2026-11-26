/** Key of the embed views that include every maturity or TAG option. */
export const ALL_OPTIONS_EMBED_KEY = 'all';

// Separator of the categories in the embed key of a multi-category view
const MULTI_CATEGORY_KEY_SEPARATOR = '__';

/** Entry carrying the normalized name shipped in the datasets. */
interface NormalizedEntry {
  normalized_name: string;
}

/** Selection an embed view key is built from. */
export type EmbedKeySelection =
  | { classify: 'category'; category: NormalizedEntry; subcategory?: NormalizedEntry }
  | { classify: 'maturity' | 'tag'; option?: NormalizedEntry };

/**
 * Builds the key of the embed view matching the selection provided. Keys only
 * use the normalized names shipped in the datasets, so they match the embed
 * files written by the build (`embed_<classify>_<key>.json`).
 *
 * @param selection - Category (and optional subcategory), or maturity/TAG option (none for all options)
 * @returns `category--subcategory` or `category` for categories, the option normalized name or `all` otherwise
 */
export const buildEmbedKey = (selection: EmbedKeySelection): string => {
  if (selection.classify === 'category') {
    const { category, subcategory } = selection;
    return subcategory ? `${category.normalized_name}--${subcategory.normalized_name}` : category.normalized_name;
  }
  return selection.option?.normalized_name ?? ALL_OPTIONS_EMBED_KEY;
};

/**
 * Builds the key of a multi-category embed view. The embed sends it in the
 * item details messages, so embed-item can tell which view an item came from.
 *
 * @param categories - Normalized names of the categories of the view, in order
 * @returns The categories joined with `__` (e.g. `category-1__category-2`)
 */
export const buildMultiCategoryKey = (categories: readonly string[]): string =>
  categories.join(MULTI_CATEGORY_KEY_SEPARATOR);

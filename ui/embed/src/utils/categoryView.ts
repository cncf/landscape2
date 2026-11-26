import type { Category, Classification, EmbedItem, EmbedView } from 'common/types';

// Value of the subcategories selection that stands for every subcategory
const ALL_SUBCATEGORIES = 'all';

/** Category classification of an embed view. */
export type CategoryClassification = Extract<Classification, { category: Category }>;

/**
 * Removes the repeated items of a list, keeping the first item with each id.
 *
 * @param items - Items to deduplicate
 * @returns A new list with one item per id, in the original order
 */
export const dedupeItemsById = (items: EmbedItem[]): EmbedItem[] => {
  const seenIds = new Set<string>();
  return items.filter((item) => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
};

/**
 * Narrows a category embed view: keeps only the selected subcategories, and
 * the items listed (directly or through an additional category) in one of
 * them. A selection that is empty, `all` or names no subcategory of the view
 * keeps the view as it is, as do views of other classifications.
 *
 * @param view - Embed view to narrow
 * @param selection - Normalized names of the selected subcategories
 * @returns The narrowed view
 */
export const filterBySelectedSubcategories = (view: EmbedView, selection: readonly string[]): EmbedView => {
  const classification = getCategoryClassification(view);
  if (!classification) return view;

  const selectedNames = new Set(selection.filter((value) => value !== '' && value !== ALL_SUBCATEGORIES));
  const { category } = classification;
  const subcategories = category.subcategories.filter((subcategory) => selectedNames.has(subcategory.normalized_name));
  if (subcategories.length === 0) return view;

  // Subcategory names are only unique within a category, so the category is checked too
  const allowedNames = new Set(subcategories.map((subcategory) => subcategory.name));
  const isAllowed = (categoryName: string, subcategoryName: string) =>
    categoryName === category.name && allowedNames.has(subcategoryName);

  return {
    ...view,
    classification: { category: { ...category, subcategories } },
    items: view.items.filter(
      (item) =>
        isAllowed(item.category, item.subcategory) ||
        (item.additional_categories ?? []).some((additional) => isAllowed(additional.category, additional.subcategory))
    ),
  };
};

/**
 * Selects the items listed in a subcategory, directly or through an
 * additional category. Items listed through an additional category are
 * aligned with the subcategory (see `prepareItemForCategoryView`).
 *
 * @param items - Items of the view
 * @param categoryName - Name of the category
 * @param subcategoryName - Name of the subcategory
 * @returns The items listed in the subcategory, in the original order
 */
export const filterItemsBySubcategory = (
  items: EmbedItem[],
  categoryName: string,
  subcategoryName: string
): EmbedItem[] =>
  items.flatMap((item) => {
    if (item.category === categoryName && item.subcategory === subcategoryName) return [item];
    const isListedThroughAdditionalCategory = (item.additional_categories ?? []).some(
      (additional) => additional.category === categoryName && additional.subcategory === subcategoryName
    );
    return isListedThroughAdditionalCategory ? [prepareItemForCategoryView(item, categoryName, subcategoryName)] : [];
  });

/**
 * Returns the category classification of an embed view.
 *
 * @param view - Embed view
 * @returns The classification, or `null` when the view is not a category one
 */
export const getCategoryClassification = (view: EmbedView): CategoryClassification | null =>
  'category' in view.classification ? view.classification : null;

/**
 * Aligns an item with the category view rendering it: the item takes that
 * category and subcategory, and its primary ones move to the additional
 * categories (without repeating any entry).
 *
 * @param item - Item to align
 * @param categoryName - Name of the category the view renders
 * @param subcategoryName - Name of the subcategory the view renders
 * @returns The item as it is when it is already listed there, or an aligned copy
 */
export const prepareItemForCategoryView = (
  item: EmbedItem,
  categoryName: string,
  subcategoryName: string
): EmbedItem => {
  if (item.category === categoryName && item.subcategory === subcategoryName) return item;

  const additionalCategories = [
    { category: item.category, subcategory: item.subcategory },
    ...(item.additional_categories ?? []).filter(
      (additional) => additional.category !== categoryName || additional.subcategory !== subcategoryName
    ),
  ].filter(
    (additional, index, entries) =>
      entries.findIndex(
        (entry) => entry.category === additional.category && entry.subcategory === additional.subcategory
      ) === index
  );

  return {
    ...item,
    additional_categories: additionalCategories,
    category: categoryName,
    subcategory: subcategoryName,
  };
};

/**
 * Sorts items by name, ignoring case.
 *
 * @param items - Items to sort
 * @returns A new sorted list (the input is left untouched)
 */
export const sortItemsByName = (items: EmbedItem[]): EmbedItem[] =>
  [...items].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

import { BaseItem, Featured, FeaturedItemRule, Item } from '../types';

/**
 * Checks if an item should be featured for the given group.
 * Looks up exclusion rules from the featured_items configuration.
 *
 * @param item - The item to check
 * @param group - The current active group (undefined if no group selected)
 * @param featuredItems - The featured items rules configuration
 */
export const isItemFeaturedForGroup = (
  item: BaseItem | Item,
  group: string | undefined,
  featuredItems: FeaturedItemRule[] | undefined
): Featured | undefined => {
  if (!item.featured) return undefined;
  if (!group || !featuredItems) return item.featured;

  // Find the rule that applies to this item (by maturity or subcategory)
  for (const rule of featuredItems) {
    const matchingOption = rule.options.find((opt) => {
      if (rule.field === 'maturity') return opt.value === item.maturity;
      if (rule.field === 'subcategory') return opt.value === item.subcategory;
      return false;
    });

    if (matchingOption) {
      // If any matching rule excludes the current group, item is not featured
      if (rule.exclude?.groups?.includes(group)) {
        return undefined;
      }
      // Continue checking other rules - any exclusion should suppress featured
    }
  }

  return item.featured;
};

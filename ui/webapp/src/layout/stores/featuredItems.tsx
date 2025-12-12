import isUndefined from 'lodash/isUndefined';
import { createMemo } from 'solid-js';

import { BaseItem, Item } from '../../types';
import { isItemFeaturedForGroup } from '../../utils/isItemFeaturedForGroup';
import { useGroupActive } from './groupActive';

export const useFeaturedItems = () => {
  const selectedGroup = useGroupActive();

  // Get featured items rules configuration.
  const rules = () => window.baseDS?.featured_items;

  // Get the display name for the active group (config uses display names, not normalized).
  // Memoized to avoid repeated lookups when processing multiple items.
  const activeGroupName = createMemo(() => {
    const normalized = selectedGroup();
    if (!normalized) return undefined;
    return window.baseDS?.groups?.find((g) => g.normalized_name === normalized)?.name;
  });

  // Check if any featured item exclusion rules affect the current active group.
  // Memoized to avoid repeated checks when processing multiple items.
  const activeGroupHasFeaturedExclusions = createMemo(() => {
    const groupName = activeGroupName();
    if (!groupName || !rules()) return false;
    return rules()!.some((rule) => rule.exclude?.groups?.includes(groupName));
  });

  // Get effective featured status for an item considering group exclusions.
  const getEffectiveFeatured = (item: BaseItem | Item) => {
    if (!activeGroupHasFeaturedExclusions()) return item.featured;
    return isItemFeaturedForGroup(item, activeGroupName(), rules());
  };

  // Transform items array with effective featured status (for ItemsList).
  const withEffectiveFeatured = (items: (BaseItem | Item)[]) => {
    if (!activeGroupHasFeaturedExclusions()) return items;
    return items.map((item) => {
      const effectiveFeatured = getEffectiveFeatured(item);
      if (effectiveFeatured !== item.featured) {
        return { ...item, featured: effectiveFeatured };
      }
      return item;
    });
  };

  // Count featured items considering exclusions (for Grid).
  const countFeaturedItems = (items: (BaseItem | Item)[]) => {
    if (!activeGroupHasFeaturedExclusions()) {
      return items.filter((item) => !isUndefined(item.featured)).length;
    }
    return items.filter((item) => !isUndefined(getEffectiveFeatured(item))).length;
  };

  return {
    activeGroupHasFeaturedExclusions,
    countFeaturedItems,
    getEffectiveFeatured,
    rules,
    withEffectiveFeatured,
  };
};

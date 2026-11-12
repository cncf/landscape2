import isUndefined from 'lodash/isUndefined';

import { LandscapeItem } from '../../types';
import { useGroupActive } from './groupActive';

/**
 * Exposes the featured information of the items for the active group. Rust
 * resolves the featured rules at build time, so an item is featured unless the
 * active group is one of its `featured.excluded_groups`.
 */
export const useFeaturedItems = () => {
  const selectedGroup = useGroupActive();

  // Get the featured information of the item for the active group.
  const getEffectiveFeatured = (item: LandscapeItem) => {
    if (item.featured?.excluded_groups?.includes(selectedGroup())) {
      return undefined;
    }
    return item.featured;
  };

  // Transform items array with effective featured status (for ItemsList).
  const withEffectiveFeatured = (items: LandscapeItem[]) =>
    items.map((item) => {
      const effectiveFeatured = getEffectiveFeatured(item);
      return effectiveFeatured === item.featured ? item : { ...item, featured: effectiveFeatured };
    });

  // Count featured items for the active group (for Grid).
  const countFeaturedItems = (items: LandscapeItem[]) =>
    items.filter((item) => !isUndefined(getEffectiveFeatured(item))).length;

  return {
    countFeaturedItems,
    getEffectiveFeatured,
    withEffectiveFeatured,
  };
};

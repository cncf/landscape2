import isUndefined from 'lodash/isUndefined';
import { createContext, ParentComponent, useContext } from 'solid-js';

import { LandscapeItem } from '../../types';
import { useGroupActive } from './groupActive';

// Group whose featured information the items rendered below use, instead of the active group
const FeaturedGroupContext = createContext<() => string | undefined>();

/**
 * Gives the items below the featured information of the group provided, so the
 * groups kept mounted while hidden don't change when the active group changes.
 */
export const FeaturedGroupProvider: ParentComponent<{ group?: string }> = (props) => {
  const group = () => props.group;
  return <FeaturedGroupContext.Provider value={group}>{props.children}</FeaturedGroupContext.Provider>;
};

/**
 * Exposes the featured information of the items for the group provided, else the
 * active group. Rust resolves the featured rules at build time, so an item is
 * featured unless the group is one of its `featured.excluded_groups`.
 */
export const useFeaturedItems = () => {
  const activeGroup = useGroupActive();
  const providedGroup = useContext(FeaturedGroupContext);
  const group = () => providedGroup?.() ?? activeGroup();

  // Get the featured information of the item for the group.
  const getEffectiveFeatured = (item: LandscapeItem) => {
    if (item.featured?.excluded_groups?.includes(group())) {
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

  // Count featured items for the group (for Grid).
  const countFeaturedItems = (items: LandscapeItem[]) =>
    items.filter((item) => !isUndefined(getEffectiveFeatured(item))).length;

  return {
    countFeaturedItems,
    getEffectiveFeatured,
    withEffectiveFeatured,
  };
};

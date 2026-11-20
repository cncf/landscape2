import isUndefined from 'lodash/isUndefined';
import { createContext, ParentComponent, useContext } from 'solid-js';

import { LandscapeItem } from '../../types';
import { useGroupActive } from './groupActive';

// Group whose featured information the items rendered below use, instead of the active group
const FeaturedGroupContext = createContext<() => string | undefined>();

// Copy without featured information of each item not featured in a group. The same copy is
// reused for every group and call, so lists compared by item identity keep their rendered items
const unfeaturedCopies = new WeakMap<LandscapeItem, LandscapeItem>();

/** Returns the copy of the item without featured information, created once per item. */
const getUnfeaturedCopy = (item: LandscapeItem): LandscapeItem => {
  let copy = unfeaturedCopies.get(item);
  if (isUndefined(copy)) {
    copy = { ...item, featured: undefined };
    unfeaturedCopies.set(item, copy);
  }
  return copy;
};

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

  // Transform items array with effective featured status (for ItemsList). The items not
  // featured in the group are replaced by the same copy on every call
  const withEffectiveFeatured = (items: LandscapeItem[]) =>
    items.map((item) => (getEffectiveFeatured(item) === item.featured ? item : getUnfeaturedCopy(item)));

  // Count featured items for the group (for Grid).
  const countFeaturedItems = (items: LandscapeItem[]) =>
    items.filter((item) => !isUndefined(getEffectiveFeatured(item))).length;

  return {
    countFeaturedItems,
    getEffectiveFeatured,
    withEffectiveFeatured,
  };
};

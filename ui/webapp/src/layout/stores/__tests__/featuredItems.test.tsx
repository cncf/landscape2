import { createItem } from 'common/test-utils';
import { Show } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

import { renderWithRouter } from '../../../test-utils/render';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { FeaturedGroupProvider, useFeaturedItems } from '../featuredItems';
import { GroupActiveProvider } from '../groupActive';

const FEATURED = { excluded_groups: ['group-2'], label: 'Graduated', order: 1 };

describe('useFeaturedItems', () => {
  it('keeps items featured when no group is active', () => {
    // Render the store for a landscape without groups
    const featuredItems = renderFeaturedItems(undefined, '/');
    const item = createItem({ featured: FEATURED });

    // Verify the item keeps its featured information
    expect(featuredItems.getEffectiveFeatured(item)).toEqual(FEATURED);
    expect(featuredItems.withEffectiveFeatured([item])).toEqual([item]);
  });

  it('keeps items featured when the active group is not excluded', () => {
    const featuredItems = renderFeaturedItems(['group-1', 'group-2'], '/?group=group-1');

    expect(featuredItems.getEffectiveFeatured(createItem({ featured: FEATURED }))).toEqual(FEATURED);
  });

  it('hides the featured information when the active group is excluded', () => {
    // Render the store with an excluded group active
    const featuredItems = renderFeaturedItems(['group-1', 'group-2'], '/?group=group-2');
    const item = createItem({ featured: FEATURED });

    // Verify the item is not featured in that group
    expect(featuredItems.getEffectiveFeatured(item)).toBeUndefined();
    expect(featuredItems.withEffectiveFeatured([item])).toEqual([{ ...item, featured: undefined }]);
  });

  it('gives a clone placed in an additional category the same result as the original', () => {
    // Setup an item featured by its primary subcategory and its clone in an additional category
    const item = createItem({
      additional_categories: [{ category: 'Other Category', subcategory: 'Other Subcategory' }],
      featured: FEATURED,
      subcategory: 'Featured Subcategory',
    });
    const clone = { ...item, category: 'Other Category', subcategory: 'Other Subcategory' };

    // Verify both are hidden in the excluded group
    const excludedGroupItems = renderFeaturedItems(['group-1', 'group-2'], '/?group=group-2');
    expect(excludedGroupItems.getEffectiveFeatured(item)).toBeUndefined();
    expect(excludedGroupItems.getEffectiveFeatured(clone)).toBeUndefined();

    // Verify both are featured in another group
    const otherGroupItems = renderFeaturedItems(['group-1', 'group-2'], '/?group=group-1');
    expect(otherGroupItems.getEffectiveFeatured(item)).toEqual(FEATURED);
    expect(otherGroupItems.getEffectiveFeatured(clone)).toEqual(FEATURED);
  });

  it('counts only the items featured in the active group', () => {
    // Setup an item excluded from the active group, a featured one and a regular one
    const items = [
      createItem({ featured: FEATURED, id: 'excluded-item' }),
      createItem({ featured: { label: 'Incubating', order: 2 }, id: 'featured-item' }),
      createItem({ id: 'regular-item' }),
    ];

    // Verify the count respects the exclusions of the active group only
    expect(renderFeaturedItems(['group-1', 'group-2'], '/?group=group-2').countFeaturedItems(items)).toBe(1);
    expect(renderFeaturedItems(['group-1', 'group-2'], '/?group=group-1').countFeaturedItems(items)).toBe(2);
  });

  it('uses the group provided instead of the active group', () => {
    const item = createItem({ featured: FEATURED });

    // Verify a group provided keeps its own featured information whatever the active group
    expect(
      renderFeaturedItems(['group-1', 'group-2'], '/?group=group-1', 'group-2').getEffectiveFeatured(item)
    ).toBeUndefined();
    expect(
      renderFeaturedItems(['group-1', 'group-2'], '/?group=group-2', 'group-1').getEffectiveFeatured(item)
    ).toEqual(FEATURED);
  });
});

// Helpers.

/**
 * Renders the featured items store under the groups and URL provided, returning its
 * helpers. The store is rendered under a featured group provider when a group is given.
 */
const renderFeaturedItems = (groups: string[] | undefined, url: string, group?: string) => {
  vi.spyOn(itemsDataGetter, 'getGroups').mockReturnValue(groups);
  let featuredItems: ReturnType<typeof useFeaturedItems> | undefined;
  const Probe = () => {
    featuredItems = useFeaturedItems();
    return null;
  };

  renderWithRouter(
    () => (
      <GroupActiveProvider>
        <Show when={group !== undefined} fallback={<Probe />}>
          <FeaturedGroupProvider group={group}>
            <Probe />
          </FeaturedGroupProvider>
        </Show>
      </GroupActiveProvider>
    ),
    { url }
  );

  return featuredItems!;
};

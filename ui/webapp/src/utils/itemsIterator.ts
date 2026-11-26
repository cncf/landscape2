import isUndefined from 'lodash/isUndefined';

import { LandscapeItem } from '../types';

/** Slots a featured item takes in a grid row. */
const FEATURED_ITEM_SLOTS = 2;

/** Slots a plain item takes in a row that already holds a featured item. */
const PLAIN_ITEM_SLOTS_WITH_FEATURED = 0.5;

/** Minimum row size where featured items can be rearranged. */
const MIN_ITEMS_PER_ROW_TO_REARRANGE = 2;

/**
 * Iterates over the items in grid order. When featured items (which take 2 slots)
 * wouldn't fit in the space left in a row, the next items that fit are moved ahead,
 * so rows are filled without gaps. Every item is yielded exactly once.
 */
class ItemIterator implements Iterable<LandscapeItem> {
  private currentRowItemIndex: number = 0;
  private firstNonProcessed?: number;
  private items: LandscapeItem[];
  private itemsPerRow: number;
  private lastProcessed: number = 0;
  private lineWithFeaturedItem: boolean = false;
  private prevItem: boolean = true;
  private processedItems: Set<string> = new Set();
  private processedItemsNumber: number = 0;
  private useProvidedOrder: boolean;

  constructor(items: LandscapeItem[], itemsPerRow: number) {
    this.items = items;
    this.itemsPerRow = itemsPerRow;
    this.useProvidedOrder = shouldUseProvidedOrder(items, itemsPerRow);
  }

  public [Symbol.iterator](): Iterator<LandscapeItem> {
    return {
      next: (): IteratorResult<LandscapeItem> => {
        if (this.processedItemsNumber >= this.items.length) {
          return { done: true, value: undefined };
        }

        if (this.useProvidedOrder) {
          return { done: false, value: this.items[this.processedItemsNumber++] };
        }

        // When no pending item fits in the current row, a new row is started. If no
        // item fits in the new row either, no progress is possible, so iteration ends
        const index = this.findNextItem() ?? this.findNextItem();
        if (index === null) {
          return { done: true, value: undefined };
        }
        return { done: false, value: this.items[index] };
      },
    };
  }

  private findNextItem(): number | null {
    const startIndex: number = this.firstNonProcessed ?? this.lastProcessed;

    // When not prev item, a new line is forced
    if (!this.prevItem) {
      this.currentRowItemIndex = 0;
      this.lineWithFeaturedItem = false;
    }

    for (let i = startIndex; i < this.items.length; i++) {
      const item = this.items[i];

      // When item has been processed already
      if (this.processedItems.has(item.id)) {
        continue;
      }

      const isFeatured = !isUndefined(item.featured);
      if (itemFits(this.itemsPerRow - this.currentRowItemIndex, isFeatured)) {
        // When a featured item has been added to the line
        if (isFeatured) {
          this.lineWithFeaturedItem = true;
        }

        // When a featured item is in the line, the small ones add 1/2 space to the line
        this.currentRowItemIndex += isFeatured
          ? FEATURED_ITEM_SLOTS
          : this.lineWithFeaturedItem
            ? PLAIN_ITEM_SLOTS_WITH_FEATURED
            : 1;

        // If non processed item has been selected, we remove it
        if (this.firstNonProcessed === i) {
          this.firstNonProcessed = undefined;
        }

        // When line is completed, we reset index and lineWithFeaturedItem status
        if (this.currentRowItemIndex >= this.itemsPerRow) {
          this.currentRowItemIndex = 0;
          this.lineWithFeaturedItem = false;
        }

        // Mark as processed
        this.prevItem = true;
        this.lastProcessed = i;
        this.processedItems.add(item.id);
        this.processedItemsNumber++;
        return i;
      } else if (isUndefined(this.firstNonProcessed)) {
        this.firstNonProcessed = i;
      }
    }

    this.prevItem = false;
    return null;
  }
}

export default ItemIterator;

/** Checks if an item fits in the space left in the current row. */
const itemFits = (remainingSpace: number, featured: boolean): boolean => {
  if (featured) {
    return remainingSpace >= FEATURED_ITEM_SLOTS;
  }
  return remainingSpace > 0;
};

/** Checks if the provided order already fills the rows, so items don't need to be rearranged. */
const shouldUseProvidedOrder = (items: LandscapeItem[], itemsPerRow: number): boolean => {
  // When rows are too small to hold a featured item, nothing can be rearranged
  if (itemsPerRow < MIN_ITEMS_PER_ROW_TO_REARRANGE) {
    return true;
  }

  // When items per row is even
  if (itemsPerRow % 2 === 0) {
    return true;
  }

  const featuredItemsNumber = items.filter((item: LandscapeItem) => !isUndefined(item.featured)).length;

  // When featured items fit in one only row, when all items are featured or when no item is featured
  return featuredItemsNumber * 2 < itemsPerRow || featuredItemsNumber === items.length || featuredItemsNumber === 0;
};

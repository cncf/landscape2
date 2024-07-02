import isUndefined from 'lodash/isUndefined';

import { BaseItem, Item } from '../types';

interface ProcessedItems {
  [key: string]: boolean;
}

class ItemIterator implements Iterable<Item | BaseItem> {
  private itemsPerRow: number;
  private items: (Item | BaseItem)[];
  private firstNonProcessed?: number;
  private lastProcessed: number = 0;
  private processedItems: ProcessedItems = {};
  private processedItemsNumber: number = 0;
  private currentRowItemIndex: number = 0;
  private lineWithFeaturedItem: boolean = false;
  private prevItem: boolean = true;

  constructor(items: (Item | BaseItem)[], itemsPerRow: number) {
    this.items = items;
    this.itemsPerRow = itemsPerRow;
    items.forEach((i: Item | BaseItem) => {
      this.processedItems[i.id] = false;
    });
  }

  public [Symbol.iterator]() {
    return {
      next: () => {
        if (this.shouldUseProvidedOrder()) {
          return {
            done: this.processedItemsNumber === this.items.length,
            value: this.items[this.processedItemsNumber++],
          };
        } else {
          return {
            done: this.processedItemsNumber === this.items.length,
            value: this.items[this.findNextItem() as number],
          };
        }
      },
    };
  }

  private findNextItem(): number | null {
    const startIndex: number = this.firstNonProcessed || this.lastProcessed;

    // When not prev item, a new line is forced
    if (!this.prevItem) {
      this.currentRowItemIndex = 0;
      this.lineWithFeaturedItem = false;
    }

    for (let i = startIndex; i < this.items.length; i++) {
      const item = this.items[i];

      // When item has not been processed yet
      if (this.processedItems[item.id]) {
        continue;
      }

      const isFeatured = !isUndefined(item.featured);
      if (this.itemFits(this.itemsPerRow - this.currentRowItemIndex, isFeatured)) {
        // When a featured item has been added to the line
        if (isFeatured && !this.lineWithFeaturedItem) {
          this.lineWithFeaturedItem = true;
        }

        // When a featured item is in the line, the small ones add 1/2 space to the line
        this.currentRowItemIndex = this.currentRowItemIndex + (isFeatured ? 2 : this.lineWithFeaturedItem ? 0.5 : 1);

        // If non processed item has been selected, we remove it
        if (this.firstNonProcessed === i) {
          this.firstNonProcessed = undefined;
        }

        // When line is completed, we reset index and lineWithFeaturedItem status
        if (this.currentRowItemIndex === this.itemsPerRow) {
          this.currentRowItemIndex = 0;
          this.lineWithFeaturedItem = false;
        }

        // Mark as processed
        this.prevItem = true;
        this.lastProcessed = i;
        this.processedItems[item.id] = true;
        this.processedItemsNumber++;
        return i;
      } else {
        if (isUndefined(this.firstNonProcessed)) {
          this.firstNonProcessed = i;
        }
      }
    }

    this.prevItem = false;
    return null;
  }

  // Sometimes the provided order is good to proceed.
  private shouldUseProvidedOrder(): boolean {
    const featuredItemsNumber = this.items.filter((item: BaseItem | Item) => !isUndefined(item.featured)).length;

    // When items per row is even
    if (this.itemsPerRow % 2 === 0) {
      return true;
    }

    // When if featured items fits in one only row
    if (featuredItemsNumber * 2 < this.itemsPerRow) {
      return true;
    }

    // When all items are featured
    if (featuredItemsNumber === this.items.length) {
      return true;
    }

    // When any item is featured
    if (featuredItemsNumber === 0) {
      return true;
    }

    return false;
  }

  private itemFits(remainingSpace: number, featured: boolean) {
    if (remainingSpace === 0 || (remainingSpace <= 1 && featured)) {
      return false;
    }
    return true;
  }
}

export default ItemIterator;

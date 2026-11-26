import { createItem } from 'common/test-utils';
import { describe, expect, it } from 'vitest';

import type { LandscapeItem } from '../../types';
import ItemIterator from '../itemsIterator';

/** Maximum number of `next()` calls before a test treats the iterator as endless. */
const ITERATION_CAP = 1000;

describe('ItemIterator', () => {
  it('keeps the input order when itemsPerRow is even', () => {
    // Setup
    const items = [featured('f1'), plain('p1'), featured('f2'), plain('p2'), featured('f3'), plain('p3')];

    // Run and check
    expect(ids(collect(new ItemIterator(items, 4)))).toEqual(['f1', 'p1', 'f2', 'p2', 'f3', 'p3']);
  });

  it('fills rows without passing an odd itemsPerRow when there are featured items', () => {
    // Setup: a featured item takes 2 slots and, after it, plain items take half a slot
    const items = [
      featured('f1'),
      plain('p1'),
      plain('p2'),
      plain('p3'),
      featured('f2'),
      plain('p4'),
      featured('f3'),
      plain('p5'),
      plain('p6'),
      plain('p7'),
      plain('p8'),
    ];

    // Run
    const yielded = collect(new ItemIterator(items, 5));

    // Check: f2 doesn't fit in the 1.5 slots left after p3, nor f3 in the 1 slot after
    // p4, so both move to the second row
    expect(ids(yielded)).toEqual(['f1', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'f2', 'f3', 'p7', 'p8']);
  });

  it.each([1, 0, -1])('terminates and yields every item once when itemsPerRow is %i', (itemsPerRow) => {
    // Setup
    const items = [plain('p1'), featured('f1'), plain('p2'), featured('f2'), plain('p3')];

    // Run
    const yielded = collect(new ItemIterator(items, itemsPerRow));

    // Check
    expect(ids(yielded)).toEqual(['p1', 'f1', 'p2', 'f2', 'p3']);
  });
});

// Helpers.

/** Collects the iterator values, failing instead of hanging when it doesn't terminate. */
function collect(iterable: Iterable<LandscapeItem>): LandscapeItem[] {
  const iterator = iterable[Symbol.iterator]();
  const values: LandscapeItem[] = [];
  for (let i = 0; i < ITERATION_CAP; i++) {
    const result = iterator.next();
    if (result.done) {
      return values;
    }
    values.push(result.value);
  }
  throw new Error(`The iterator did not terminate after ${ITERATION_CAP} iterations`);
}

/** Creates a featured item. */
function featured(id: string): LandscapeItem {
  return createItem({ featured: { label: 'Featured' }, id, name: id });
}

/** Returns the ids of the given items. */
function ids(items: LandscapeItem[]): string[] {
  return items.map((item) => item?.id);
}

/** Creates an item that is not featured. */
function plain(id: string): LandscapeItem {
  return createItem({ id, name: id });
}

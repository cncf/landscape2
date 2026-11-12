import { describe, expect, it } from 'vitest';

import { createBaseData } from '../../test-utils/fixtures';
import type { Category } from '../../types';
import getName from '../getName';

/** Category with one subcategory. */
const CATEGORIES: Category[] = [
  {
    name: 'App Definition',
    normalized_name: 'app-definition',
    subcategories: [{ name: 'Application Definition & Image Build', normalized_name: 'application-definition' }],
  },
];

describe('getName', () => {
  it.each([
    ['a category', CATEGORIES, 'app-definition', { category: 'App Definition' }],
    [
      'a category and a subcategory',
      CATEGORIES,
      'app-definition--application-definition',
      { category: 'App Definition', subcategory: 'Application Definition & Image Build' },
    ],
    ['an unknown subcategory', CATEGORIES, 'app-definition--unknown', null],
    ['an unknown category', CATEGORIES, 'unknown--application-definition', null],
    ['a landscape without categories', undefined, 'app-definition', null],
  ])('resolves %s', (_, categories, text, expected) => {
    window.baseDS = createBaseData({ categories });

    expect(getName(text)).toEqual(expected);
  });
});

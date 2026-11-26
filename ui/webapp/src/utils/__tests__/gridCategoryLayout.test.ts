import { describe, expect, it } from 'vitest';

import getGridCategoryLayout, { GridCategoryLayout, SubcategoryDetails } from '../gridCategoryLayout';

/** Subcategories with different sizes, in input order. */
const SUBCATEGORIES: SubcategoryDetails[] = [
  { itemsCount: 3, itemsFeaturedCount: 0, name: 'Small' },
  { itemsCount: 40, itemsFeaturedCount: 2, name: 'Large' },
  { itemsCount: 12, itemsFeaturedCount: 1, name: 'Medium' },
  { itemsCount: 1, itemsFeaturedCount: 0, name: 'Tiny' },
  { itemsCount: 20, itemsFeaturedCount: 0, name: 'Big' },
];

describe('getGridCategoryLayout', () => {
  it.each([
    ['a wide container', 2000],
    ['a medium container', 1200],
    ['a narrow container', 600],
  ])('makes every row sum to 100 for %s', (_, containerWidth) => {
    const layout = getGridCategoryLayout({
      categoryName: 'Category',
      containerWidth,
      isOverridden: false,
      itemWidth: 65,
      subcategories: SUBCATEGORIES,
    });

    expect(layout.flat()).toHaveLength(SUBCATEGORIES.length);
    expectRowsSumTo100(layout);
  });

  it('deals the subcategories to the rows from the largest when the category is not overridden', () => {
    const layout = getGridCategoryLayout({
      categoryName: 'Category',
      containerWidth: 1000,
      isOverridden: false,
      itemWidth: 65,
      subcategories: SUBCATEGORIES,
    });

    expect(layout.map((row) => row.map((column) => column.subcategoryName))).toEqual([
      ['Large', 'Small'],
      ['Big', 'Tiny'],
      ['Medium'],
    ]);
  });

  it('keeps the input order with one subcategory per row when the category is overridden', () => {
    const layout = getGridCategoryLayout({
      categoryName: 'Category',
      containerWidth: 2000,
      isOverridden: true,
      itemWidth: 65,
      subcategories: SUBCATEGORIES,
    });

    expect(layout).toEqual(
      SUBCATEGORIES.map((subcategory) => [{ percentage: 100, subcategoryName: subcategory.name }])
    );
  });

  it('gives equal shares, with no NaN, when the category has no items', () => {
    const layout = getGridCategoryLayout({
      categoryName: 'Category',
      containerWidth: 2000,
      isOverridden: false,
      itemWidth: 65,
      subcategories: [
        { itemsCount: 0, itemsFeaturedCount: 0, name: 'First' },
        { itemsCount: 0, itemsFeaturedCount: 0, name: 'Second' },
      ],
    });

    expect(layout).toEqual([
      [
        { percentage: 50, subcategoryName: 'First' },
        { percentage: 50, subcategoryName: 'Second' },
      ],
    ]);
  });

  it('gives equal shares, with no NaN, when every column of a row is below the minimum width', () => {
    // Columns need 4 items of 200px (846px with paddings and spacing) out of 1000px
    const layout = getGridCategoryLayout({
      categoryName: 'Category',
      containerWidth: 1000,
      isOverridden: false,
      itemWidth: 200,
      subcategories: [
        { itemsCount: 10, itemsFeaturedCount: 0, name: 'First' },
        { itemsCount: 6, itemsFeaturedCount: 0, name: 'Second' },
      ],
    });

    expect(layout).toEqual([
      [
        { percentage: 50, subcategoryName: 'First' },
        { percentage: 50, subcategoryName: 'Second' },
      ],
    ]);
  });
});

// Helpers.

/** Checks that no percentage is NaN and that each row adds up to about 100. */
const expectRowsSumTo100 = (layout: GridCategoryLayout) => {
  for (const row of layout) {
    for (const column of row) {
      expect(column.percentage).not.toBeNaN();
    }
    expect(row.reduce((total, column) => total + column.percentage, 0)).toBeCloseTo(100);
  }
};

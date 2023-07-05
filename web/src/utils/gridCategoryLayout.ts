// Input used to calculate the grid category layout.
export interface GetGridCategoryLayoutInput {
  categoryName: string;
  subcategories: SubcategoryDetails[];
  isOverriden: boolean;
  containerWidth: number;
  itemWidth: number;
}

// Some details about a subcategory.
export interface SubcategoryDetails {
  name: string;
  itemsCount: number;
  itemsFeaturedCount: number;
}

// Grid category layout representation that defines how the subcategories in
// this category should be distributed in rows and columns (an array of rows).
export type GridCategoryLayout = LayoutRow[];

// Represents a row in the layout (an array of columns).
export type LayoutRow = LayoutColumn[];

// Represents a column in a row in the layout.
export interface LayoutColumn {
  subcategoryName: string;
  percentage: number;
}

// Get the grid layout of the category provided.
/* eslint-disable @typescript-eslint/no-non-null-assertion */
export default function getGridCategoryLayout(input: GetGridCategoryLayoutInput): GridCategoryLayout {  // Calculate number of rows needed to display the subcategories
  let rowsCount;
  if (input.isOverriden) {
    rowsCount = input.subcategories.length;
  } else {
    rowsCount = Math.ceil(input.subcategories.length / (input.containerWidth / 500));
  }

  // Create our own version of the subcategories with some adjustments
  const minItems = Math.round(input.containerWidth / input.itemWidth * 0.75);
  const subcategories = input.subcategories.map((s) => {
    // Account for featured items (each one takes the space of ~4 items)
    let itemsCount = s.itemsCount + s.itemsFeaturedCount * 3;

    // Make sure each subcategory has a minimum number of items
    itemsCount = itemsCount < minItems ? minItems : itemsCount;

    return {
      name: s.name,
      itemsCount: itemsCount,
      originalItemsCount: s.itemsCount,
    };
  });

  // Distribute subcategories in rows (one column per subcategory)
  // (we'll assign the next available largest category to each of the rows)
  if (!input.isOverriden) {
    subcategories.sort((a, b) => b.originalItemsCount - a.originalItemsCount);
  }
  const rows: LayoutRow[] = Array.from({ length: rowsCount }, () => []);
  let currentRow = 0;
  for (const subcategory of subcategories) {
    rows[currentRow].push({
      subcategoryName: subcategory.name,
      percentage: 0,
    });
    currentRow = currentRow == rows.length - 1 ? 0 : currentRow + 1;
  }

  // Calculate columns width percentage based on the subcategory weight in the
  // row (we need to account for the minimum width a column must have)
  const totalItemsCount = subcategories.reduce((t, s) => t += s.itemsCount, 0);
  const weights = new Map(subcategories.map((s) => [s.name, s.itemsCount / totalItemsCount]));
  for (const row of rows) {
    const rowWeights = row.reduce((t, c) => t += weights.get(c.subcategoryName)!, 0);
    for (const c of row) {
      c.percentage = Number((weights.get(c.subcategoryName)! / rowWeights * 100).toFixed(2));
    }
  }

  return rows;
}

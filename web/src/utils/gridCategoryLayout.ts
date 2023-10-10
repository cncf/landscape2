// Width reserved for each column in a row (in px). This value is used to
// calculate how many columns we'll have in a row. Columns may end up taking
// less space if the number of items is small.
const COLUMN_RESERVED_WIDTH = 500;

// Minimum number of items (non featured) that must fit in a column.
export const MIN_COLUMN_ITEMS = 4;

// Lateral padding used in the container where items will be displayed (in px).
const CONTAINER_PADDING = 14;

// Space between items (in px).
const ITEMS_SPACING = 6;

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

interface Owers {
  [key: string]: number;
}

// Get the grid layout of the category provided.
export default function getGridCategoryLayout(input: GetGridCategoryLayoutInput): GridCategoryLayout {
  // Calculate number of rows needed to display the subcategories
  let rowsCount;
  if (input.isOverriden) {
    rowsCount = input.subcategories.length;
  } else {
    const maxColumns = Math.floor(input.containerWidth / COLUMN_RESERVED_WIDTH);
    rowsCount = Math.ceil(input.subcategories.length / maxColumns);
  }

  // Extend subcategories with some adjustments
  const subcategories = input.subcategories.map((s) => {
    // Normalized items count considering featured items (each one takes the space of ~4 items)
    const normalizedItemsCount = s.itemsCount + s.itemsFeaturedCount * 3;

    return {
      ...s,
      normalizedItemsCount,
    };
  });

  // Distribute subcategories in rows (one column per subcategory)
  // (we'll assign the next available largest category to each of the rows)
  if (!input.isOverriden) {
    subcategories.sort((a, b) => b.normalizedItemsCount - a.normalizedItemsCount);
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

  // Calculate columns width percentage from the subcategory weight in the row
  const totalItemsCount = subcategories.reduce((t, s) => (t += s.normalizedItemsCount), 0);
  const weights = new Map(subcategories.map((s) => [s.name, s.normalizedItemsCount / totalItemsCount]));
  for (const row of rows) {
    const rowWeights = row.reduce((t, c) => (t += weights.get(c.subcategoryName)!), 0);
    for (const col of row) {
      col.percentage = (weights.get(col.subcategoryName)! / rowWeights) * 100;
    }
  }

  // Adjust columns percentages to respect the minimum width for a column
  const minWidth = 2 * CONTAINER_PADDING + (MIN_COLUMN_ITEMS - 1) * ITEMS_SPACING + input.itemWidth * MIN_COLUMN_ITEMS;
  const minPercentage = (minWidth * 100) / input.containerWidth;
  for (const row of rows) {
    const owers: Owers = {};
    let owed = 0;

    // Pass 1: increase percentage of columns not reaching the minimum
    for (const col of row) {
      if (col.percentage < minPercentage) {
        owed += minPercentage - col.percentage;
        col.percentage = minPercentage;
      } else {
        owers[col.subcategoryName] = col.percentage;
      }
    }

    // Pass 2: take percentage owed from the other columns
    if (owed > 0) {
      const ownedPerRow = owed / Object.keys(owers).length;
      for (const col of row) {
        if (Object.keys(owers).includes(col.subcategoryName)) {
          // When percentage taken means less than minimun,
          // we only remove until the minimun percentage
          if (col.percentage - ownedPerRow < minPercentage) {
            delete owers[col.subcategoryName];
            owed -= col.percentage - minPercentage;
            col.percentage = minPercentage;
          }
        }
      }

      for (const col of row) {
        if (Object.keys(owers).includes(col.subcategoryName)) {
          col.percentage -= owed / Object.keys(owers).length;
        }
      }
    }
  }

  return rows;
}

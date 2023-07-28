import { isUndefined } from 'lodash';
import { CSSProperties } from 'react';

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
  style?: CSSProperties;
}

export interface TransformGridLayoutInput {
  grid: GridCategoryLayout;
  containerWidth: number;
  itemWidth: number;
  subcategories: SubcategoryDetails[];
}

export interface GridDimensions {
  sizes: {
    columns: number;
    rows: number;
    spaces: number;
  }[];
  maxRowsIndex?: number;
  forceWidthIndex: number[];
}

const PADDING = 20;
const GAP = 5;

const calculateItemsPerRow = (percentage: number, containerWidth: number, itemWidth: number): number => {
  return Math.floor((containerWidth * (percentage / 100) - PADDING - GAP) / (itemWidth + GAP));
};

const allEqual = (arr: number[]): boolean => arr.every((v) => v === arr[0]);

const calculateHighestSubcategory = (
  row: LayoutRow,
  containerWidth: number,
  itemWidth: number,
  subcategories: SubcategoryDetails[]
): GridDimensions => {
  let maxRowsIndex: number | undefined;
  const rowsInSub: number[] = [];
  const forceWidthIndex: number[] = [];

  const sizes = row.map((subcat: LayoutColumn, index: number) => {
    const itemsPerRow = calculateItemsPerRow(subcat.percentage, containerWidth, itemWidth);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const subcatData: SubcategoryDetails = subcategories.find(
      (s: SubcategoryDetails) => s.name === subcat.subcategoryName
    )!;
    const totalSpaces: number =
      subcatData.itemsCount - subcatData.itemsFeaturedCount + subcatData.itemsFeaturedCount * 4;
    const totalRows = totalSpaces / itemsPerRow;
    rowsInSub.push(Math.ceil(totalRows));
    if (itemsPerRow % 2 !== 0 && itemsPerRow < subcatData.itemsFeaturedCount * 2) {
      forceWidthIndex.push(index);
    }
    return { columns: itemsPerRow, rows: totalRows, spaces: totalSpaces };
  });

  if (!allEqual(rowsInSub)) {
    const max = Math.max(...rowsInSub);
    const items = rowsInSub.filter((element) => max === element);
    if (items.length === 1) {
      maxRowsIndex = rowsInSub.indexOf(max);
    }
  }

  return { sizes: sizes, maxRowsIndex: maxRowsIndex, forceWidthIndex: forceWidthIndex };
};

const calculateWidthInPx = (columnsNumber: number, itemWidth: number): string => {
  return `${columnsNumber * (itemWidth + GAP) + PADDING}px`;
};

export function transformGridLayout(input: TransformGridLayoutInput): GridCategoryLayout {
  return input.grid.map((row: LayoutRow) => {
    const gridDimensions = calculateHighestSubcategory(row, input.containerWidth, input.itemWidth, input.subcategories);
    return row.map((subcat: LayoutColumn, subcatIndex: number) => {
      let style: CSSProperties | undefined;

      // Use an even number of columns to prevent featured items from leaving a gap
      if (gridDimensions.forceWidthIndex.length > 0 && gridDimensions.forceWidthIndex.includes(subcatIndex)) {
        const width = calculateWidthInPx(gridDimensions.sizes[subcatIndex].columns + 1, input.itemWidth);
        style = { maxWidth: `${subcat.percentage}%`, minWidth: width };
      } else {
        if (!isUndefined(gridDimensions.maxRowsIndex)) {
          if (gridDimensions.maxRowsIndex !== subcatIndex) {
            const width = calculateWidthInPx(gridDimensions.sizes[subcatIndex].columns, input.itemWidth);
            style = { maxWidth: `${subcat.percentage}%`, width: width };
          }
        }
      }
      return { ...subcat, style: style };
    });
  });
}

// Get the grid layout of the category provided.
/* eslint-disable @typescript-eslint/no-non-null-assertion */
export default function getGridCategoryLayout(input: GetGridCategoryLayoutInput): GridCategoryLayout {
  // Calculate number of rows needed to display the subcategories
  let rowsCount;
  if (input.isOverriden) {
    rowsCount = input.subcategories.length;
  } else {
    rowsCount = Math.ceil(input.subcategories.length / (input.containerWidth / 500));
  }

  // Create our own version of the subcategories with some adjustments
  const minItems = Math.round((input.containerWidth / input.itemWidth) * 0.75);
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
  const totalItemsCount = subcategories.reduce((t, s) => (t += s.itemsCount), 0);
  const weights = new Map(subcategories.map((s) => [s.name, s.itemsCount / totalItemsCount]));
  for (const row of rows) {
    const rowWeights = row.reduce((t, c) => (t += weights.get(c.subcategoryName)!), 0);
    for (const c of row) {
      c.percentage = Number(((weights.get(c.subcategoryName)! / rowWeights) * 100).toFixed(2));
    }
  }

  return rows;
}

// Geometry of the grid views (in px unless noted). The paddings model different
// containers, so each one keeps its own value.

/** Space between two grid items. */
export const GRID_ITEM_GAP = 5;

/** Border of the container a grid row of items is measured in. */
export const GRID_ROW_CONTAINER_BORDER = 7;

/** Lateral padding of a grid row of items. */
export const GRID_ROW_PADDING = 24;

/** Padding added to the width of a grid of items. */
export const GRID_WIDTH_PADDING = 20;

/** Lateral padding of the container a subcategory column of the category layout is displayed in. */
export const LAYOUT_COLUMN_CONTAINER_PADDING = 14;

/** Space between items in a subcategory column of the category layout. */
export const LAYOUT_COLUMN_ITEMS_SPACING = 6;

/**
 * Width reserved for each column of a category layout row, used to calculate how many
 * columns a row has. Columns may end up taking less space when they have few items.
 */
export const LAYOUT_COLUMN_RESERVED_WIDTH = 500;

/** Minimum number of items (not featured) that must fit in a column of the category layout. */
export const MIN_COLUMN_ITEMS = 4;

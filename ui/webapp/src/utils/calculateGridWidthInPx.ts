import { GRID_ITEM_GAP, GRID_WIDTH_PADDING } from './gridGeometry';

/** Returns the CSS width of a grid with the number of columns of items of the width given. */
const calculateGridWidthInPx = (columnsNumber: number, itemWidth: number): string =>
  `${columnsNumber * (itemWidth + GRID_ITEM_GAP) + GRID_WIDTH_PADDING}px`;

export default calculateGridWidthInPx;

import { GRID_ITEM_GAP, GRID_ROW_CONTAINER_BORDER, GRID_ROW_PADDING } from './gridGeometry';

/**
 * Calculates how many items of the width given fit in a row that takes the percentage
 * given of the container width (never less than 0).
 */
const calculateGridItemsPerRow = (
  percentage: number,
  containerWidth: number,
  itemWidth: number,
  noPadding?: boolean
): number => {
  const padding = noPadding ? 0 : GRID_ROW_PADDING;
  const paddingContainer = noPadding ? 0 : GRID_ROW_CONTAINER_BORDER;
  return Math.max(
    0,
    Math.floor(
      ((containerWidth - paddingContainer + GRID_ITEM_GAP) * (percentage / 100) - padding) / (itemWidth + GRID_ITEM_GAP)
    )
  );
};

export default calculateGridItemsPerRow;

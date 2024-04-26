import isUndefined from 'lodash/isUndefined';

const PADDING = 24;
const CARD_GAP = 5;
const CONTAINER_BORDER = 7;

const calculateGridItemsPerRow = (
  percentage: number,
  containerWidth: number,
  itemWidth: number,
  noPadding?: boolean
): number => {
  const padding = !isUndefined(noPadding) && noPadding ? 0 : PADDING;
  const paddingContainer = !isUndefined(noPadding) && noPadding ? 0 : CONTAINER_BORDER;
  return Math.floor(
    ((containerWidth - paddingContainer + CARD_GAP) * (percentage / 100) - padding) / (itemWidth + CARD_GAP)
  );
};

export default calculateGridItemsPerRow;

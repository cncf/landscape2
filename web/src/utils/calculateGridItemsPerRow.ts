import isUndefined from 'lodash/isUndefined';

const PADDING = 18;
const CARD_GAP = 6;

const calculateGridItemsPerRow = (
  percentage: number,
  containerWidth: number,
  itemWidth: number,
  noPadding?: boolean
): number => {
  const padding = !isUndefined(noPadding) && noPadding ? 0 : PADDING;
  return Math.floor((containerWidth + CARD_GAP * (percentage / 100) - padding) / (itemWidth + CARD_GAP));
};

export default calculateGridItemsPerRow;

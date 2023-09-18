const PADDING = 18;
const CARD_GAP = 6;

const calculateGridItemsPerRow = (percentage: number, containerWidth: number, itemWidth: number): number => {
  return Math.floor((containerWidth * (percentage / 100) - PADDING) / (itemWidth + CARD_GAP));
};

export default calculateGridItemsPerRow;

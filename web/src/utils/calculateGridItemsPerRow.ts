const PADDING = 18;
const CARD_GAP = 5;

const calculateGridItemsPerRow = (percentage: number, containerWidth: number, itemWidth: number): number => {
  // We need to add a card_gap to width
  return Math.floor(Math.round(containerWidth * (percentage / 100) - PADDING + CARD_GAP) / (itemWidth + CARD_GAP));
};

export default calculateGridItemsPerRow;

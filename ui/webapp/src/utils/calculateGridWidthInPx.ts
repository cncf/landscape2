const PADDING = 20;
const CARD_GAP = 5;

const calculateGridWidthInPx = (columnsNumber: number, itemWidth: number): string => {
  return `${columnsNumber * (itemWidth + CARD_GAP) + PADDING}px`;
};

export default calculateGridWidthInPx;

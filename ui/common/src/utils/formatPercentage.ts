/** Formats a percentage with up to two decimals, showing `<0.01%` for positive values that round to zero. */
export const formatPercentage = (value: number): string => {
  if (value > 0 && value.toFixed(2) === '0.00') {
    return '<0.01%';
  }

  return `${Number(value.toFixed(2))}%`;
};

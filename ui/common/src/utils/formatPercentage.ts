/** Formats positive values below two-decimal precision without displaying zero. */
export const formatPercentage = (value: number) => {
  if (value > 0 && value.toFixed(2) === '0.00') {
    return '<0.01%';
  }

  return `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
};

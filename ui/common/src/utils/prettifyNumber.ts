const DEFAULT_DIGITS = 2;
const TRAILING_ZEROS = /\.0+$|(\.[0-9]*[1-9])0+$/;
const UNITS = [
  { symbol: 'k', value: 1e3 },
  { symbol: 'M', value: 1e6 },
  { symbol: 'B', value: 1e9 },
  { symbol: 'T', value: 1e12 },
  { symbol: 'P', value: 1e15 },
  { symbol: 'E', value: 1e18 },
];

/** Formats a number with a metric suffix (`1.23k`, `4M`), rounded to the given digits without trailing zeros. */
export const prettifyNumber = (num: number, digits: number = DEFAULT_DIGITS): string => {
  if (num < 1000) {
    return String(num);
  }

  let unitIndex = 0;
  while (unitIndex < UNITS.length - 1 && num >= UNITS[unitIndex + 1].value) {
    unitIndex++;
  }

  // A value that rounds up to 1000 moves to the next unit (999999 is 1M, not 1000k)
  let rounded = (num / UNITS[unitIndex].value).toFixed(digits);
  if (Number(rounded) >= 1000 && unitIndex < UNITS.length - 1) {
    unitIndex++;
    rounded = (num / UNITS[unitIndex].value).toFixed(digits);
  }

  return rounded.replace(TRAILING_ZEROS, '$1') + UNITS[unitIndex].symbol;
};

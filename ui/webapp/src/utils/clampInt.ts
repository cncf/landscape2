/**
 * Parses an integer typed in a number input and clamps it to a range.
 *
 * @param value - Input value
 * @param min - Lowest accepted value
 * @param max - Highest accepted value
 * @returns The integer clamped to `[min, max]`, or `undefined` when the value is not a number
 */
const clampInt = (value: string, min: number, max: number): number | undefined => {
  const number = parseInt(value, 10);
  if (Number.isNaN(number)) return undefined;
  return Math.min(Math.max(number, min), max);
};

export default clampInt;

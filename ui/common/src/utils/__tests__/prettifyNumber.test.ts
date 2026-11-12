import { describe, expect, it } from 'vitest';

import { prettifyNumber } from '../prettifyNumber';

describe('prettifyNumber', () => {
  it.each([
    ['a number below one thousand as a string', 999, undefined, '999'],
    ['zero as a string', 0, undefined, '0'],
    ['thousands with two digits by default', 1234, undefined, '1.23k'],
    ['thousands without trailing zeros', 1500, undefined, '1.5k'],
    ['an exact thousand', 1000, undefined, '1k'],
    ['a value rounding up to the next unit', 999999, undefined, '1M'],
    ['millions rounding up to the next unit', 999995000, undefined, '1B'],
    ['an explicit zero digits', 1500000, 0, '2M'],
    ['one digit', 1234567, 1, '1.2M'],
    ['the largest unit', 2e18, undefined, '2E'],
    ['beyond the largest unit', 1e21, undefined, '1000E'],
  ])('formats %s', (_, num, digits, expected) => {
    expect(prettifyNumber(num, digits)).toBe(expected);
  });
});

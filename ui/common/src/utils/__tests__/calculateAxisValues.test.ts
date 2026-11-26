import { describe, expect, it } from 'vitest';

import { calculateAxisValues } from '../calculateAxisValues';

describe('calculateAxisValues', () => {
  it.each([
    ['only the bounds for a zero maximum', 0, 0, [0, 0]],
    ['only the bounds for a maximum of three', 0, 3, [0, 3]],
    ['tens up to a maximum of 37', 0, 37, [0, 10, 20, 30]],
    ['tens up to a maximum of 52', 0, 52, [0, 10, 20, 30, 40, 50]],
  ])('returns %s', (_, min, max, expected) => {
    expect(calculateAxisValues(min, max, 4)).toEqual(expected);
  });
});

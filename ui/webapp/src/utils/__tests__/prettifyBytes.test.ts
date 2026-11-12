import { describe, expect, it } from 'vitest';

import prettifyBytes from '../prettifyBytes';

describe('prettifyBytes', () => {
  it.each([
    ['zero bytes', 0, undefined, '0B'],
    ['bytes below one kilobyte', 1023, undefined, '1023B'],
    ['one kilobyte', 1024, undefined, '1KB'],
    ['kilobytes with two decimals by default', 1264, undefined, '1.23KB'],
    ['an explicit zero decimals', 123456789012, 0, '115GB'],
    ['one decimal', 1610612736, 1, '1.5GB'],
    ['a fraction of a byte in bytes', 0.5, undefined, '0.5B'],
    ['beyond the largest unit in yottabytes', 2 * 1024 ** 9, undefined, '2048YB'],
  ])('formats %s', (_, bytes, decimals, expected) => {
    expect(prettifyBytes(bytes, decimals)).toBe(expected);
  });
});

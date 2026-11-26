import { describe, expect, it } from 'vitest';

import rgba2hex from '../rgba2hex';

describe('rgba2hex', () => {
  it.each([
    ['an opaque rgba color', 'rgba(0, 107, 204, 1)', '#006bcc'],
    ['an rgb color', 'rgb(255, 0, 170)', '#ff00aa'],
    ['a translucent rgba color, dropping the alpha', 'rgba(0, 42, 81, 0.7)', '#002a51'],
    ['a color without spaces', 'rgba(1,2,3,1)', '#010203'],
  ])('converts %s', (_, rgba, expected) => {
    expect(rgba2hex(rgba)).toBe(expected);
  });
});

import { describe, expect, it } from 'vitest';

import { formatShieldsBadgeContent } from '../formatShieldsBadgeContent';

describe('formatShieldsBadgeContent', () => {
  it.each([
    ['a plain name unchanged', 'CNCF', 'CNCF'],
    ['dashes doubled and spaces encoded', 'Open-Source Foundation', 'Open--Source%20Foundation'],
    ['underscores doubled', 'A_B', 'A__B'],
    ['URL special characters encoded', 'A&B/C?#%', 'A%26B%2FC%3F%23%25'],
  ])('formats %s', (_, name, expected) => {
    expect(formatShieldsBadgeContent(name)).toBe(expected);
  });
});

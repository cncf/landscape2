import { describe, expect, it } from 'vitest';

import { capitalizeFirstLetter } from '../capitalizeFirstLetter';

describe('capitalizeFirstLetter', () => {
  it.each([
    ['graduated', 'Graduated'],
    ['early stage', 'Early stage'],
    ['Sandbox', 'Sandbox'],
    ['1st', '1st'],
    ['', ''],
  ])('capitalizes %j as %j', (text, expected) => {
    expect(capitalizeFirstLetter(text)).toBe(expected);
  });
});

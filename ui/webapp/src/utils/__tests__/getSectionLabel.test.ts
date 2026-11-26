import { describe, expect, it } from 'vitest';

import getSectionLabel from '../getSectionLabel';

describe('getSectionLabel', () => {
  it.each([
    ['graduated', false, 'graduated'],
    ['app-delivery', true, 'App Delivery'],
    ['app-delivery', false, 'app-delivery'],
    ['undefined', false, 'None'],
    ['undefined', true, 'None'],
  ])('labels %s (TAG: %s) as %s', (name, isTAG, expected) => {
    expect(getSectionLabel(name, isTAG)).toBe(expected);
  });

  it('treats the section as a maturity by default', () => {
    expect(getSectionLabel('app-delivery')).toBe('app-delivery');
  });
});

import { afterEach, describe, expect, it } from 'vitest';

import type { LandscapeColors } from '../../types/generated';
import { applyColors } from '../applyColors';

const COLORS: LandscapeColors = {
  color1: 'rgba(1, 1, 1, 1)',
  color2: 'rgba(2, 2, 2, 1)',
  color3: 'rgba(3, 3, 3, 1)',
  color4: 'rgba(4, 4, 4, 0.5)',
  color5: 'rgba(5, 5, 5, 0.5)',
  color6: 'rgba(6, 6, 6, 0.5)',
  color7: 'rgb(7, 7, 7)',
};

describe('applyColors', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('sets the seven color variables on the document root', () => {
    // Apply the colors
    applyColors(COLORS);

    // Verify every variable holds its color
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--color1')).toBe(COLORS.color1);
    expect(style.getPropertyValue('--color2')).toBe(COLORS.color2);
    expect(style.getPropertyValue('--color3')).toBe(COLORS.color3);
    expect(style.getPropertyValue('--color4')).toBe(COLORS.color4);
    expect(style.getPropertyValue('--color5')).toBe(COLORS.color5);
    expect(style.getPropertyValue('--color6')).toBe(COLORS.color6);
    expect(style.getPropertyValue('--color7')).toBe(COLORS.color7);
  });

  it('replaces the colors applied before', () => {
    // Apply two palettes in a row
    applyColors({ ...COLORS, color1: 'rgba(9, 9, 9, 1)' });
    applyColors(COLORS);

    // Verify the last palette wins
    expect(document.documentElement.style.getPropertyValue('--color1')).toBe(COLORS.color1);
  });
});

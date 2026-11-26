import { describe, expect, it } from 'vitest';

import { Breakpoint } from '../../types/types';
import { getDeviceConfig } from '../getDeviceConfig';

describe('getDeviceConfig', () => {
  it.each([
    [0, Breakpoint.XS],
    [575, Breakpoint.XS],
    [576, Breakpoint.SM],
    [767, Breakpoint.SM],
    [768, Breakpoint.MD],
    [991, Breakpoint.MD],
    [992, Breakpoint.LG],
    [1199, Breakpoint.LG],
    [1200, Breakpoint.XL],
    [1399, Breakpoint.XL],
    [1400, Breakpoint.XXL],
    [1919, Breakpoint.XXL],
    [1920, Breakpoint.XXXL],
  ])('should map width %i to %s', (width, expectedBreakpoint) => {
    expect(getDeviceConfig(width)).toBe(expectedBreakpoint);
  });
});

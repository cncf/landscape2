import { Breakpoint } from '../../types/types';
import { getDeviceConfig } from '../getDeviceConfig';

describe('getDeviceConfig', () => {
  it.each([
    [1399, Breakpoint.XL],
    [1400, Breakpoint.XXL],
    [1919, Breakpoint.XXL],
    [1920, Breakpoint.XXXL],
  ])('should map width %i to %s', (width, expectedBreakpoint) => {
    expect(getDeviceConfig(width)).toBe(expectedBreakpoint);
  });
});

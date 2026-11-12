import { Breakpoint } from '../types/types';

/** Returns the Bootstrap breakpoint containing the provided viewport width. */
export const getDeviceConfig = (width: number): Breakpoint => {
  if (width < 576) return Breakpoint.XS;
  if (width < 768) return Breakpoint.SM;
  if (width < 992) return Breakpoint.MD;
  if (width < 1200) return Breakpoint.LG;
  if (width < 1400) return Breakpoint.XL;
  if (width < 1920) return Breakpoint.XXL;
  return Breakpoint.XXXL;
};

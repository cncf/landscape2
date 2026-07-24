import { Breakpoint } from '../types/types';

/** Return the Bootstrap breakpoint containing the provided viewport width. */
export const getDeviceConfig = (width: number): Breakpoint | undefined => {
  if (width < 576) {
    return Breakpoint.XS;
  } else if (width >= 576 && width < 768) {
    return Breakpoint.SM;
  } else if (width >= 768 && width < 992) {
    return Breakpoint.MD;
  } else if (width >= 992 && width < 1200) {
    return Breakpoint.LG;
  } else if (width >= 1200 && width < 1400) {
    return Breakpoint.XL;
  } else if (width >= 1400 && width < 1920) {
    return Breakpoint.XXL;
  } else if (width >= 1920) {
    return Breakpoint.XXXL;
  }
};

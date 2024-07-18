import { createWindowSize } from '@solid-primitives/resize-observer';
import type { Accessor } from 'solid-js';
import { createEffect, createSignal } from 'solid-js';

import { Breakpoint } from '../types/types';

const getDeviceConfig = (width: number): Breakpoint | undefined => {
  // Bootstrap breakpoints
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
  } else if (width >= 1400) {
    return Breakpoint.XXL;
  } else if (width >= 1920) {
    return Breakpoint.XXXL;
  }
};

export function useBreakpointDetect(): {
  point: Accessor<Breakpoint | undefined>;
} {
  const [point, setPoint] = createSignal(getDeviceConfig(window.innerWidth));
  const size = createWindowSize();
  const width = () => size.width;

  createEffect(() => {
    const newPoint = getDeviceConfig(width());
    if (newPoint !== point()) {
      setPoint(newPoint);
    }
  });

  return { point };
}

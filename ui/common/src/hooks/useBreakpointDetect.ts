import { useWindowSize } from '@solid-primitives/resize-observer';
import { createMemo } from 'solid-js';

import { getDeviceConfig } from '../utils/getDeviceConfig';

/** Returns the Bootstrap breakpoint of the current viewport width, updated on resize. */
export const useBreakpointDetect = () => {
  const size = useWindowSize();
  const point = createMemo(() => getDeviceConfig(size.width));
  return { point };
};

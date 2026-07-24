import { createWindowSize } from '@solid-primitives/resize-observer';
import type { Accessor } from 'solid-js';
import { createEffect, createSignal } from 'solid-js';

import { Breakpoint } from '../types/types';
import { getDeviceConfig } from '../utils/getDeviceConfig';

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

import { useBreakpointDetect } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createContext, createEffect, createSignal, ParentComponent, useContext } from 'solid-js';

import { DEFAULT_ZOOM_LEVELS } from '../../data';
import { Breakpoint } from '../../types';

function useZoomLevelProvider() {
  const [zoom, setZoom] = createSignal(DEFAULT_ZOOM_LEVELS[Breakpoint.XL]);
  const { point } = useBreakpointDetect();

  createEffect(() => {
    if (!isUndefined(point())) {
      setZoom(DEFAULT_ZOOM_LEVELS[point()! as Breakpoint]);
    }
  });

  return { zoom, setZoom };
}

export type ContextType = ReturnType<typeof useZoomLevelProvider>;

const ZoomContext = createContext<ContextType | undefined>(undefined);

export const ZoomProvider: ParentComponent = (props) => {
  const value = useZoomLevelProvider();
  return <ZoomContext.Provider value={value}>{props.children}</ZoomContext.Provider>;
};

export function useZoom() {
  const context = useContext(ZoomContext);
  if (context === undefined) {
    throw new Error(`useZoomLevel must be used within a ZoomProvider`);
  }
  return context;
}

export function useZoomLevel() {
  return useZoom().zoom;
}

export function useSetZoomLevel() {
  return useZoom().setZoom;
}

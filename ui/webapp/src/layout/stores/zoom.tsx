import { Breakpoint, useBreakpointDetect } from 'common';
import { createContext, createEffect, createSignal, ParentComponent, useContext } from 'solid-js';

import { DEFAULT_ZOOM_LEVELS } from '../../data';

function useZoomLevelProvider() {
  const [zoom, setZoom] = createSignal(DEFAULT_ZOOM_LEVELS[Breakpoint.XL]);
  const { point } = useBreakpointDetect();

  createEffect(() => {
    setZoom(DEFAULT_ZOOM_LEVELS[point()]);
  });

  return { zoom, setZoom };
}

type ContextZoomType = ReturnType<typeof useZoomLevelProvider>;

const ZoomContext = createContext<ContextZoomType | undefined>(undefined);

export const ZoomProvider: ParentComponent = (props) => {
  const value = useZoomLevelProvider();
  return <ZoomContext.Provider value={value}>{props.children}</ZoomContext.Provider>;
};

function useZoomContext() {
  const context = useContext(ZoomContext);
  if (context === undefined) {
    throw new Error(`useZoomContext must be used within a ZoomProvider`);
  }
  return context;
}

/** Returns the grid zoom level accessor. */
export function useZoomLevel() {
  return useZoomContext().zoom;
}

/** Returns the setter of the grid zoom level. */
export function useSetZoomLevel() {
  return useZoomContext().setZoom;
}

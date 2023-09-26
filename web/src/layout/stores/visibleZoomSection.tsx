import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

import { ActiveSection } from '../../types';

function useVisibleZoomSectionProvider() {
  const [visibleZoom, setVisibleZoom] = createSignal<ActiveSection>();

  return { visibleZoom: visibleZoom, setVisibleZoom: setVisibleZoom };
}

export type ContextVisibleZoomSectionType = ReturnType<typeof useVisibleZoomSectionProvider>;

const VisibleZoomSectionContext = createContext<ContextVisibleZoomSectionType | undefined>(undefined);

export const VisibleZoomSectionProvider: ParentComponent = (props) => {
  const value = useVisibleZoomSectionProvider();
  return <VisibleZoomSectionContext.Provider value={value}>{props.children}</VisibleZoomSectionContext.Provider>;
};

export function useVisibleZoomSection() {
  const context = useContext(VisibleZoomSectionContext);
  if (context === undefined) {
    throw new Error(`useVisibleZoomSection must be used within a VisibleZoomSectionProvider`);
  }
  return context;
}

export function useVisibleZoom() {
  return useVisibleZoomSection().visibleZoom;
}

export function useSetVisibleZoom() {
  return useVisibleZoomSection().setVisibleZoom;
}

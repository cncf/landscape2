import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

import { ActiveSection } from '../../types';

function useVisibleZoomSectionProvider() {
  const [visibleZoom, setVisibleZoom] = createSignal<ActiveSection>();

  return { visibleZoom, setVisibleZoom };
}

type ContextVisibleZoomSectionType = ReturnType<typeof useVisibleZoomSectionProvider>;

const VisibleZoomSectionContext = createContext<ContextVisibleZoomSectionType | undefined>(undefined);

export const VisibleZoomSectionProvider: ParentComponent = (props) => {
  const value = useVisibleZoomSectionProvider();
  return <VisibleZoomSectionContext.Provider value={value}>{props.children}</VisibleZoomSectionContext.Provider>;
};

function useVisibleZoomSectionContext() {
  const context = useContext(VisibleZoomSectionContext);
  if (context === undefined) {
    throw new Error(`useVisibleZoomSectionContext must be used within a VisibleZoomSectionProvider`);
  }
  return context;
}

/** Returns the accessor of the section shown in the zoom modal. */
export function useVisibleZoom() {
  return useVisibleZoomSectionContext().visibleZoom;
}

/** Returns the setter of the section shown in the zoom modal. */
export function useSetVisibleZoom() {
  return useVisibleZoomSectionContext().setVisibleZoom;
}

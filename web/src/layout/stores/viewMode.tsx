import { useSearchParams } from '@solidjs/router';
import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

import { DEFAULT_VIEW_MODE, VIEW_MODE_PARAM } from '../../data';
import { ViewMode } from '../../types';

function useViewModeProvider() {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = createSignal<ViewMode>(
    (searchParams[VIEW_MODE_PARAM] as ViewMode) || DEFAULT_VIEW_MODE
  );

  return { viewMode, setViewMode };
}

export type ContextViewModeType = ReturnType<typeof useViewModeProvider>;

const ViewModeContext = createContext<ContextViewModeType | undefined>(undefined);

export const ViewModeProvider: ParentComponent = (props) => {
  const value = useViewModeProvider();
  return <ViewModeContext.Provider value={value}>{props.children}</ViewModeContext.Provider>;
};

export function useViewM() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error(`useViewM must be used within a ViewModeProvider`);
  }
  return context;
}

export function useViewMode() {
  return useViewM().viewMode;
}

export function useSetViewMode() {
  return useViewM().setViewMode;
}

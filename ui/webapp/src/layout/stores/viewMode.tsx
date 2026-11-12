import { useSearchParams } from '@solidjs/router';
import { createContext, createMemo, ParentComponent, useContext } from 'solid-js';

import { DEFAULT_VIEW_MODE, VIEW_MODE_PARAM } from '../../data';
import { ViewMode } from '../../types';
import { parseEnum } from '../../utils/urlParams';
import { useFullDataStatus } from './fullData';

const VIEW_MODES = Object.values(ViewMode);

function useViewModeProvider() {
  const [searchParams] = useSearchParams();
  const fullDataStatus = useFullDataStatus();
  const viewMode = createMemo(() => {
    const urlViewMode = parseEnum(searchParams[VIEW_MODE_PARAM], VIEW_MODES, DEFAULT_VIEW_MODE);
    // The Card view needs the full data, so the base data grid is shown when it fails to load
    return fullDataStatus() === 'error' ? ViewMode.Grid : urlViewMode;
  });

  return { viewMode };
}

type ContextViewModeType = ReturnType<typeof useViewModeProvider>;

const ViewModeContext = createContext<ContextViewModeType | undefined>(undefined);

export const ViewModeProvider: ParentComponent = (props) => {
  const value = useViewModeProvider();
  return <ViewModeContext.Provider value={value}>{props.children}</ViewModeContext.Provider>;
};

function useViewModeContext() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error(`useViewModeContext must be used within a ViewModeProvider`);
  }
  return context;
}

/**
 * Returns the explore view mode accessor, read from the URL. It gives the Grid view
 * while the full data has failed to load, as the Card view can't be shown without it.
 */
export function useViewMode() {
  return useViewModeContext().viewMode;
}

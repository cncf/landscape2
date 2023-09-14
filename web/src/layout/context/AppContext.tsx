import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { DEFAULT_VIEW_MODE, DEFAULT_ZOOM_LEVELS, VIEW_MODE_PARAM, ZOOM_LEVELS } from '../../data';
import { useBreakpointDetect } from '../../hooks/useBreakpointDetect';
import { Breakpoint, ViewMode } from '../../types';
import itemsDataGetter from '../../utils/itemsDataGetter';

export type FoundationProps = {
  foundation: string;
};

export type FullDataProps = {
  fullDataReady: boolean;
};

export type ItemProps = {
  visibleItemId?: string;
};

export type ZoomProps = {
  visibleZoomView?: ActiveSection;
};

export type ViewModeProps = {
  selectedViewMode?: ViewMode;
};

export type ZoomLevelProps = {
  zoomLevel: number;
};

export type ActionsContext = {
  updateActiveItemId: (itemId?: string) => void;
  updateActiveSection: (activeSection?: ActiveSection) => void;
  updateViewMode: (viewMode: ViewMode) => void;
  updateZoomLevel: (level: number) => void;
};

export interface ActiveSection {
  category: string;
  subcategory: string;
  bgColor?: string;
}

interface Props {
  children: JSX.Element;
  foundation: string;
}

export const FoundationContext = createContext<FoundationProps | null>(null);
export const FullDataContext = createContext<FullDataProps | null>(null);
export const ItemContext = createContext<ItemProps | null>(null);
export const ZoomContext = createContext<ZoomProps | null>(null);
export const ViewModeContext = createContext<ViewModeProps | null>(null);
export const ZoomLevelContext = createContext<ZoomLevelProps | null>(null);
export const AppActionsContext = createContext<ActionsContext | null>(null);

const AppContextProvider = (props: Props) => {
  const [searchParams] = useSearchParams();
  const point = useBreakpointDetect();
  const [visibleItemId, setVisibleItemId] = useState<string | undefined>();
  const [visibleZoomView, setVisibleZoomView] = useState<ActiveSection | undefined>();
  const [fullDataReady, setFullDataReady] = useState<boolean>(false);
  const [selectedViewMode, setSelectedViewMode] = useState<ViewMode>(
    (searchParams.get(VIEW_MODE_PARAM) as ViewMode) || DEFAULT_VIEW_MODE
  );
  const [zoomLevel, setZoomLevel] = useState<number>(
    point ? DEFAULT_ZOOM_LEVELS[point] : DEFAULT_ZOOM_LEVELS[Breakpoint.XL]
  );

  const updateActiveItemId = useCallback((id?: string) => {
    setVisibleItemId(id);
  }, []);

  const updateActiveSection = useCallback((section?: ActiveSection) => {
    setVisibleZoomView(section);
  }, []);

  const updateViewMode = useCallback((viewMode: ViewMode) => {
    setSelectedViewMode(viewMode);
  }, []);

  const updateZoomLevel = useCallback((level: number) => {
    setZoomLevel(level);

    // Update card-size variable depending on zoom level
    const bodyStyles = document.body.style;
    bodyStyles.setProperty('--card-size-width', `${ZOOM_LEVELS[level][0]}px`);
    bodyStyles.setProperty('--card-size-height', `${ZOOM_LEVELS[level][1]}px`);
  }, []);

  useEffect(() => {
    if (point) {
      updateZoomLevel(DEFAULT_ZOOM_LEVELS[point]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point]);

  const fullDataValue = useMemo(
    () => ({
      fullDataReady,
    }),
    [fullDataReady]
  );

  const itemValue = useMemo(
    () => ({
      visibleItemId,
    }),
    [visibleItemId]
  );

  const zoomValue = useMemo(
    () => ({
      visibleZoomView,
    }),
    [visibleZoomView]
  );

  const viewModeValue = useMemo(
    () => ({
      selectedViewMode,
    }),
    [selectedViewMode]
  );

  const zoomLevelValue = useMemo(
    () => ({
      zoomLevel,
    }),
    [zoomLevel]
  );

  const contextActionsValue = useMemo(
    () => ({
      updateActiveItemId,
      updateActiveSection,
      updateViewMode,
      updateZoomLevel,
    }),
    [updateActiveItemId, updateActiveSection, updateViewMode, updateZoomLevel]
  );

  itemsDataGetter.subscribe({
    updateStatus: (status: boolean) => {
      setFullDataReady(status);
    },
  });

  return (
    <FoundationContext.Provider value={{ foundation: props.foundation }}>
      <FullDataContext.Provider value={fullDataValue}>
        <ItemContext.Provider value={itemValue}>
          <ZoomContext.Provider value={zoomValue}>
            <ViewModeContext.Provider value={viewModeValue}>
              <ZoomLevelContext.Provider value={zoomLevelValue}>
                <AppActionsContext.Provider value={contextActionsValue}>{props.children}</AppActionsContext.Provider>
              </ZoomLevelContext.Provider>
            </ViewModeContext.Provider>
          </ZoomContext.Provider>
        </ItemContext.Provider>
      </FullDataContext.Provider>
    </FoundationContext.Provider>
  );
};

export default AppContextProvider;

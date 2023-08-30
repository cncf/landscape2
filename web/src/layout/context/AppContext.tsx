import { createContext, useCallback, useMemo, useState } from 'react';

import itemsDataGetter from '../../utils/itemsDataGetter';

export type FullDataProps = {
  fullDataReady: boolean;
};

export type ItemProps = {
  visibleItemId?: string;
};

export type ZoomProps = {
  visibleZoomView?: ActiveSection;
};

export type ActionsContext = {
  updateActiveItemId: (itemId?: string) => void;
  updateActiveSection: (activeSection?: ActiveSection) => void;
};

export interface ActiveSection {
  category: string;
  subcategory: string;
  bgColor?: string;
}

interface Props {
  children: JSX.Element;
}

export const FullDataContext = createContext<FullDataProps | null>(null);
export const ItemContext = createContext<ItemProps | null>(null);
export const ZoomContext = createContext<ZoomProps | null>(null);
export const AppActionsContext = createContext<ActionsContext | null>(null);

const AppContextProvider = (props: Props) => {
  const [visibleItemId, setVisibleItemId] = useState<string | undefined>();
  const [visibleZoomView, setVisibleZoomView] = useState<ActiveSection | undefined>();
  const [fullDataReady, setFullDataReady] = useState<boolean>(false);

  const updateActiveItemId = useCallback((id?: string) => {
    setVisibleItemId(id);
  }, []);

  const updateActiveSection = useCallback((section?: ActiveSection) => {
    setVisibleZoomView(section);
  }, []);

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

  const contextActionsValue = useMemo(
    () => ({
      updateActiveItemId,
      updateActiveSection,
    }),
    [updateActiveItemId, updateActiveSection]
  );

  itemsDataGetter.subscribe({
    updateStatus: (status: boolean) => {
      setFullDataReady(status);
    },
  });

  return (
    <FullDataContext.Provider value={fullDataValue}>
      <ItemContext.Provider value={itemValue}>
        <ZoomContext.Provider value={zoomValue}>
          <AppActionsContext.Provider value={contextActionsValue}>{props.children}</AppActionsContext.Provider>
        </ZoomContext.Provider>
      </ItemContext.Provider>
    </FullDataContext.Provider>
  );
};

export default AppContextProvider;

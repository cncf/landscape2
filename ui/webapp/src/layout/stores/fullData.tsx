import { createContext, createEffect, createSignal, ParentComponent, useContext } from 'solid-js';

import itemsDataGetter from '../../utils/itemsDataGetter';

function useFullDataProvider() {
  const [fullDataReady, setFullDataReady] = createSignal(itemsDataGetter.isReady());

  createEffect(() => {
    itemsDataGetter.subscribe({
      updateStatus: (currentStatus: boolean) => {
        setFullDataReady(currentStatus);
      },
    });
  });

  return { fullDataReady };
}

export type ContextFullDataType = ReturnType<typeof useFullDataProvider>;

const FullDataContext = createContext<ContextFullDataType | undefined>(undefined);

export const FullDataProvider: ParentComponent = (props) => {
  const value = useFullDataProvider();
  return <FullDataContext.Provider value={value}>{props.children}</FullDataContext.Provider>;
};

export function useFullData() {
  const context = useContext(FullDataContext);
  if (context === undefined) {
    throw new Error(`useFullData must be used within a FullDataProvider`);
  }
  return context;
}

export function useFullDataReady() {
  return useFullData().fullDataReady;
}

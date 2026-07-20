import { createContext, createEffect, createSignal, ParentComponent, useContext } from 'solid-js';

import itemsDataGetter, { type ItemsDataLoadStatus } from '../../utils/itemsDataGetter';

function useFullDataProvider() {
  const [fullDataStatus, setFullDataStatus] = createSignal<ItemsDataLoadStatus>(itemsDataGetter.getStatus());
  const fullDataReady = () => fullDataStatus() === 'ready';
  const retryFullData = () => itemsDataGetter.init();

  createEffect(() => {
    itemsDataGetter.subscribe({
      updateStatus: (currentStatus: ItemsDataLoadStatus) => {
        setFullDataStatus(currentStatus);
      },
    });
  });

  return { fullDataReady, fullDataStatus, retryFullData };
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

export function useFullDataStatus() {
  return useFullData().fullDataStatus;
}

export function useRetryFullData() {
  return useFullData().retryFullData;
}

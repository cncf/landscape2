import { createContext, createSignal, onCleanup, ParentComponent, useContext } from 'solid-js';

import itemsDataGetter, { type ItemsDataLoadStatus } from '../../utils/itemsDataGetter';

function useFullDataProvider() {
  const [fullDataStatus, setFullDataStatus] = createSignal<ItemsDataLoadStatus>(itemsDataGetter.getStatus());
  const fullDataReady = () => fullDataStatus() === 'ready';
  const retryFullData = () => itemsDataGetter.init();

  // Subscribed while the provider is mounted, so an unmounted provider leaves no subscriber behind
  const unsubscribe = itemsDataGetter.subscribe({
    updateStatus: (currentStatus: ItemsDataLoadStatus) => {
      setFullDataStatus(currentStatus);
    },
  });
  onCleanup(unsubscribe);

  return { fullDataReady, fullDataStatus, retryFullData };
}

type ContextFullDataType = ReturnType<typeof useFullDataProvider>;

const FullDataContext = createContext<ContextFullDataType | undefined>(undefined);

export const FullDataProvider: ParentComponent = (props) => {
  const value = useFullDataProvider();
  return <FullDataContext.Provider value={value}>{props.children}</FullDataContext.Provider>;
};

function useFullDataContext() {
  const context = useContext(FullDataContext);
  if (context === undefined) {
    throw new Error(`useFullDataContext must be used within a FullDataProvider`);
  }
  return context;
}

/** Returns the accessor that tells whether the full dataset is ready. */
export function useFullDataReady() {
  return useFullDataContext().fullDataReady;
}

/** Return the current full-data loading status accessor. */
export function useFullDataStatus() {
  return useFullDataContext().fullDataStatus;
}

/** Return the callback that retries loading the full dataset. */
export function useRetryFullData() {
  return useFullDataContext().retryFullData;
}

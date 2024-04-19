import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

import { FinancesData } from '../../types';

function useFinancesDataProvider() {
  const [finances, setFinances] = createSignal<FinancesData | null>();

  return { finances: finances, setFinances: setFinances };
}

export type ContextFinancesDataType = ReturnType<typeof useFinancesDataProvider>;

const FinancesDataContext = createContext<ContextFinancesDataType | undefined>(undefined);

export const FinancesDataProvider: ParentComponent = (props) => {
  const value = useFinancesDataProvider();
  return <FinancesDataContext.Provider value={value}>{props.children}</FinancesDataContext.Provider>;
};

export function useFinancesData() {
  const context = useContext(FinancesDataContext);
  if (context === undefined) {
    throw new Error(`useFinancesDataProvider must be used within a FinancesDataProvider`);
  }
  return context;
}

export function useFinancesDataContent() {
  return useFinancesData().finances;
}

export function useSetFinancesDataContent() {
  return useFinancesData().setFinances;
}

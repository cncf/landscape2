import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

import { FinancesData } from '../../types';

function useFinancesDataProvider() {
  const [finances, setFinances] = createSignal<FinancesData | null>();

  return { finances, setFinances };
}

type ContextFinancesDataType = ReturnType<typeof useFinancesDataProvider>;

const FinancesDataContext = createContext<ContextFinancesDataType | undefined>(undefined);

export const FinancesDataProvider: ParentComponent = (props) => {
  const value = useFinancesDataProvider();
  return <FinancesDataContext.Provider value={value}>{props.children}</FinancesDataContext.Provider>;
};

function useFinancesDataContext() {
  const context = useContext(FinancesDataContext);
  if (context === undefined) {
    throw new Error(`useFinancesDataContext must be used within a FinancesDataProvider`);
  }
  return context;
}

/** Returns the finances data accessor (`null` when there is no Crunchbase data). */
export function useFinancesDataContent() {
  return useFinancesDataContext().finances;
}

/** Returns the setter of the finances data. */
export function useSetFinancesDataContent() {
  return useFinancesDataContext().setFinances;
}

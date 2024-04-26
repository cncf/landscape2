import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

function useMobileTOCProvider() {
  const [openStatus, setOpenStatus] = createSignal<boolean>(false);

  return { openStatus: openStatus, setOpenStatus: setOpenStatus };
}

export type ContextMobileTOCType = ReturnType<typeof useMobileTOCProvider>;

const MobileTOCContext = createContext<ContextMobileTOCType | undefined>(undefined);

export const MobileTOCProvider: ParentComponent = (props) => {
  const value = useMobileTOCProvider();
  return <MobileTOCContext.Provider value={value}>{props.children}</MobileTOCContext.Provider>;
};

export function useMobileTOC() {
  const context = useContext(MobileTOCContext);
  if (context === undefined) {
    throw new Error(`useMobileTOCProvider must be used within a MobileTOCProvider`);
  }
  return context;
}

export function useMobileTOCStatus() {
  return useMobileTOC().openStatus;
}

export function useSetMobileTOCStatus() {
  return useMobileTOC().setOpenStatus;
}

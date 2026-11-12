import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

function useMobileTOCProvider() {
  const [openStatus, setOpenStatus] = createSignal<boolean>(false);

  return { openStatus, setOpenStatus };
}

type ContextMobileTOCType = ReturnType<typeof useMobileTOCProvider>;

const MobileTOCContext = createContext<ContextMobileTOCType | undefined>(undefined);

export const MobileTOCProvider: ParentComponent = (props) => {
  const value = useMobileTOCProvider();
  return <MobileTOCContext.Provider value={value}>{props.children}</MobileTOCContext.Provider>;
};

function useMobileTOCContext() {
  const context = useContext(MobileTOCContext);
  if (context === undefined) {
    throw new Error(`useMobileTOCContext must be used within a MobileTOCProvider`);
  }
  return context;
}

/** Returns the accessor that tells whether the mobile table of contents is open. */
export function useMobileTOCStatus() {
  return useMobileTOCContext().openStatus;
}

/** Returns the setter of the mobile table of contents open state. */
export function useSetMobileTOCStatus() {
  return useMobileTOCContext().setOpenStatus;
}

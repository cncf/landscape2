import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

function useActiveItemProvider() {
  const [activeItemId, setActiveItemId] = createSignal();

  return { itemId: activeItemId, setItemId: setActiveItemId };
}

export type ContextActiveItemType = ReturnType<typeof useActiveItemProvider>;

const ActiveItemContext = createContext<ContextActiveItemType | undefined>(undefined);

export const ActiveItemProvider: ParentComponent = (props) => {
  const value = useActiveItemProvider();
  return <ActiveItemContext.Provider value={value}>{props.children}</ActiveItemContext.Provider>;
};

export function useActiveItem() {
  const context = useContext(ActiveItemContext);
  if (context === undefined) {
    throw new Error(`useActiveItem must be used within a ActiveItemProvider`);
  }
  return context;
}

export function useActiveItemId() {
  return useActiveItem().itemId;
}

export function useSetActiveItemId() {
  return useActiveItem().setItemId;
}

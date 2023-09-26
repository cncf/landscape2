import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

function useGridWidthProvider() {
  const [containerWidth, setContainerWidth] = createSignal(0);

  return { containerWidth: containerWidth, setContainerWidth: setContainerWidth };
}

export type ContextGridWidthType = ReturnType<typeof useGridWidthProvider>;

const GridWidthContext = createContext<ContextGridWidthType | undefined>(undefined);

export const GridWidthProvider: ParentComponent = (props) => {
  const value = useGridWidthProvider();
  return <GridWidthContext.Provider value={value}>{props.children}</GridWidthContext.Provider>;
};

export function useGridWidthContainer() {
  const context = useContext(GridWidthContext);
  if (context === undefined) {
    throw new Error(`useGridWidthContainer must be used within a GridWidthProvider`);
  }
  return context;
}

export function useGridWidth() {
  return useGridWidthContainer().containerWidth;
}

export function useSetGridWidth() {
  return useGridWidthContainer().setContainerWidth;
}

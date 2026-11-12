import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

function useGridWidthProvider() {
  const [containerWidth, setContainerWidth] = createSignal(0);

  return { containerWidth, setContainerWidth };
}

type ContextGridWidthType = ReturnType<typeof useGridWidthProvider>;

const GridWidthContext = createContext<ContextGridWidthType | undefined>(undefined);

export const GridWidthProvider: ParentComponent = (props) => {
  const value = useGridWidthProvider();
  return <GridWidthContext.Provider value={value}>{props.children}</GridWidthContext.Provider>;
};

function useGridWidthContext() {
  const context = useContext(GridWidthContext);
  if (context === undefined) {
    throw new Error(`useGridWidthContext must be used within a GridWidthProvider`);
  }
  return context;
}

/** Returns the explore grid container width accessor. */
export function useGridWidth() {
  return useGridWidthContext().containerWidth;
}

/** Returns the setter of the explore grid container width. */
export function useSetGridWidth() {
  return useGridWidthContext().setContainerWidth;
}

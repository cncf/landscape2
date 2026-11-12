import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

import { Guide, ToCTitle } from '../../types';

function useGuideFileProvider() {
  const [guide, setGuide] = createSignal<Guide | null>();
  const [toc, setToc] = createSignal<ToCTitle[]>([]);

  return { guide, setGuide, toc, setToc };
}

type ContextGuideFileType = ReturnType<typeof useGuideFileProvider>;

const GuideFileContext = createContext<ContextGuideFileType | undefined>(undefined);

export const GuideFileProvider: ParentComponent = (props) => {
  const value = useGuideFileProvider();
  return <GuideFileContext.Provider value={value}>{props.children}</GuideFileContext.Provider>;
};

function useGuideFileContext() {
  const context = useContext(GuideFileContext);
  if (context === undefined) {
    throw new Error(`useGuideFileContext must be used within a GuideFileProvider`);
  }
  return context;
}

/** Returns the accessor of the guide loaded in this session. */
export function useGuideFileContent() {
  return useGuideFileContext().guide;
}

/** Returns the setter of the guide. */
export function useSetGuideFileContent() {
  return useGuideFileContext().setGuide;
}

/** Returns the guide table of contents accessor. */
export function useGuideTOC() {
  return useGuideFileContext().toc;
}

/** Returns the setter of the guide table of contents. */
export function useSetGuideTOC() {
  return useGuideFileContext().setToc;
}

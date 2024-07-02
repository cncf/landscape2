import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

import { Guide, ToCTitle } from '../../types';

function useGuideFileProvider() {
  const [guide, setGuide] = createSignal<Guide | null>();
  const [toc, setToc] = createSignal<ToCTitle[]>([]);

  return { guide: guide, setGuide: setGuide, toc: toc, setToc: setToc };
}

export type ContextGuideFileType = ReturnType<typeof useGuideFileProvider>;

const GuideFileContext = createContext<ContextGuideFileType | undefined>(undefined);

export const GuideFileProvider: ParentComponent = (props) => {
  const value = useGuideFileProvider();
  return <GuideFileContext.Provider value={value}>{props.children}</GuideFileContext.Provider>;
};

export function useGuideFile() {
  const context = useContext(GuideFileContext);
  if (context === undefined) {
    throw new Error(`useGuideFileProvider must be used within a GuideFileProvider`);
  }
  return context;
}

export function useGuideFileContent() {
  return useGuideFile().guide;
}

export function useSetGuideFileContent() {
  return useGuideFile().setGuide;
}

export function useGuideTOC() {
  return useGuideFile().toc;
}

export function useSetGuideTOC() {
  return useGuideFile().setToc;
}

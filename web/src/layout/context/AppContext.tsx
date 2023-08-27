import { createContext, useState } from 'react';

import itemsDataGetter from '../../utils/itemsDataGetter';

export type Context = {
  activeItemId?: string;
  updateActiveItemId: (itemId?: string) => void;
  activeSection?: ActiveSection;
  updateActiveSection: (activeSection?: ActiveSection) => void;
  fullDataReady: boolean;
};

export interface ActiveSection {
  category: string;
  subcategory: string;
  bgColor?: string;
}

interface Props {
  children: JSX.Element;
}

export const AppContext = createContext<Context | null>(null);

const AppContextProvider = (props: Props) => {
  const [activeItemId, setActiveItemId] = useState<string | undefined>();
  const [activeSection, setActiveSection] = useState<ActiveSection | undefined>();
  const [fullDataReady, setFullDataReady] = useState<boolean>(false);

  const updateActiveItemId = (id?: string) => {
    setActiveItemId(id);
  };

  const updateActiveSection = (section?: ActiveSection) => {
    setActiveSection(section);
  };

  itemsDataGetter.isReady({
    updateStatus: (status: boolean) => {
      setFullDataReady(status);
    },
  });

  return (
    <AppContext.Provider
      value={{ activeItemId, updateActiveItemId, updateActiveSection, activeSection, fullDataReady }}
    >
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;

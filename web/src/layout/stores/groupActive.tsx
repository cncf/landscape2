import { useSearchParams } from '@solidjs/router';
import isUndefined from 'lodash/isUndefined';
import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

import { GROUP_PARAM } from '../../data';

function useGroupActiveProvider() {
  const [searchParams] = useSearchParams();
  const [group, setGroup] = createSignal<string | undefined>(
    !isUndefined(window.baseDS.groups) ? searchParams[GROUP_PARAM] || window.baseDS.groups[0].name : undefined
  );

  return { group: group, setGroup: setGroup };
}

export type ContextGroupActiveType = ReturnType<typeof useGroupActiveProvider>;

const GroupActiveContext = createContext<ContextGroupActiveType | undefined>(undefined);

export const GroupActiveProvider: ParentComponent = (props) => {
  const value = useGroupActiveProvider();
  return <GroupActiveContext.Provider value={value}>{props.children}</GroupActiveContext.Provider>;
};

export function useGroupA() {
  const context = useContext(GroupActiveContext);
  if (context === undefined) {
    throw new Error(`useGroupA must be used within a GroupActiveProvider`);
  }
  return context;
}

export function useGroupActive() {
  return useGroupA().group || 'default';
}

export function useSetGroupActive() {
  return useGroupA().setGroup;
}

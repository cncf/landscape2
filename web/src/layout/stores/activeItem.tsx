import { useLocation, useNavigate, useSearchParams } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { createContext, createSignal, ParentComponent, useContext } from 'solid-js';

import { ITEM_PARAM } from '../../data';

function useActiveItemProvider() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeItemId, setActiveItemId] = createSignal<string | undefined>(searchParams[ITEM_PARAM]);

  const updateActiveItem = (itemId?: string) => {
    const updatedSearchParams = new URLSearchParams(searchParams as unknown as URLSearchParams);

    if (isUndefined(itemId)) {
      updatedSearchParams.delete(ITEM_PARAM);
      const params = updatedSearchParams.toString();

      navigate(`${location.pathname}${!isEmpty(params) ? `?${params}` : ''}${location.hash}`, {
        replace: true,
        scroll: false,
      });
      setActiveItemId();
    } else {
      updatedSearchParams.set(ITEM_PARAM, itemId);
      const params = updatedSearchParams.toString();

      navigate(`${location.pathname}${!isEmpty(params) ? `?${params}` : ''}${location.hash}`, {
        replace: true,
        scroll: false,
      });
      setActiveItemId(itemId);
    }
  };

  return { itemId: activeItemId, updateActiveItem: updateActiveItem };
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

export function useUpdateActiveItemId() {
  return useActiveItem().updateActiveItem;
}

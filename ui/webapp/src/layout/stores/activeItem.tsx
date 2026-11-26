import { useLocation, useNavigate, useSearchParams } from '@solidjs/router';
import { createContext, createMemo, ParentComponent, useContext } from 'solid-js';

import { ITEM_PARAM } from '../../data';
import { buildPath, parseItemId, withParams } from '../../utils/urlParams';

/** History state of the entries pushed when an item is opened. */
interface ItemModalState {
  itemModal?: boolean;
}

function useActiveItemProvider() {
  const location = useLocation<ItemModalState>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const itemId = createMemo(() => parseItemId(searchParams[ITEM_PARAM]));

  // Opening pushes an entry, so Back closes the item. Closing goes back to the entry
  // the item was opened from, or replaces a deep-linked entry without the item
  const updateActiveItem = (id?: string) => {
    if (id !== undefined) {
      navigate(buildPath(location.pathname, withParams(location.search, { [ITEM_PARAM]: id }), location.hash), {
        scroll: false,
        state: { itemModal: true },
      });
    } else if (location.state?.itemModal) {
      navigate(-1);
    } else {
      navigate(buildPath(location.pathname, withParams(location.search, { [ITEM_PARAM]: undefined }), location.hash), {
        replace: true,
        scroll: false,
      });
    }
  };

  return { itemId, updateActiveItem };
}

type ContextActiveItemType = ReturnType<typeof useActiveItemProvider>;

const ActiveItemContext = createContext<ContextActiveItemType | undefined>(undefined);

export const ActiveItemProvider: ParentComponent = (props) => {
  const value = useActiveItemProvider();
  return <ActiveItemContext.Provider value={value}>{props.children}</ActiveItemContext.Provider>;
};

function useActiveItemContext() {
  const context = useContext(ActiveItemContext);
  if (context === undefined) {
    throw new Error(`useActiveItemContext must be used within an ActiveItemProvider`);
  }
  return context;
}

/** Returns the accessor of the item id opened through the URL. */
export function useActiveItemId() {
  return useActiveItemContext().itemId;
}

/** Returns the callback that opens an item (or closes it when called without an id). */
export function useUpdateActiveItemId() {
  return useActiveItemContext().updateActiveItem;
}

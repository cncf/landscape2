import 'common/styles/colors.css';
import './styles/bootstrap.scss';
import './styles/App.css';

import type { Item } from 'common';
import { HIDE_ITEM_DETAILS_MESSAGE_TYPE, parseShowItemDetailsMessage, type ShowItemDetailsInput } from 'common/embed';
import { applyColors } from 'common/utils';
import { batch, createEffect, createSignal, on, onCleanup, onMount, Show } from 'solid-js';

import ItemModal, { type ItemLoadStatus } from './common/ItemModal';
import itemsDataGetter from './utils/itemsDataGetter';

const App = () => {
  const [currentItem, setCurrentItem] = createSignal<ShowItemDetailsInput | null>(null);
  const [itemInfo, setItemInfo] = createSignal<Item | undefined>(undefined);
  const [itemLoadStatus, setItemLoadStatus] = createSignal<ItemLoadStatus>('loading');
  const [parentInfo, setParentInfo] = createSignal<Item | undefined>(undefined);
  let activeRequestId = 0;

  onMount(() => {
    // Only the host page (the parent window) can show items, and only with a valid message
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent) return;

      const message = parseShowItemDetailsMessage(event.data);
      if (message === null) return;

      setCurrentItem(message);
    };

    window.addEventListener('message', handleMessage);
    if (window.colors) applyColors(window.colors);

    onCleanup(() => {
      window.removeEventListener('message', handleMessage);
    });
  });

  const loadItem = async (selectedItem: ShowItemDetailsInput) => {
    const requestId = ++activeRequestId;
    batch(() => {
      setItemInfo(undefined);
      setParentInfo(undefined);
      setItemLoadStatus('loading');
    });

    try {
      await itemsDataGetter.fetchItems(selectedItem.classifyBy, selectedItem.key, selectedItem.categories);
      if (requestId !== activeRequestId) return;

      const { classifyBy, itemId, key } = selectedItem;
      const loadedItem = itemsDataGetter.getItemById(classifyBy, key, itemId);

      // The parent of a subproject is shown with its logo when it is part of the loaded dataset
      const parentName = loadedItem?.parent_project;
      const loadedParent = parentName ? itemsDataGetter.getItemByName(classifyBy, key, parentName) : undefined;

      batch(() => {
        setItemInfo(loadedItem);
        setParentInfo(loadedParent);
        setItemLoadStatus(loadedItem ? 'ready' : 'not-found');
      });
    } catch {
      if (requestId === activeRequestId) {
        setItemLoadStatus('error');
      }
    }
  };

  createEffect(
    on(currentItem, (selectedItem) => {
      if (selectedItem) {
        void loadItem(selectedItem);
      }
    })
  );

  const onClose = () => {
    activeRequestId += 1;
    batch(() => {
      setCurrentItem(null);
      setItemInfo(undefined);
      setParentInfo(undefined);
    });
    window.parent.postMessage({ type: HIDE_ITEM_DETAILS_MESSAGE_TYPE }, '*');
  };

  return (
    <Show when={currentItem()}>
      {(selectedItem) => (
        <ItemModal
          foundation={selectedItem().foundation}
          hideOrganizationSection={selectedItem().hideOrganizationSection}
          itemInfo={itemInfo()}
          itemLoadStatus={itemLoadStatus()}
          onClose={onClose}
          onRetry={() => void loadItem(selectedItem())}
          parentInfo={parentInfo()}
        />
      )}
    </Show>
  );
};

export default App;

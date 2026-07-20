import './styles/App.css';

import { batch, createEffect, createSignal, on, onCleanup, onMount, Show } from 'solid-js';
import('../../webapp/src/styles/bootstrap.scss');

import { Item } from 'common';

import ItemModal, { type ItemLoadStatus } from './common/ItemModal';
import { DEFAULT_COLOR_1, DEFAULT_COLOR_2, DEFAULT_COLOR_3, DEFAULT_COLOR_4 } from './types';
import itemsDataGetter from './utils/itemsDataGetter';

interface CurrrentItem {
  foundation: string;
  basePath: string;
  classifyBy: string;
  key: string;
  itemId: string;
  hideOrganizationSection?: boolean;
  categories?: string[];
}

const App = () => {
  const [currentItem, setCurrentItem] = createSignal<CurrrentItem | null>(null);
  const [itemInfo, setItemInfo] = createSignal<Item | undefined>(undefined);
  const [itemLoadStatus, setItemLoadStatus] = createSignal<ItemLoadStatus>('loading');
  let activeRequestId = 0;

  let COLOR_1 = DEFAULT_COLOR_1;
  let COLOR_2 = DEFAULT_COLOR_2;
  let COLOR_3 = DEFAULT_COLOR_3;
  let COLOR_4 = DEFAULT_COLOR_4;

  const loadColors = () => {
    if (window.colors) {
      if (window.colors.color1) {
        COLOR_1 = window.colors.color1;
      }
      if (window.colors.color2) {
        COLOR_2 = window.colors.color2;
      }
      if (window.colors.color3) {
        COLOR_3 = window.colors.color3;
      }
      if (window.colors.color4) {
        COLOR_4 = window.colors.color4;
      }

      const colors = [COLOR_1, COLOR_2, COLOR_3, COLOR_4];

      colors.forEach((color: string, i: number) => {
        document.documentElement.style.setProperty(`--color${i + 1}`, color);
      });
    }
  };

  onMount(() => {
    const handleMessage = (event: MessageEvent<Partial<CurrrentItem> & { type?: string }>) => {
      if (event.source !== window.parent || event.data?.type !== 'showItemDetails') return;

      const { basePath, classifyBy, foundation, itemId, key } = event.data;
      if (
        typeof basePath !== 'string' ||
        typeof classifyBy !== 'string' ||
        typeof foundation !== 'string' ||
        typeof itemId !== 'string' ||
        typeof key !== 'string'
      ) {
        return;
      }

      setCurrentItem({
        basePath,
        categories: event.data.categories,
        classifyBy,
        foundation,
        hideOrganizationSection: event.data.hideOrganizationSection,
        itemId,
        key,
      });
    };

    window.addEventListener('message', handleMessage);
    loadColors();

    onCleanup(() => {
      window.removeEventListener('message', handleMessage);
    });
  });

  const loadItem = async (selectedItem: CurrrentItem) => {
    const requestId = ++activeRequestId;
    batch(() => {
      setItemInfo(undefined);
      setItemLoadStatus('loading');
    });

    try {
      await itemsDataGetter.fetchItems(
        selectedItem.classifyBy,
        selectedItem.key,
        selectedItem.basePath,
        selectedItem.categories
      );
      if (requestId !== activeRequestId) return;

      const loadedItem = itemsDataGetter.getItemById(
        selectedItem.classifyBy,
        selectedItem.key,
        selectedItem.itemId
      );
      batch(() => {
        setItemInfo(loadedItem);
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
    });
    window.parent.postMessage(
      {
        type: 'hideItemDetails',
      },
      '*'
    );
  };

  return (
    <Show when={currentItem()}>
      {(selectedItem) => (
        <ItemModal
          foundation={selectedItem().foundation}
          activeItemId={selectedItem().itemId}
          itemInfo={itemInfo()}
          itemLoadStatus={itemLoadStatus()}
          onClose={onClose}
          onRetry={() => void loadItem(selectedItem())}
          hideOrganizationSection={selectedItem().hideOrganizationSection}
        />
      )}
    </Show>
  );
};

export default App;

import './styles/App.css';

import { batch, createEffect, createSignal, on, onMount, Show } from 'solid-js';
import('../../webapp/src/styles/bootstrap.scss');

import { Item, Loading } from 'common';

import ItemModal from './common/ItemModal';
import { DEFAULT_COLOR_1, DEFAULT_COLOR_2, DEFAULT_COLOR_3, DEFAULT_COLOR_4 } from './types';
import itemsDataGetter from './utils/itemsDataGetter';

interface CurrrentItem {
  foundation: string;
  basePath: string;
  key: string;
  itemId: string;
}

const App = () => {
  const [currentItem, setCurrentItem] = createSignal<CurrrentItem | null>(null);
  const [itemInfo, setItemInfo] = createSignal<Item | undefined>(undefined);
  const [availableKeys, setAvailableKeys] = createSignal<string[]>(itemsDataGetter.getAvailableKeys());

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
    // Listen for messages from the parent frame
    window.addEventListener('message', (event) => {
      setCurrentItem(event.data);
    });
    // Subscribe to the itemsDataGetter to get the available keys
    itemsDataGetter.subscribe({
      updateStatus: (currentStatus: boolean) => {
        if (currentStatus) {
          setAvailableKeys(itemsDataGetter.getAvailableKeys());
        }
      },
    });
    loadColors();
  });

  createEffect(
    on(currentItem, () => {
      // When the currentItem is set
      if (currentItem() !== null) {
        if (!availableKeys().includes(currentItem()!.key)) {
          // Fetch the items data
          itemsDataGetter.fetchItems(currentItem()!.key, currentItem()!.basePath);
        } else {
          // If the item is already available, set the item info
          setItemInfo(itemsDataGetter.getItemById(currentItem()!.key, currentItem()!.itemId));
        }
      }
    })
  );

  createEffect(
    on(availableKeys, () => {
      // When the available keys are updated and the currentItem is set,
      // set the item info
      if (currentItem() !== null && itemInfo() === undefined) {
        if (availableKeys().includes(currentItem()!.key)) {
          setItemInfo(itemsDataGetter.getItemById(currentItem()!.key, currentItem()!.itemId));
        }
      }
    })
  );

  const onClose = () => {
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
    <>
      <Show when={itemInfo() === undefined && currentItem() !== null}>
        <Loading />
      </Show>
      <Show when={itemInfo() !== undefined}>
        <ItemModal
          foundation={currentItem()!.foundation}
          activeItemId={currentItem()!.itemId}
          itemInfo={itemInfo()}
          onClose={onClose}
        />
      </Show>
    </>
  );
};

export default App;

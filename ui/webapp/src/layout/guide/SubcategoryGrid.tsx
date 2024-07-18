import { Image } from 'common';
import isUndefined from 'lodash/isUndefined';
import throttle from 'lodash/throttle';
import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';

import { COLORS } from '../../data';
import { BaseItem, Item } from '../../types';
import calculateGridItemsPerRow from '../../utils/calculateGridItemsPerRow';
import ItemIterator from '../../utils/itemsIterator';
import GridItem from '../explore/grid/GridItem';
import { useUpdateActiveItemId } from '../stores/activeItem';
import styles from './SubcategoryGrid.module.css';

interface Props {
  items?: (BaseItem | Item)[];
}

const SubcategoryGrid = (props: Props) => {
  const [container, setContainer] = createSignal<HTMLInputElement>();
  const [containerWidth, setContainerWidth] = createSignal<number>(0);
  const updateActiveItemId = useUpdateActiveItemId();

  const handler = () => {
    if (!isUndefined(container())) {
      setContainerWidth(container()!.offsetWidth);
    }
  };

  onMount(() => {
    window.addEventListener(
      'resize',
      // eslint-disable-next-line solid/reactivity
      throttle(() => handler(), 400),
      { passive: true }
    );
    handler();
  });

  onCleanup(() => {
    window.removeEventListener('resize', handler);
  });

  return (
    <Show when={!isUndefined(props.items)}>
      <div class={`d-grid d-sm-none justify-content-start ${styles.mobileItems}`}>
        <For each={props.items}>
          {(item: BaseItem | Item) => {
            return (
              <div
                style={item.featured && item.featured.label ? { border: `2px solid ${COLORS[0]}` } : {}}
                class={`card rounded-0 position-relative p-0 ${styles.card}`}
                classList={{
                  whithoutRepo: isUndefined(item.oss) || !item.oss,
                }}
              >
                <button
                  class={`btn border-0 w-100 h-100 d-flex flex-row align-items-center ${styles.cardContent}`}
                  onClick={(e) => {
                    e.preventDefault();
                    updateActiveItemId(item.id);
                  }}
                >
                  <Image name={item.name} class={`m-auto ${styles.logo}`} logo={item.logo} />
                </button>
              </div>
            );
          }}
        </For>
      </div>
      <div class="d-none d-sm-block ">
        <div ref={setContainer} class={`my-4 justify-content-start ${styles.grid}`}>
          {(() => {
            const items = [];
            const itemsPerRow = calculateGridItemsPerRow(100, containerWidth(), 75, true);
            for (const item of new ItemIterator(props.items!, itemsPerRow)) {
              if (item) {
                items.push(
                  <>
                    <GridItem item={item} borderColor={COLORS[0]} showMoreInfo activeDropdown />
                  </>
                );
              }
            }
            return items;
          })()}
        </div>
      </div>
    </Show>
  );
};

export default SubcategoryGrid;

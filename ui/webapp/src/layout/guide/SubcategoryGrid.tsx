import { createElementSize } from '@solid-primitives/resize-observer';
import { Image } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createMemo, createSignal, For, Show } from 'solid-js';

import { COLORS } from '../../data';
import { LandscapeItem } from '../../types';
import calculateGridItemsPerRow from '../../utils/calculateGridItemsPerRow';
import ItemIterator from '../../utils/itemsIterator';
import GridItem from '../explore/grid/GridItem';
import { useUpdateActiveItemId } from '../stores/activeItem';
import styles from './SubcategoryGrid.module.css';

interface Props {
  items?: LandscapeItem[];
}

const SubcategoryGrid = (props: Props) => {
  const [container, setContainer] = createSignal<HTMLDivElement>();
  const containerSize = createElementSize(container);
  const containerWidth = () => containerSize.width ?? 0;
  const updateActiveItemId = useUpdateActiveItemId();
  const itemsPerRow = createMemo(() => calculateGridItemsPerRow(100, containerWidth(), 75, true));
  // The grid items are only created again when the items or the number of items per row change
  const orderedItems = createMemo(() => [...new ItemIterator(props.items ?? [], itemsPerRow())]);

  return (
    <Show when={!isUndefined(props.items)}>
      <div class={`d-grid d-sm-none justify-content-start ${styles.mobileItems}`} role="list">
        <For each={props.items}>
          {(item: LandscapeItem) => {
            return (
              <div
                role="listitem"
                style={item.featured && item.featured.label ? { border: `2px solid ${COLORS[0]}` } : {}}
                class={`card rounded-0 position-relative p-0 ${styles.card}`}
                classList={{
                  withoutRepo: isUndefined(item.oss) || !item.oss,
                }}
              >
                <button
                  class={`btn border-0 w-100 h-100 d-flex flex-row align-items-center ${styles.cardContent}`}
                  onClick={(e) => {
                    e.preventDefault();
                    updateActiveItemId(item.id);
                  }}
                  aria-label="Open item details"
                >
                  <Image name={item.name} class={`m-auto ${styles.logo}`} logo={item.logo} />
                </button>
              </div>
            );
          }}
        </For>
      </div>
      <div class="d-none d-sm-block ">
        <div ref={setContainer} class={`my-4 justify-content-start ${styles.grid}`} role="list">
          <Show when={containerWidth() > 0}>
            <For each={orderedItems()}>
              {(item: LandscapeItem) => <GridItem item={item} borderColor={COLORS[0]} showMoreInfo activeDropdown />}
            </For>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default SubcategoryGrid;

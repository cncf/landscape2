import isUndefined from 'lodash/isUndefined';
import throttle from 'lodash/throttle';
import { createSignal, onCleanup, onMount, Show } from 'solid-js';

import { COLORS } from '../../data';
import { BaseItem, Item } from '../../types';
import calculateGridItemsPerRow from '../../utils/calculateGridItemsPerRow';
import ItemIterator from '../../utils/itemsIterator';
import GridItem from '../explore/grid/GridItem';
import styles from './SubcategoryGrid.module.css';

interface Props {
  items?: (BaseItem | Item)[];
}

const SubcategoryGrid = (props: Props) => {
  const [container, setContainer] = createSignal<HTMLInputElement>();
  const [containerWidth, setContainerWidth] = createSignal<number>(0);

  const handler = () => {
    if (!isUndefined(container())) {
      setContainerWidth(container()!.offsetWidth);
    }
  };

  onMount(() => {
    window.addEventListener(
      'resize',
      // eslint-disable-next-line solid/reactivity
      throttle(() => handler(), 400)
    );
    handler();
  });

  onCleanup(() => {
    window.removeEventListener('resize', handler);
  });

  return (
    <Show when={!isUndefined(props.items)}>
      <div ref={setContainer} class={`my-4 ${styles.grid}`}>
        {(() => {
          const items = [];
          const itemsPerRow = calculateGridItemsPerRow(100, containerWidth(), 75, true);
          for (const item of new ItemIterator(props.items!, itemsPerRow)) {
            if (item) {
              items.push(<GridItem item={item} borderColor={COLORS[0]} showMoreInfo activeDropdown />);
            }
          }
          return items;
        })()}
      </div>
    </Show>
  );
};

export default SubcategoryGrid;

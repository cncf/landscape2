import { Image, useBreakpointDetect } from 'common';
import isUndefined from 'lodash/isUndefined';
import { For, Show } from 'solid-js';

import { BaseItem, Breakpoint, Item } from '../../../types';
import { useUpdateActiveItemId } from '../../stores/activeItem';
import { ItemsList } from '../grid/Grid';
import styles from './MobileGrid.module.css';

interface Props {
  items: (BaseItem | Item)[];
  bgColor: string;
}

const MobileGrid = (props: Props) => {
  const items = () => props.items;
  const updateActiveItemId = useUpdateActiveItemId();
  const gridWidth = () => window.innerWidth - 24; // device width - margin
  const { point } = useBreakpointDetect();
  const isMobile = () => !isUndefined(point()) && [Breakpoint.XS, Breakpoint.SM].includes(point()!);
  const itemsPerColumn = () => Math.floor(gridWidth() / 70);

  return (
    <div
      class={styles.items}
      style={
        isMobile()
          ? {
              '--card-size-width': `${(gridWidth() - 5) / itemsPerColumn() - 5}px`,
            }
          : {}
      }
    >
      <Show when={items().length > 0}>
        <Show
          when={isMobile()}
          fallback={
            <ItemsList
              borderColor={props.bgColor}
              items={items()}
              percentage={100}
              itemWidth={75}
              activeDropdown={false}
            />
          }
        >
          <For each={items()}>
            {(item: BaseItem | Item) => {
              return (
                <div
                  style={item.featured && item.featured.label ? { border: `2px solid ${props.bgColor}` } : {}}
                  class={`card rounded-0 position-relative p-0 ${styles.card}`}
                  classList={{
                    whithoutRepo: isUndefined(item.oss) || !item.oss,
                    archived: !isUndefined(item.maturity) && item.maturity === 'archived',
                  }}
                >
                  <button
                    class={`btn border-0 w-100 h-100 d-flex flex-row align-items-center ${styles.cardContent}`}
                    onClick={(e) => {
                      e.preventDefault();
                      updateActiveItemId(item.id);
                    }}
                  >
                    <Image name={item.name} class={`m-auto ${styles.logo}`} logo={item.logo} enableLazyLoad />
                  </button>
                </div>
              );
            }}
          </For>
        </Show>
      </Show>
    </div>
  );
};

export default MobileGrid;

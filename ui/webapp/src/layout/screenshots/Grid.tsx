import { cutString } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, For, on, Show } from 'solid-js';

import { DEFAULT_ZOOM_LEVELS, ZOOM_LEVELS } from '../../data';
import { BaseItem, Breakpoint } from '../../types';
import calculateGridItemsPerRow from '../../utils/calculateGridItemsPerRow';
import getGridCategoryLayout, {
  GridCategoryLayout,
  LayoutColumn,
  SubcategoryDetails,
} from '../../utils/gridCategoryLayout';
import { CategoryData } from '../../utils/itemsDataGetter';
import ItemIterator from '../../utils/itemsIterator';
import sortItemsByOrderValue from '../../utils/sortItemsByOrderValue';
import GridItem from '../explore/grid/GridItem';
import styles from './Grid.module.css';

const GRID_ITEM = ZOOM_LEVELS[DEFAULT_ZOOM_LEVELS[Breakpoint.XL]];

interface Props {
  categoryName: string;
  index: number;
  bgColor: string;
  isOverriden: boolean;
  subcategories: SubcategoryDetails[];
  categoryData: CategoryData;
}

interface ItemsProps {
  bgColor: string;
  items: BaseItem[];
  name: string;
}

const ItemsList = (props: ItemsProps) => {
  const [wrapper, setWrapper] = createSignal<HTMLDivElement>();
  const [items, setItems] = createSignal<BaseItem[]>();

  createEffect(
    on(wrapper, () => {
      if (isUndefined(items()) && !isUndefined(wrapper()) && wrapper()!.clientWidth > 0) {
        const itemsPerRow = calculateGridItemsPerRow(100, wrapper()!.clientWidth, GRID_ITEM[0], true);
        const itemsInGrid = [];
        for (const item of new ItemIterator(props.items, itemsPerRow)) {
          if (item) {
            itemsInGrid.push(item);
          }
        }
        setItems(itemsInGrid);
      }
    })
  );

  return (
    <div
      ref={setWrapper}
      class={styles.items}
      style={{
        '--card-size-width': `${GRID_ITEM[0]}px`,
        '--card-size-height': `${GRID_ITEM[1]}px`,
      }}
    >
      <Show when={!isUndefined(items)}>
        <For each={items()}>
          {(item: BaseItem) => {
            return (
              <GridItem
                item={item}
                borderColor={props.bgColor}
                showMoreInfo={false}
                activeDropdown={false}
                enableLazyLoad={false}
              />
            );
          }}
        </For>
      </Show>
    </div>
  );
};

const Grid = (props: Props) => {
  const [wrapper, setWrapper] = createSignal<HTMLDivElement>();
  const [grid, setGrid] = createSignal<GridCategoryLayout>();
  const [containerWidth, setContainerWidth] = createSignal<number>(0);

  createEffect(
    on(wrapper, () => {
      if (!isUndefined(wrapper()) && wrapper()!.clientWidth > 0) {
        setContainerWidth(wrapper()!.clientWidth);
      }
    })
  );

  createEffect(
    on(containerWidth, () => {
      if (isUndefined(grid()) && containerWidth() > 0) {
        setGrid(
          getGridCategoryLayout({
            containerWidth: containerWidth(),
            itemWidth: GRID_ITEM[0],
            categoryName: props.categoryName,
            isOverriden: props.isOverriden,
            subcategories: props.subcategories,
          })
        );
      }
    })
  );

  return (
    <div ref={setWrapper} class="d-flex flex-row">
      <div
        class={`text-white border border-3 border-white fw-medium border-end-0 d-flex flex-row align-items-center justify-content-end ${styles.catTitle}`}
        classList={{
          'border-bottom-0': props.index !== 0,
        }}
        style={{ 'background-color': props.bgColor }}
      >
        <div class={`text-center ${styles.catTitleText}`}>{cutString(props.categoryName, 33)}</div>
      </div>

      <div class="d-flex flex-column w-100 align-items-stretch">
        <Show when={!isUndefined(grid())}>
          <For each={grid()}>
            {(row, rowIndex) => {
              return (
                <div class="d-flex flex-nowrap w-100" classList={{ 'flex-grow-1': rowIndex() === grid.length - 1 }}>
                  <For each={row}>
                    {(subcat: LayoutColumn) => {
                      const items = props.categoryData[subcat.subcategoryName].items;
                      if (items.length === 0) return null;
                      const sortedItems: BaseItem[] = sortItemsByOrderValue(items);

                      return (
                        <div
                          classList={{
                            'border-top-0': props.index !== 0,
                            'border-bottom-0 col-12': subcat.percentage === 100,
                          }}
                          class="col d-flex flex-column border border-3 border-white border-start-0"
                          style={{ 'max-width': `${subcat.percentage}%` }}
                        >
                          <div
                            class={`d-flex align-items-center text-white w-100 fw-medium ${styles.subcatTitle}`}
                            style={{ 'background-color': props.bgColor }}
                          >
                            <div class="text-truncate">{subcat.subcategoryName}</div>
                          </div>
                          <div class={`flex-grow-1 ${styles.itemsContainer}`}>
                            <ItemsList name={subcat.subcategoryName} bgColor={props.bgColor} items={sortedItems} />
                          </div>
                        </div>
                      );
                    }}
                  </For>
                </div>
              );
            }}
          </For>
        </Show>
      </div>
    </div>
  );
};

export default Grid;

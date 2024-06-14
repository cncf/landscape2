import { A } from '@solidjs/router';
import { SVGIcon, SVGIconKind } from 'common';
import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, For, on, Show } from 'solid-js';

import { GRID_SIZE, GUIDE_PATH, ZOOM_LEVELS } from '../../../data';
import { BaseItem, Item } from '../../../types';
import calculateGridItemsPerRow from '../../../utils/calculateGridItemsPerRow';
import getNormalizedName from '../../../utils/getNormalizedName';
import getGridCategoryLayout, {
  GridCategoryLayout,
  LayoutColumn,
  MIN_COLUMN_ITEMS,
  SubcategoryDetails,
} from '../../../utils/gridCategoryLayout';
import isSectionInGuide from '../../../utils/isSectionInGuide';
import { CategoryData } from '../../../utils/itemsDataGetter';
import ItemIterator from '../../../utils/itemsIterator';
import sortItemsByOrderValue from '../../../utils/sortItemsByOrderValue';
import { useGridWidth } from '../../stores/gridWidth';
import { useSetVisibleZoom } from '../../stores/visibleZoomSection';
import { useZoomLevel } from '../../stores/zoom';
import styles from './Grid.module.css';
import GridItem from './GridItem';

interface Props {
  initialCategoryData: CategoryData;
  categoryName: string;
  isOverriden: boolean;
  subcategories: SubcategoryDetails[];
  backgroundColor: string;
  categoryIndex: number;
}

interface ItemsListProps {
  items: (BaseItem | Item)[];
  percentage: number;
  borderColor: string;
  itemWidth?: number;
  activeDropdown: boolean;
}

export const ItemsList = (props: ItemsListProps) => {
  const zoom = useZoomLevel();
  const gridWidth = useGridWidth();
  const percentage = () => props.percentage;
  const initialItems = () => props.items;
  const [items, setItems] = createSignal<(BaseItem | Item)[]>();
  const [itemsPerRow, setItemsPerRow] = createSignal<number>(0);

  const updateItemsPerRow = () => {
    setItemsPerRow(
      calculateGridItemsPerRow(
        percentage(),
        gridWidth(),
        props.itemWidth || ZOOM_LEVELS[zoom()][0],
        !isUndefined(props.itemWidth)
      )
    );
  };

  const prepareItems = () => {
    setItems((prev) => {
      const tmpItems: (BaseItem | Item)[] = [];

      for (const item of new ItemIterator(initialItems(), itemsPerRow() <= 0 ? MIN_COLUMN_ITEMS : itemsPerRow())) {
        if (item) {
          tmpItems.push(item);
        }
      }

      return !isEqual(tmpItems, prev) ? tmpItems : prev;
    });
  };

  createEffect(() => {
    const newItemsPerRow = calculateGridItemsPerRow(
      percentage(),
      gridWidth(),
      props.itemWidth || ZOOM_LEVELS[zoom()][0],
      !isUndefined(props.itemWidth)
    );
    if (newItemsPerRow !== itemsPerRow()) {
      setItemsPerRow(newItemsPerRow);
    } else {
      if (!isUndefined(items()) && initialItems().length !== items()!.length) {
        prepareItems();
      }
    }
  });

  createEffect(on(initialItems, () => updateItemsPerRow()));

  createEffect(
    on(itemsPerRow, () => {
      prepareItems();
    })
  );

  return (
    <For each={items()}>
      {(item: BaseItem | Item) => {
        return (
          <GridItem item={item} borderColor={props.borderColor} showMoreInfo activeDropdown={props.activeDropdown} />
        );
      }}
    </For>
  );
};

const Grid = (props: Props) => {
  const gridItemsSize = GRID_SIZE;
  const zoom = useZoomLevel();
  const updateActiveSection = useSetVisibleZoom();
  const [grid, setGrid] = createSignal<GridCategoryLayout | undefined>();
  const gridWidth = useGridWidth();
  const [prevSubcategories, setPrevSubcategories] = createSignal<SubcategoryDetails[]>();
  const subcategories = () => props.subcategories;
  const data = () => props.initialCategoryData;

  createEffect(() => {
    if (gridWidth() === 0) return;
    setGrid((prev) => {
      const newGrid = getGridCategoryLayout({
        containerWidth: gridWidth(),
        itemWidth: ZOOM_LEVELS[zoom()][0],
        categoryName: props.categoryName,
        isOverriden: props.isOverriden,
        subcategories: subcategories(),
      });

      return !isEqual(newGrid, prev) || !isEqual(subcategories(), prevSubcategories()) ? newGrid : prev;
    });
  });

  createEffect(
    on(grid, () => {
      setPrevSubcategories(subcategories());
    })
  );

  return (
    <Show when={!isUndefined(grid())}>
      <For each={grid()}>
        {(row, rowIndex) => {
          return (
            <div class="d-flex flex-nowrap w-100" classList={{ 'flex-grow-1': rowIndex() === grid()!.length - 1 }}>
              <For each={row}>
                {(subcat: LayoutColumn) => {
                  const items = () => data()[subcat.subcategoryName].items;
                  if (items().length === 0) return null;
                  const featuredItems = items().filter((item: BaseItem | Item) => !isUndefined(item.featured)).length;
                  const sortedItems: (BaseItem | Item)[] = sortItemsByOrderValue(items());

                  return (
                    <div
                      classList={{
                        'border-top-0': props.categoryIndex !== 0,
                        'border-bottom-0 col-12': subcat.percentage === 100,
                      }}
                      class="col d-flex flex-column border border-3 border-white border-start-0"
                      style={{ width: `${subcat.percentage}%`, 'min-width': `${subcat.percentage}%` }}
                    >
                      <div
                        class={`d-flex align-items-center text-white w-100 fw-medium ${styles.subcatTitle}`}
                        style={{ 'background-color': props.backgroundColor }}
                      >
                        <div class="text-truncate">{subcat.subcategoryName}</div>
                        <Show when={isSectionInGuide(props.categoryName, subcat.subcategoryName)}>
                          <div>
                            <A
                              href={`${GUIDE_PATH}#${getNormalizedName({
                                title: props.categoryName,
                                subtitle: subcat.subcategoryName,
                                grouped: true,
                              })}`}
                              state={{ from: 'explore' }}
                              class={`btn btn-link text-white ps-2 pe-1 ${styles.btnIcon}`}
                            >
                              <SVGIcon kind={SVGIconKind.Guide} />
                            </A>
                          </div>
                        </Show>

                        <Show when={isUndefined(gridItemsSize) || gridItemsSize !== 'large'}>
                          <div>
                            <button
                              onClick={() => {
                                updateActiveSection({
                                  category: props.categoryName,
                                  subcategory: subcat.subcategoryName,
                                  bgColor: props.backgroundColor,
                                });
                              }}
                              class={`btn btn-link text-white ps-1 pe-2 ${styles.btnIcon}`}
                            >
                              <SVGIcon kind={SVGIconKind.MagnifyingGlass} />
                            </button>
                          </div>
                        </Show>
                      </div>
                      <div class={`flex-grow-1 ${styles.itemsContainer}`}>
                        {/* Use ItemsList when subcategory has featured and no featured items */}
                        <Show
                          when={featuredItems > 0 && featuredItems < sortedItems.length}
                          fallback={
                            <div class={styles.items}>
                              <For each={sortedItems}>
                                {(item: BaseItem | Item) => {
                                  return (
                                    <GridItem
                                      item={item}
                                      borderColor={props.backgroundColor}
                                      showMoreInfo
                                      activeDropdown
                                    />
                                  );
                                }}
                              </For>
                            </div>
                          }
                        >
                          <div class={styles.items}>
                            <ItemsList
                              borderColor={props.backgroundColor}
                              items={sortedItems}
                              percentage={subcat.percentage}
                              activeDropdown
                            />
                          </div>
                        </Show>
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
  );
};

export default Grid;

import { A } from '@solidjs/router';
import { SVGIcon, SVGIconKind } from 'common';
import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createMemo, createSignal, For, on, Show } from 'solid-js';

import { GUIDE_PATH, ZOOM_LEVELS } from '../../../data';
import { BaseItem, Item } from '../../../types';
import calculateGridItemsPerRow from '../../../utils/calculateGridItemsPerRow';
import createIncrementalLimit from '../../../utils/createIncrementalLimit';
import getGridCategoryLayout, {
  GridCategoryLayout,
  LayoutColumn,
  MIN_COLUMN_ITEMS,
  SubcategoryDetails,
} from '../../../utils/gridCategoryLayout';
import isSectionInGuide from '../../../utils/isSectionInGuide';
import { CategoryData } from '../../../utils/itemsDataGetter';
import ItemIterator from '../../../utils/itemsIterator';
import buildNormalizedId from '../../../utils/normalizeId';
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
  const [itemsPerRow, setItemsPerRow] = createSignal<number>(0);

  const processedItems = createMemo<(BaseItem | Item)[]>(() => {
    const perRow = itemsPerRow();
    const source = initialItems();
    if (perRow <= 0) return source;

    const arranged: (BaseItem | Item)[] = [];
    for (const item of new ItemIterator(source, perRow <= 0 ? MIN_COLUMN_ITEMS : perRow)) {
      if (item) {
        arranged.push(item);
      }
    }

    return arranged;
  });

  const visibleLimit = createIncrementalLimit(() => processedItems().length, {
    enabled: () => processedItems().length > 0,
  });

  const visibleItems = createMemo(() => processedItems().slice(0, visibleLimit()));

  createEffect(() => {
    // Track dependencies to recalculate when layout inputs change
    initialItems();
    const newItemsPerRow = calculateGridItemsPerRow(
      percentage(),
      gridWidth(),
      props.itemWidth || ZOOM_LEVELS[zoom()][0],
      !isUndefined(props.itemWidth)
    );
    if (newItemsPerRow !== itemsPerRow()) {
      setItemsPerRow(newItemsPerRow);
    }
  });

  return (
    <For each={visibleItems()}>
      {(item: BaseItem | Item) => {
        return (
          <GridItem item={item} borderColor={props.borderColor} showMoreInfo activeDropdown={props.activeDropdown} />
        );
      }}
    </For>
  );
};

const Grid = (props: Props) => {
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
                  const sortedItems = createMemo<(BaseItem | Item)[]>(() => sortItemsByOrderValue(items()));
                  const featuredItems = createMemo(
                    () => sortedItems().filter((item: BaseItem | Item) => !isUndefined(item.featured)).length
                  );
                  const useDynamicLayout = createMemo(
                    () => featuredItems() > 0 && featuredItems() < sortedItems().length
                  );
                  const fallbackLimit = createIncrementalLimit(() => sortedItems().length, {
                    enabled: () => !useDynamicLayout() && sortedItems().length > 0,
                  });
                  const visibleFallbackItems = createMemo(() => {
                    if (useDynamicLayout()) return [];
                    return sortedItems().slice(0, fallbackLimit());
                  });

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
                              href={`${GUIDE_PATH}#${buildNormalizedId({
                                title: props.categoryName,
                                subtitle: subcat.subcategoryName,
                                grouped: true,
                              })}`}
                              state={{ from: 'explore' }}
                              class={`btn btn-link text-white ps-2 pe-1 ${styles.btnIcon}`}
                              aria-label={`Open ${subcat.subcategoryName} section on guide page`}
                            >
                              <SVGIcon kind={SVGIconKind.Guide} />
                            </A>
                          </div>
                        </Show>

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
                            aria-label={`Open ${subcat.subcategoryName} section on modal`}
                          >
                            <SVGIcon kind={SVGIconKind.MagnifyingGlass} />
                          </button>
                        </div>
                      </div>

                      <div class={`flex-grow-1 ${styles.itemsContainer}`}>
                        {/* Use ItemsList when subcategory has featured and no featured items */}
                        <Show
                          when={useDynamicLayout()}
                          fallback={
                            <div class={styles.items} role="list">
                              <For each={visibleFallbackItems()}>
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
                          <div class={styles.items} role="list">
                            <ItemsList
                              borderColor={props.backgroundColor}
                              items={sortedItems()}
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

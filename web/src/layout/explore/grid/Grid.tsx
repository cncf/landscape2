import { A } from '@solidjs/router';
import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, For, on, Show } from 'solid-js';

import { ZOOM_LEVELS } from '../../../data';
import { BaseItem, Item, SVGIconKind } from '../../../types';
import calculateGridItemsPerRow from '../../../utils/calculateGridItemsPerRow';
import getGridCategoryLayout, {
  GridCategoryLayout,
  LayoutColumn,
  MIN_COLUMN_ITEMS,
  SubcategoryDetails,
} from '../../../utils/gridCategoryLayout';
import isSectionInGuide from '../../../utils/isSectionInGuide';
import ItemIterator from '../../../utils/itemsIterator';
import { CategoryData } from '../../../utils/prepareData';
import slugify from '../../../utils/slugify';
import sortItemsByOrderValue from '../../../utils/sortItemsByOrderValue';
import SVGIcon from '../../common/SVGIcon';
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
}

const ItemsList = (props: ItemsListProps) => {
  const zoom = useZoomLevel();
  const gridWidth = useGridWidth();
  const percentage = () => props.percentage;
  const initialItems = () => props.items;
  const [items, setItems] = createSignal<(BaseItem | Item)[]>();
  const [itemsPerRow, setItemsPerRow] = createSignal<number>(0);

  createEffect(() => {
    setItemsPerRow(calculateGridItemsPerRow(percentage(), gridWidth(), ZOOM_LEVELS[zoom()][0]));
  });

  createEffect(
    on(itemsPerRow, () => {
      setItems((prev) => {
        const tmpItems: (BaseItem | Item)[] = [];

        for (const item of new ItemIterator(initialItems(), itemsPerRow() <= 0 ? MIN_COLUMN_ITEMS : itemsPerRow())) {
          if (item) {
            tmpItems.push(item);
          }
        }

        return !isEqual(tmpItems, items()) ? tmpItems : prev;
      });
    })
  );

  return (
    <div class={styles.items}>
      <For each={items()}>
        {(item: BaseItem | Item) => {
          return <GridItem item={item} borderColor={props.borderColor} showMoreInfo activeDropdown />;
        }}
      </For>
    </div>
  );
};

const Grid = (props: Props) => {
  const gridItemsSize = window.baseDS.grid_items_size;
  const zoom = useZoomLevel();
  const updateActiveSection = useSetVisibleZoom();
  const [grid, setGrid] = createSignal<GridCategoryLayout | undefined>();
  const gridWidth = useGridWidth();

  createEffect(() => {
    setGrid((prev) => {
      const newGrid = getGridCategoryLayout({
        containerWidth: gridWidth(),
        itemWidth: ZOOM_LEVELS[zoom()][0],
        categoryName: props.categoryName,
        isOverriden: props.isOverriden,
        subcategories: props.subcategories,
      });

      return !isEqual(newGrid, prev) ? newGrid : prev;
    });
  });

  return (
    <Show when={!isUndefined(grid())}>
      <For each={grid()}>
        {(row, rowIndex) => {
          return (
            <div class="d-flex flex-nowrap w-100" classList={{ 'flex-grow-1': rowIndex() === grid.length - 1 }}>
              <For each={row}>
                {(subcat: LayoutColumn) => {
                  const items = props.initialCategoryData[subcat.subcategoryName].items;
                  if (items.length === 0) return null;
                  const featuredItems = items.filter((item: BaseItem | Item) => !isUndefined(item.featured)).length;
                  const sortedItems: (BaseItem | Item)[] = sortItemsByOrderValue(items);
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
                        {isSectionInGuide(props.categoryName, subcat.subcategoryName) && (
                          <div>
                            <A
                              href={`/guide#${slugify(`${props.categoryName} ${subcat.subcategoryName}`)}`}
                              state={{ from: 'explore' }}
                              class={`btn btn-link text-white ps-2 pe-1 ${styles.btnIcon}`}
                            >
                              <SVGIcon kind={SVGIconKind.Guide} />
                            </A>
                          </div>
                        )}

                        {(isUndefined(gridItemsSize) || gridItemsSize !== 'large') && (
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
                        )}
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
                          <ItemsList
                            borderColor={props.backgroundColor}
                            items={sortedItems}
                            percentage={subcat.percentage}
                          />
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

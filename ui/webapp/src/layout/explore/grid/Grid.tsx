import { A } from '@solidjs/router';
import { SVGIcon, SVGIconKind } from 'common';
import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createMemo, createSignal, For, on, Show } from 'solid-js';

import { GUIDE_PATH, ZOOM_LEVELS } from '../../../data';
import { LandscapeItem } from '../../../types';
import { getAnchorId } from '../../../utils/anchorIds';
import calculateGridItemsPerRow from '../../../utils/calculateGridItemsPerRow';
import getGridCategoryLayout, {
  GridCategoryLayout,
  LayoutColumn,
  SubcategoryDetails,
} from '../../../utils/gridCategoryLayout';
import { MIN_COLUMN_ITEMS } from '../../../utils/gridGeometry';
import isSectionInGuide from '../../../utils/isSectionInGuide';
import { CategoryData } from '../../../utils/itemsDataGetter';
import ItemIterator from '../../../utils/itemsIterator';
import sortItemsByOrderValue from '../../../utils/sortItemsByOrderValue';
import { useFeaturedItems } from '../../stores/featuredItems';
import { useGridWidth } from '../../stores/gridWidth';
import { useSetVisibleZoom } from '../../stores/visibleZoomSection';
import { useZoomLevel } from '../../stores/zoom';
import styles from './Grid.module.css';
import GridItem from './GridItem';

interface Props {
  // Undefined while a category left without items by the filters is being removed
  initialCategoryData: CategoryData | undefined;
  categoryName: string;
  isOverridden: boolean;
  subcategories: SubcategoryDetails[];
  backgroundColor: string;
  categoryIndex: number;
}

interface ItemsListProps {
  items: LandscapeItem[];
  percentage: number;
  borderColor: string;
  itemWidth?: number;
  activeDropdown: boolean;
}

export const ItemsList = (props: ItemsListProps) => {
  const zoom = useZoomLevel();
  const gridWidth = useGridWidth();
  const { withEffectiveFeatured } = useFeaturedItems();
  const itemsPerRow = createMemo(() =>
    calculateGridItemsPerRow(
      props.percentage,
      gridWidth(),
      props.itemWidth || ZOOM_LEVELS[zoom()][0],
      !isUndefined(props.itemWidth)
    )
  );

  // Items with the featured status of the active group, only computed again when the items or the
  // group change (not on a new row width or zoom level)
  const effectiveItems = createMemo(() => withEffectiveFeatured(props.items));

  // Items in grid order, rebuilt whenever a new list arrives. The rendered list is kept
  // when it holds the same items in the same order, so a recomputation renders nothing
  const items = createMemo<LandscapeItem[]>((prev) => {
    const orderedItems: LandscapeItem[] = [];
    for (const item of new ItemIterator(effectiveItems(), itemsPerRow() <= 0 ? MIN_COLUMN_ITEMS : itemsPerRow())) {
      if (item) {
        orderedItems.push(item);
      }
    }
    return haveSameLayout(prev, orderedItems) ? prev : orderedItems;
  }, []);

  return (
    <For each={items()}>
      {(item: LandscapeItem) => {
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
  const { countFeaturedItems, withEffectiveFeatured } = useFeaturedItems();
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
        isOverridden: props.isOverridden,
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
                  const items = () => data()?.[subcat.subcategoryName]?.items ?? [];
                  // Apply effective featured status before counting and sorting
                  const sortedItems = createMemo<LandscapeItem[]>(() =>
                    sortItemsByOrderValue(withEffectiveFeatured(items()))
                  );
                  const featuredItemsCount = createMemo(() => countFeaturedItems(sortedItems()));

                  return (
                    <Show when={sortedItems().length > 0}>
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
                          <Show
                            when={
                              isSectionInGuide(props.categoryName, subcat.subcategoryName) &&
                              getAnchorId({
                                title: props.categoryName,
                                subtitle: subcat.subcategoryName,
                                grouped: true,
                              })
                            }
                          >
                            {(guideAnchorId) => (
                              <div>
                                <A
                                  href={`${GUIDE_PATH}#${guideAnchorId()}`}
                                  state={{ from: 'explore' }}
                                  class={`btn btn-link text-white ps-2 pe-1 ${styles.btnIcon}`}
                                  aria-label={`Open ${subcat.subcategoryName} section on guide page`}
                                >
                                  <SVGIcon kind={SVGIconKind.Guide} />
                                </A>
                              </div>
                            )}
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
                            when={featuredItemsCount() > 0 && featuredItemsCount() < sortedItems().length}
                            fallback={
                              <div class={styles.items} role="list">
                                <For each={sortedItems()}>
                                  {(item: LandscapeItem) => {
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
                    </Show>
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

/**
 * Checks whether two lists of grid items hold the same item objects in the same order. Item
 * objects are compared by identity, so the full items replace the base ones when the full data
 * loads, and an item whose featured status changes in the group (a different object) is rendered again.
 */
const haveSameLayout = (prev: LandscapeItem[], next: LandscapeItem[]): boolean =>
  prev.length === next.length && prev.every((item, index) => item === next[index]);

import { createElementSize } from '@solid-primitives/resize-observer';
import { Loading, NoData } from 'common';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { Accessor, createEffect, createMemo, createSignal, For, Match, on, Show, Switch } from 'solid-js';

import { ITEM_VIEW, ZOOM_LEVELS } from '../../../data';
import { BaseItem, LandscapeItem } from '../../../types';
import calculateGridItemsPerRow from '../../../utils/calculateGridItemsPerRow';
import calculateGridWidthInPx from '../../../utils/calculateGridWidthInPx';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import sortItemsByOrderValue from '../../../utils/sortItemsByOrderValue';
import GridItem from '../../explore/grid/GridItem';
import { useFullDataReady, useFullDataStatus } from '../../stores/fullData';
import { useSetVisibleZoom, useVisibleZoom } from '../../stores/visibleZoomSection';
import FullScreenModal from '../FullScreenModal';
import { FullDataError } from '../RequireFullData';
import styles from './ZoomModal.module.css';

const GAP = 40; // Title
const CARD_WIDTH = ZOOM_LEVELS[10][0];

const ZoomModal = () => {
  const visibleZoomSection = useVisibleZoom();
  const fullDataReady = useFullDataReady();
  const fullDataStatus = useFullDataStatus();
  const updateActiveSection = useSetVisibleZoom();
  const [container, setContainer] = createSignal<HTMLDivElement>();
  const [itemsWrapper, setItemsWrapper] = createSignal<HTMLDivElement>();
  const [modal, setModal] = createSignal<HTMLDivElement>();
  const [gridContainer, setGridContainer] = createSignal<HTMLDivElement>();
  const [overflowGrid, setOverflowGrid] = createSignal<boolean>(false);
  const size = createElementSize(container);
  const containerWidth = createMemo(() => (isNull(size.width) ? '' : getGridWidth(size.width - GAP)));

  // Items of the visible section sorted by their order, undefined until the full data is ready
  const items = createMemo<BaseItem[] | undefined>(() => {
    const section = visibleZoomSection();
    if (isUndefined(section) || !fullDataReady()) return undefined;
    return sortItemsByOrderValue(itemsDataGetter.getItemsBySection(section) ?? []);
  });

  createEffect(
    on(itemsWrapper, (wrapper) => {
      if (!isUndefined(wrapper)) {
        setOverflowGrid(wrapper.clientHeight < wrapper.scrollHeight);
      }
    })
  );

  return (
    <Show when={visibleZoomSection()}>
      {(section) => (
        <FullScreenModal
          open
          initialRefs={[modal as Accessor<HTMLDivElement>]}
          excludedIds={[ITEM_VIEW]}
          onClose={() => updateActiveSection()}
          title={`${section().category} / ${section().subcategory}`}
        >
          <div class="h-100" ref={setContainer}>
            <Switch
              fallback={
                <div class={`d-flex flex-column p-5 ${styles.loadingWrapper}`}>
                  <Loading transparentBg />
                </div>
              }
            >
              <Match when={fullDataStatus() === 'error'}>
                <div class="d-flex flex-column justify-content-center p-4 p-xl-5 h-100">
                  <div ref={setModal} class="bg-white">
                    <FullDataError message="We couldn't load the items of this section." />
                  </div>
                </div>
              </Match>
              <Match when={items()?.length === 0}>
                <div class="d-flex flex-column justify-content-center p-4 p-xl-5 h-100">
                  <div ref={setModal} class="bg-white">
                    <NoData>We couldn't find any items in this section.</NoData>
                  </div>
                </div>
              </Match>
              <Match when={!isUndefined(items())}>
                <div class="d-flex flex-column align-items-center justify-content-center p-4 p-xl-5 h-100">
                  <div
                    ref={setModal}
                    class={`d-flex flex-row m-auto ${styles.wrapper}`}
                    style={{ width: containerWidth() }}
                  >
                    <div
                      class={`text-white border border-3 border-white fw-semibold p-2 py-5 ${styles.catTitle}`}
                      style={{ 'background-color': section().bgColor }}
                    >
                      <div class="d-flex flex-row align-items-start justify-content-end">
                        <div>{section().category}</div>
                      </div>
                    </div>

                    <div ref={setGridContainer} class="d-flex flex-column align-items-stretch w-100">
                      <div
                        class={'col-12 d-flex flex-column border border-3 border-white border-start-0 border-bottom-0'}
                      >
                        <div
                          class={`d-flex align-items-center text-white justify-content-center text-center px-2 w-100 fw-semibold ${styles.subcatTitle}`}
                          style={{ 'background-color': section().bgColor }}
                        >
                          <div class="text-truncate">{section().subcategory}</div>
                        </div>
                      </div>
                      {/* overflow-auto only necessary when items exceeds height */}
                      <div
                        ref={setItemsWrapper}
                        class={`h-100 ${styles.content}`}
                        classList={{ 'overflow-auto': overflowGrid() }}
                      >
                        <div class={styles.grid}>
                          <For each={items()}>
                            {(item: LandscapeItem) => {
                              return (
                                <GridItem
                                  item={item}
                                  borderColor={section().bgColor}
                                  container={gridContainer()}
                                  showMoreInfo
                                  activeDropdown
                                />
                              );
                            }}
                          </For>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Match>
            </Switch>
          </div>
        </FullScreenModal>
      )}
    </Show>
  );
};

/** Returns the CSS width of a grid with an odd number of columns that fits in the container width given. */
const getGridWidth = (containerWidth: number): string => {
  if (containerWidth <= 0) return '';
  const numItems = calculateGridItemsPerRow(100, containerWidth, CARD_WIDTH);
  return calculateGridWidthInPx(numItems % 2 === 0 ? numItems - 1 : numItems, CARD_WIDTH);
};

export default ZoomModal;

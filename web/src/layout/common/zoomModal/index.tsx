import { createElementSize } from '@solid-primitives/resize-observer';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { Accessor, createEffect, createSignal, For, Show, untrack } from 'solid-js';

import { ZOOM_LEVELS } from '../../../data';
import { BaseItem, Item } from '../../../types';
import calculateGridItemsPerRow from '../../../utils/calculateGridItemsPerRow';
import calculateGridWidthInPx from '../../../utils/calculateGridWidthInPx';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import sortItemsByOrderValue from '../../../utils/sortItemsByOrderValue';
import GridItem from '../../explore/grid/GridItem';
import { useFullDataReady } from '../../stores/fullData';
import { useSetVisibleZoom, useVisibleZoom } from '../../stores/visibleZoomSection';
import FullScreenModal from '../FullScreenModal';
import Loading from '../Loading';
import styles from './ZoomModal.module.css';

const GAP = 96 + 40; // Padding | Title
const CARD_WIDTH = ZOOM_LEVELS[10][0];

const ZoomModal = () => {
  const visibleZoomSection = useVisibleZoom();
  const fullDataReady = useFullDataReady();
  const updateActiveSection = useSetVisibleZoom();
  const [container, setContainer] = createSignal<HTMLDivElement>();
  const [modal, setModal] = createSignal<HTMLDivElement>();
  const [items, setItems] = createSignal<Item[] | undefined | null>();
  const [containerWidth, setContainerWidth] = createSignal<string>('');
  const size = createElementSize(container);

  createEffect(() => {
    if (!isNull(size.width)) {
      setContainerWidth(checkNumColumns(size.width - GAP));
    }
  });

  const checkNumColumns = (containerWidth: number): string => {
    const numItems = calculateGridItemsPerRow(100, containerWidth, CARD_WIDTH);
    if (containerWidth > 0) {
      if (numItems % 2 === 0) {
        return calculateGridWidthInPx(numItems - 1, CARD_WIDTH);
      } else {
        return calculateGridWidthInPx(numItems, CARD_WIDTH);
      }
    }
    return '';
  };

  createEffect(() => {
    async function fetchItems() {
      try {
        setItems(await itemsDataGetter.filterItemsBySection(visibleZoomSection()!));
      } catch {
        setItems(null);
      }
    }

    if (visibleZoomSection() && fullDataReady()) {
      if (isUndefined(items())) {
        fetchItems();
      }
    } else {
      setItems(undefined);
    }
    untrack(containerWidth);
  });

  return (
    <Show when={!isUndefined(visibleZoomSection())}>
      <FullScreenModal
        open
        initialRefs={!isUndefined(modal()) ? [modal as Accessor<HTMLDivElement>] : undefined}
        onClose={() => updateActiveSection()}
      >
        <div class="h-100" ref={setContainer}>
          <Show
            when={!isUndefined(items())}
            fallback={
              <div class={`d-flex flex-column p-5 ${styles.loadingWrapper}`}>
                <Loading transparentBg />
              </div>
            }
          >
            <div class="d-flex flex-column p-5 h-100">
              <div
                ref={setModal}
                class={`d-flex flex-row m-auto ${styles.wrapper}`}
                style={{ width: containerWidth() !== '' ? containerWidth() : '100%', 'max-width': '100%' }}
              >
                <div
                  class={`text-white border border-3 border-white fw-semibold p-2 py-5 ${styles.catTitle}`}
                  style={{ 'background-color': visibleZoomSection()!.bgColor }}
                >
                  <div class="d-flex flex-row align-items-start justify-content-end">
                    <div>{visibleZoomSection()!.category}</div>
                  </div>
                </div>

                <div class="d-flex flex-column align-items-stretch w-100">
                  <div class={'col-12 d-flex flex-column border border-3 border-white border-start-0 border-bottom-0'}>
                    <div
                      class={`d-flex align-items-center text-white justify-content-center text-center px-2 w-100 fw-semibold ${styles.subcatTitle}`}
                      style={{ 'background-color': visibleZoomSection()!.bgColor }}
                    >
                      <div class="text-truncate">{visibleZoomSection()!.subcategory}</div>
                    </div>
                  </div>
                  <div class={`h-100 overflow-auto ${styles.content}`}>
                    <div class={styles.grid}>
                      <For each={sortItemsByOrderValue(items()!)}>
                        {(item: BaseItem | Item) => {
                          return (
                            <GridItem
                              item={item}
                              borderColor={visibleZoomSection()!.bgColor}
                              showMoreInfo={false}
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
          </Show>
        </div>
      </FullScreenModal>
    </Show>
  );
};

export default ZoomModal;

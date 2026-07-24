import { ItemModalContent, ItemModalMobileContent, Loading, Modal, NoData, useBreakpointDetect } from 'common';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { batch, createEffect, createSignal, Show } from 'solid-js';

import {
  BASE_PATH,
  FOUNDATION,
  HIDE_ORGANIZATION_SECTION_IN_PROJECTS,
  ITEM_VIEW,
  SMALL_DEVICES_BREAKPOINTS,
} from '../../../data';
import { Item } from '../../../types';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { useActiveItemId, useUpdateActiveItemId } from '../../stores/activeItem';
import { useFullDataReady } from '../../stores/fullData';
import { useEventVisibleContent } from '../../stores/upcomingEventData';
import styles from './ItemModal.module.css';

const ItemModal = () => {
  const fullDataReady = useFullDataReady();
  const visibleItemId = useActiveItemId();
  const updateActiveItemId = useUpdateActiveItemId();
  const visibleEventContent = useEventVisibleContent();
  const [itemInfo, setItemInfo] = createSignal<Item | null | undefined>(undefined);
  const [parentInfo, setParentInfo] = createSignal<Item>();
  const { point } = useBreakpointDetect();
  let activeRequestId = 0;

  const fetchItemInfo = async (itemId: string, requestId: number) => {
    try {
      const item = await itemsDataGetter.getItemById(itemId);
      const parentItem = !isUndefined(item?.parent_project)
        ? await itemsDataGetter.getItemByName(item.parent_project)
        : undefined;
      if (requestId !== activeRequestId) return;

      batch(() => {
        setItemInfo(item ?? null);
        setParentInfo(parentItem);
      });
    } catch {
      if (requestId === activeRequestId) {
        setItemInfo(null);
      }
    }
  };

  createEffect(() => {
    const itemId = visibleItemId();
    const requestId = ++activeRequestId;

    if (itemId && fullDataReady()) {
      batch(() => {
        setItemInfo(undefined);
        setParentInfo(undefined);
      });
      void fetchItemInfo(itemId, requestId);
    } else {
      batch(() => {
        setItemInfo(undefined);
        setParentInfo(undefined);
      });
    }
  });

  return (
    <Show when={!isUndefined(visibleItemId())}>
      <Modal
        title="Item details"
        size="xl"
        open
        modalDialogClass={visibleEventContent() ? styles.visibleUpcomingEvent : ''}
        bodyClass={styles.modalBody}
        onClose={() => updateActiveItemId()}
        id={ITEM_VIEW}
      >
        <Show
          when={!isUndefined(itemInfo())}
          fallback={
            <div class={`d-flex flex-column p-5 ${styles.stateWrapper}`}>
              <Loading />
            </div>
          }
        >
          <Show
            when={!isNull(itemInfo())}
            fallback={
              <div class={`d-flex flex-column align-items-center justify-content-center p-5 ${styles.stateWrapper}`}>
                <NoData>
                  <>
                    <div class="fs-4">We couldn't find this item.</div>
                    <p class="h6 mt-3 mb-0 lh-base">It may have been removed or the link may be incorrect.</p>
                  </>
                </NoData>
              </div>
            }
          >
            <Show
              when={isUndefined(point()) || !SMALL_DEVICES_BREAKPOINTS.includes(point()!)}
              fallback={
                <ItemModalMobileContent
                  item={itemInfo()}
                  foundation={FOUNDATION}
                  parentInfo={parentInfo()}
                  onClose={() => updateActiveItemId()}
                  hideOrganizationSection={HIDE_ORGANIZATION_SECTION_IN_PROJECTS}
                />
              }
            >
              <ItemModalContent
                item={itemInfo()}
                foundation={FOUNDATION}
                basePath={BASE_PATH}
                parentInfo={parentInfo()}
                onClose={() => updateActiveItemId()}
                hideOrganizationSection={HIDE_ORGANIZATION_SECTION_IN_PROJECTS}
              />
            </Show>
          </Show>
        </Show>
      </Modal>
    </Show>
  );
};

export default ItemModal;

import { ItemModalContent, ItemModalMobileContent, Loading, Modal, useBreakpointDetect } from 'common';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, Show } from 'solid-js';

import { BASE_PATH, FOUNDATION, ITEM_VIEW, SMALL_DEVICES_BREAKPOINTS } from '../../../data';
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

  createEffect(() => {
    async function fetchItemInfo() {
      try {
        const itemTmp = await itemsDataGetter.getItemById(visibleItemId()! as string);
        if (!isUndefined(itemTmp) && !isUndefined(itemTmp!.parent_project)) {
          const parentItem = await itemsDataGetter.getItemByName(itemTmp.parent_project);
          if (!isUndefined(parentItem)) {
            setParentInfo(parentItem);
          }
        }
        setItemInfo(itemTmp);
      } catch {
        setItemInfo(null);
      }
    }

    if (visibleItemId() && fullDataReady()) {
      fetchItemInfo();
    } else {
      setItemInfo(undefined);
    }
  });

  return (
    <Show when={!isUndefined(visibleItemId())}>
      <Modal
        size="xl"
        open
        modalDialogClass={visibleEventContent() ? styles.visibleUpcomingEvent : ''}
        bodyClass={styles.modalBody}
        onClose={() => updateActiveItemId()}
        id={ITEM_VIEW}
      >
        <Show
          when={!isUndefined(itemInfo()) && !isNull(itemInfo())}
          fallback={
            <div class={`d-flex flex-column p-5 ${styles.loadingWrapper}`}>
              <Loading />
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
              />
            }
          >
            <ItemModalContent
              item={itemInfo()}
              foundation={FOUNDATION}
              basePath={BASE_PATH}
              parentInfo={parentInfo()}
              onClose={() => updateActiveItemId()}
            />
          </Show>
        </Show>
      </Modal>
    </Show>
  );
};

export default ItemModal;

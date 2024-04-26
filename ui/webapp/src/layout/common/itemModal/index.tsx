import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, Show } from 'solid-js';

import { SMALL_DEVICES_BREAKPOINTS } from '../../../data';
import useBreakpointDetect from '../../../hooks/useBreakpointDetect';
import { Item } from '../../../types';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { useActiveItemId, useUpdateActiveItemId } from '../../stores/activeItem';
import { useFullDataReady } from '../../stores/fullData';
import { useEventVisibleContent } from '../../stores/upcomingEventData';
import Loading from '../Loading';
import Modal from '../Modal';
import Content from './Content';
import styles from './ItemModal.module.css';
import MobileContent from './MobileContent';

const ItemModal = () => {
  const fullDataReady = useFullDataReady();
  const visibleItemId = useActiveItemId();
  const updateActiveItemId = useUpdateActiveItemId();
  const visibleEventContent = useEventVisibleContent();
  const [itemInfo, setItemInfo] = createSignal<Item | null | undefined>(undefined);
  const { point } = useBreakpointDetect();

  createEffect(() => {
    async function fetchItemInfo() {
      try {
        const itemTmp = await itemsDataGetter.getItemById(visibleItemId()! as string);
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
            fallback={<MobileContent item={itemInfo()} />}
          >
            <Content item={itemInfo()} />
          </Show>
        </Show>
      </Modal>
    </Show>
  );
};

export default ItemModal;

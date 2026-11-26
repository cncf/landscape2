import {
  ItemModalContent,
  ItemModalMobileContent,
  Loading,
  Modal,
  NoData,
  SMALL_DEVICES_BREAKPOINTS,
  useBreakpointDetect,
} from 'common';
import isUndefined from 'lodash/isUndefined';
import { createMemo, Match, Show, Switch } from 'solid-js';

import { BASE_PATH, FOUNDATION, HIDE_ORGANIZATION_SECTION_IN_PROJECTS, ITEM_VIEW } from '../../../data';
import { Item } from '../../../types';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { useActiveItemId, useUpdateActiveItemId } from '../../stores/activeItem';
import { useFullDataReady, useFullDataStatus } from '../../stores/fullData';
import { useEventVisibleContent } from '../../stores/upcomingEvent';
import { FullDataError } from '../RequireFullData';
import styles from './ItemModal.module.css';

const ItemModal = () => {
  const fullDataReady = useFullDataReady();
  const fullDataStatus = useFullDataStatus();
  const visibleItemId = useActiveItemId();
  const updateActiveItemId = useUpdateActiveItemId();
  const visibleEventContent = useEventVisibleContent();
  const { point } = useBreakpointDetect();

  // Item of the URL once the full data is ready: undefined while loading, null when missing
  const itemInfo = createMemo<Item | null | undefined>(() => {
    const itemId = visibleItemId();
    if (!itemId || !fullDataReady()) return undefined;
    return itemsDataGetter.getItemById(itemId) ?? null;
  });
  const parentInfo = createMemo<Item | undefined>(() => {
    const parentProject = itemInfo()?.parent_project;
    return isUndefined(parentProject) ? undefined : itemsDataGetter.getItemByName(parentProject);
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
        <Switch
          fallback={
            <div class={`d-flex flex-column p-5 ${styles.stateWrapper}`}>
              <Loading />
            </div>
          }
        >
          <Match when={fullDataStatus() === 'error'}>
            <div class={`d-flex flex-column align-items-center justify-content-center p-5 ${styles.stateWrapper}`}>
              <FullDataError message="We couldn't load the item details." />
            </div>
          </Match>
          <Match when={itemInfo() === null}>
            <div class={`d-flex flex-column align-items-center justify-content-center p-5 ${styles.stateWrapper}`}>
              <NoData>
                <>
                  <div class="fs-4">We couldn't find this item.</div>
                  <p class="h6 mt-3 mb-0 lh-base">It may have been removed or the link may be incorrect.</p>
                </>
              </NoData>
            </div>
          </Match>
          <Match when={itemInfo()}>
            {(item) => (
              <Show
                when={!SMALL_DEVICES_BREAKPOINTS.includes(point())}
                fallback={
                  <ItemModalMobileContent
                    item={item()}
                    foundation={FOUNDATION}
                    parentInfo={parentInfo()}
                    hideOrganizationSection={HIDE_ORGANIZATION_SECTION_IN_PROJECTS}
                  />
                }
              >
                <ItemModalContent
                  item={item()}
                  foundation={FOUNDATION}
                  basePath={BASE_PATH}
                  parentInfo={parentInfo()}
                  hideOrganizationSection={HIDE_ORGANIZATION_SECTION_IN_PROJECTS}
                />
              </Show>
            )}
          </Match>
        </Switch>
      </Modal>
    </Show>
  );
};

export default ItemModal;

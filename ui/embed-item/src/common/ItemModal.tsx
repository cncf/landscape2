import {
  Item,
  ItemModalContent,
  ItemModalMobileContent,
  Loading,
  Modal,
  NoData,
  SMALL_DEVICES_BREAKPOINTS,
  useBreakpointDetect,
} from 'common';
import { Match, Show, Switch } from 'solid-js';
import { css } from 'solid-styled-components';

interface Props {
  foundation: string;
  itemLoadStatus: ItemLoadStatus;
  onClose: () => void;
  onRetry: () => void;
  hideOrganizationSection?: boolean;
  itemInfo?: Item;
  parentInfo?: Item;
}

export type ItemLoadStatus = 'error' | 'loading' | 'not-found' | 'ready';

const ModalClass = css`
  line-height: 1.5;
  min-height: calc(100% - 6rem) !important;
  max-height: calc(100% - 6rem) !important;
  margin: 3em auto !important;
`;

const LoadingWrapper = css`
  min-height: 300px;
`;

/**
 * Item details modal of the embed item view: the loading, error and not-found
 * states, and the desktop or mobile item details depending on the viewport
 * breakpoint (the mobile content on small devices, like the web application).
 */
const ItemModal = (props: Props) => {
  const { point } = useBreakpointDetect();
  const isDesktop = () => !SMALL_DEVICES_BREAKPOINTS.includes(point());

  return (
    <Modal title="Embeddable item details" size="xl" onClose={props.onClose} modalDialogClass={ModalClass} open>
      <Switch>
        <Match when={props.itemLoadStatus === 'loading'}>
          <div class={LoadingWrapper}>
            <Loading />
          </div>
        </Match>
        <Match when={props.itemLoadStatus === 'error'}>
          <NoData>
            <div class="d-flex flex-column align-items-center py-5">
              <div class="fs-5">We couldn't load this item.</div>
              <button type="button" class="btn btn-secondary mt-3" onClick={() => props.onRetry()}>
                Try again
              </button>
            </div>
          </NoData>
        </Match>
        <Match when={props.itemLoadStatus === 'not-found'}>
          <NoData>
            <div class="fs-5 text-center py-5">We couldn't find this item.</div>
          </NoData>
        </Match>
        <Match when={props.itemLoadStatus === 'ready'}>
          <Show when={props.itemInfo}>
            {(item) => (
              <Show
                when={isDesktop()}
                fallback={
                  <ItemModalMobileContent
                    item={item()}
                    foundation={props.foundation}
                    hideOrganizationSection={props.hideOrganizationSection}
                    parentInfo={props.parentInfo}
                  />
                }
              >
                <ItemModalContent
                  item={item()}
                  foundation={props.foundation}
                  hideOrganizationSection={props.hideOrganizationSection}
                  parentInfo={props.parentInfo}
                />
              </Show>
            )}
          </Show>
        </Match>
      </Switch>
    </Modal>
  );
};

export default ItemModal;

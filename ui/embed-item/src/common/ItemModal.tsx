import { createWindowSize } from '@solid-primitives/resize-observer';
import { Item, ItemModalContent, ItemModalMobileContent, Loading, Modal, NoData } from 'common';
import { Match, Show, Switch } from 'solid-js';
import { css } from 'solid-styled-components';

interface Props {
  activeItemId: string | null;
  foundation: string;
  hideOrganizationSection?: boolean;
  itemInfo?: Item | null;
  itemLoadStatus: ItemLoadStatus;
  onClose: () => void;
  onRetry: () => void;
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

const ItemModal = (props: Props) => {
  const activeItemId = () => props.activeItemId;
  const itemInfo = () => props.itemInfo;
  const size = createWindowSize();
  const width = () => size.width;

  return (
    <Show when={activeItemId() !== null}>
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
          <Match when={props.itemLoadStatus === 'ready' && itemInfo()}>
            <Show
              when={width() > 1200}
              fallback={
                <ItemModalMobileContent
                  item={itemInfo()}
                  foundation={props.foundation}
                  hideOrganizationSection={props.hideOrganizationSection}
                />
              }
            >
              <ItemModalContent
                item={itemInfo()}
                foundation={props.foundation}
                hideOrganizationSection={props.hideOrganizationSection}
              />
            </Show>
          </Match>
        </Switch>
      </Modal>
    </Show>
  );
};

export default ItemModal;

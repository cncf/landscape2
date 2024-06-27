import { createWindowSize } from '@solid-primitives/resize-observer';
import { Item, ItemModalContent, ItemModalMobileContent, Loading, Modal } from 'common';
import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

interface Props {
  activeItemId: string | null;
  foundation: string;
  itemInfo?: Item | null;
  onClose: () => void;
}

const ModalClass = css`
  min-height: calc(100% - 6rem) !important;
  max-height: calc(100% - 6rem) !important;
  margin: 3em auto !important;
`;

const ModalBodyClass = css`
  padding: 1.5rem;
  min-height: 250px;
`;

const ItemModal = (props: Props) => {
  const activeItemId = () => props.activeItemId;
  const itemInfo = () => props.itemInfo;
  const size = createWindowSize();
  const width = () => size.width;

  return (
    <Show when={activeItemId() !== null}>
      <Modal size="xl" onClose={props.onClose} modalDialogClass={ModalClass} bodyClass={ModalBodyClass} open>
        <Show when={itemInfo()} fallback={<Loading />}>
          <Show
            when={width() > 1200}
            fallback={<ItemModalMobileContent item={itemInfo()} foundation={props.foundation} />}
          >
            <ItemModalContent item={itemInfo()} foundation={props.foundation} />
          </Show>
        </Show>
      </Modal>
    </Show>
  );
};

export default ItemModal;

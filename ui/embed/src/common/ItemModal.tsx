import { Item, ItemModalContent, Loading, Modal } from 'common';
import { Show } from 'solid-js';

interface Props {
  activeItemId: string | null;
  itemInfo?: Item | null;
  onClose: () => void;
}

const ItemModal = (props: Props) => {
  const activeItemId = () => props.activeItemId;
  const itemInfo = () => props.itemInfo;

  return (
    <Show when={activeItemId() !== null}>
      <Modal size="xl" onClose={props.onClose} open>
        <Show when={itemInfo()} fallback={<Loading />}>
          <ItemModalContent item={itemInfo()} foundation={'test'} />
        </Show>
      </Modal>
    </Show>
  );
};

export default ItemModal;

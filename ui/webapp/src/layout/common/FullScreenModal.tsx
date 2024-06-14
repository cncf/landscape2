import { useBodyScroll, useOutsideClick } from 'common';
import isUndefined from 'lodash/isUndefined';
import { Accessor, createEffect, createSignal, JSXElement, onCleanup, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';

import { BANNER_ID } from '../../data';
import styles from './FullScreenModal.module.css';

interface Props {
  children: JSXElement | JSXElement[];
  open?: boolean;
  onClose?: () => void;
  initialRefs?: Accessor<HTMLElement>[];
  excludedIds?: string[];
}

const FullScreenModal = (props: Props) => {
  const [openStatus, setOpenStatus] = createSignal(false);
  const excludedIds = () => (props.excludedIds ? [BANNER_ID, ...props.excludedIds] : [BANNER_ID]);

  useBodyScroll(openStatus, 'modal');
  useOutsideClick(props.initialRefs || [], excludedIds(), openStatus, () => {
    closeModal();
  });

  const closeModal = () => {
    setOpenStatus(false);
    if (!isUndefined(props.onClose)) {
      props.onClose();
    }
  };

  createEffect(() => {
    if (!isUndefined(props.open)) {
      setOpenStatus(props.open);
    }
  });

  const handleEsc = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  };

  onMount(() => {
    window.addEventListener('keydown', handleEsc, { passive: true });
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleEsc);
  });

  return (
    <Show when={openStatus()}>
      <Portal>
        <div class={`position-fixed overflow-hidden p-3 top-0 bottom-0 start-0 end-0 ${styles.modal}`} role="dialog">
          <div class={`position-absolute ${styles.closeWrapper}`}>
            <button
              type="button"
              class={`btn-close btn-close-white opacity-100 fs-5 ${styles.close}`}
              onClick={(e) => {
                e.preventDefault();
                closeModal();
              }}
              aria-label="Close"
            />
          </div>
          <div class="d-flex flex-column h-100 w-100">{props.children}</div>
        </div>
      </Portal>
    </Show>
  );
};

export default FullScreenModal;

import { useBodyScroll, useModalFocus, useOutsideClick } from 'common';
import isUndefined from 'lodash/isUndefined';
import { Accessor, createEffect, createSignal, JSXElement, Show } from 'solid-js';
import { Portal } from 'solid-js/web';

import { BANNER_ID } from '../../data';
import styles from './FullScreenModal.module.css';

interface Props {
  title: string;
  children: JSXElement | JSXElement[];
  open?: boolean;
  onClose?: () => void;
  initialRefs?: Accessor<HTMLElement>[];
  excludedIds?: string[];
}

const FullScreenModal = (props: Props) => {
  const [openStatus, setOpenStatus] = createSignal(false);
  const [modalRef, setModalRef] = createSignal<HTMLDivElement>();
  const excludedIds = () => (props.excludedIds ? [BANNER_ID, ...props.excludedIds] : [BANNER_ID]);

  const closeModal = () => {
    setOpenStatus(false);
    if (!isUndefined(props.onClose)) {
      props.onClose();
    }
  };

  useBodyScroll(openStatus, 'modal');
  useModalFocus(modalRef, openStatus, closeModal);
  useOutsideClick(props.initialRefs || [], excludedIds(), openStatus, closeModal);

  createEffect(() => {
    if (!isUndefined(props.open)) {
      setOpenStatus(props.open);
    }
  });

  return (
    <Show when={openStatus()}>
      <Portal>
        <div
          ref={setModalRef}
          class={`position-fixed overflow-hidden p-3 top-0 bottom-0 start-0 end-0 ${styles.modal}`}
          role="dialog"
          tabIndex={-1}
          aria-label={`${props.title} modal`}
          aria-modal={true}
        >
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

import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, JSXElement, Show } from 'solid-js';

import { useBodyScroll } from '../../hooks/useBodyScroll';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import styles from './Modal.module.css';

interface Props {
  open: boolean;
  header?: string | JSXElement;
  headerClass?: string;
  modalDialogClass?: string;
  children: JSXElement;
  footer?: JSXElement;
  onClose: () => void;
  size?: string;
  noScrollable?: boolean;
  visibleContentBackdrop?: boolean;
}

const Modal = (props: Props) => {
  const [openStatus, setOpenStatus] = createSignal(false);
  const [ref, setRef] = createSignal<HTMLDivElement>();

  useOutsideClick([ref], openStatus, () => {
    closeModal();
  });

  useBodyScroll(openStatus, 'modal');

  const closeModal = () => {
    setOpenStatus(false);
    props.onClose();
  };

  createEffect(() => {
    setOpenStatus(props.open);
  });

  return (
    <Show when={openStatus()}>
      <div class={`modal-backdrop ${styles.activeBackdrop}`} data-testid="modalBackdrop" />

      <div class={`modal d-block ${styles.modal} ${styles.active}`} role="dialog" aria-modal={true}>
        <div
          class={`modal-dialog modal-${props.size || 'lg'} ${props.modalDialogClass}`}
          classList={{
            'modal-dialog-centered modal-dialog-scrollable': isUndefined(props.noScrollable) || !props.noScrollable,
          }}
          ref={setRef}
        >
          <div class={`modal-content rounded-0 border border-2 mx-auto position-relative ${styles.content}`}>
            {props.header && (
              <div class={`modal-header rounded-0 d-flex flex-row align-items-center ${styles.header}`}>
                <div class={`modal-title h5 m-2 flex-grow-1 ${styles.headerContent}`}>{props.header}</div>

                <button
                  type="button"
                  title="Close modal"
                  class="btn-close"
                  onClick={(e) => {
                    e.preventDefault();
                    closeModal();
                  }}
                  aria-label="Close"
                />
              </div>
            )}

            <div class="modal-body p-4 h-100 d-flex flex-column">
              {isUndefined(props.header) && (
                <div class={`position-absolute ${styles.btnCloseWrapper}`}>
                  <button
                    type="button"
                    title="Close modal"
                    class="btn-close"
                    onClick={(e) => {
                      e.preventDefault();
                      closeModal();
                    }}
                    aria-label="Close"
                  />
                </div>
              )}

              {props.children}
            </div>

            {!isUndefined(props.footer) && <div class="modal-footer p-3">{props.footer}</div>}
          </div>
        </div>
      </div>
    </Show>
  );
};

export default Modal;

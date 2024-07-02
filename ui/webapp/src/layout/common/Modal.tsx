import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, JSXElement, Show } from 'solid-js';

import { BANNER_ID } from '../../data';
import { useBodyScroll } from '../../hooks/useBodyScroll';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { SVGIconKind } from '../../types';
import styles from './Modal.module.css';
import SVGIcon from './SVGIcon';

interface Props {
  open: boolean;
  header?: string | JSXElement;
  headerClass?: string;
  bodyClass?: string;
  closeBtnClass?: string;
  modalDialogClass?: string;
  children: JSXElement;
  footer?: JSXElement;
  onClose: () => void;
  size?: string;
  noScrollable?: boolean;
  visibleContentBackdrop?: boolean;
  id?: string;
}

const Modal = (props: Props) => {
  const [openStatus, setOpenStatus] = createSignal(false);
  const [ref, setRef] = createSignal<HTMLDivElement>();

  useOutsideClick([ref], [BANNER_ID], openStatus, () => {
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
      <div class={`modal-backdrop ${styles.activeBackdrop}`} />

      <div class={`modal d-block ${styles.modal} ${styles.active}`} role="dialog" aria-modal={true}>
        <div
          ref={setRef}
          class={`modal-dialog modal-${props.size || 'lg'} ${styles.modalDialog}`}
          classList={{
            'modal-dialog-centered modal-dialog-scrollable': isUndefined(props.noScrollable) || !props.noScrollable,
            [`${props.modalDialogClass}`]: !isUndefined(props.modalDialogClass),
          }}
        >
          <div
            id={props.id}
            class={`modal-content rounded-0 border border-2 mx-auto position-relative ${styles.content}`}
          >
            <Show when={props.header}>
              <div class={`modal-header rounded-0 d-flex flex-row align-items-center ${styles.header}`}>
                <div class={`modal-title h5 m-0 m-lg-2 flex-grow-1 ${styles.headerContent}`}>{props.header}</div>

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
            </Show>

            <div class={`modal-body h-100 d-flex flex-column ${props.bodyClass || 'p-4'}`}>
              <Show when={isUndefined(props.header)}>
                <div class={`position-absolute ${styles.btnCloseWrapper} ${props.closeBtnClass}`}>
                  <button
                    type="button"
                    title="Close modal"
                    class={`btn btn-md p-0 rounded-0 lh-1 ${styles.btn}`}
                    onClick={(e) => {
                      e.preventDefault();
                      closeModal();
                    }}
                    aria-label="Close"
                  >
                    <SVGIcon kind={SVGIconKind.Close} />
                  </button>
                </div>
              </Show>

              {props.children}
            </div>

            <Show when={!isUndefined(props.footer)}>
              <div class="modal-footer p-2 p-lg-3">{props.footer}</div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default Modal;

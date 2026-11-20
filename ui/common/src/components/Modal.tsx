import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, JSXElement, Show } from 'solid-js';
import { css, keyframes } from 'solid-styled-components';

import { BANNER_ID } from '../data/data';
import { useBodyScroll, useModalFocus, useOutsideClick } from '../hooks';
import { SVGIconKind } from '../types/types';
import { cx } from '../utils/cx';
import { SVGIcon } from './SVGIcon';

interface Props {
  title: string;
  open: boolean;
  header?: string | JSXElement;
  bodyClass?: string;
  modalDialogClass?: string;
  children: JSXElement;
  footer?: JSXElement;
  onClose: () => void;
  size?: string;
  id?: string;
}

const fadeIn = keyframes`
   from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
`;

const fadeIn50 = keyframes`
   from {
      opacity: 0;
    }
    to {
      opacity: 0.5;
    }
`;

const Active = css`
  animation-name: ${fadeIn};
  animation-duration: 0.15s;
  animation-timing-function: ease-in-out;
  animation-fill-mode: forwards;
  z-index: 1080;
`;

// The dialog itself shows no focus ring when it takes the focus
const ModalClass = css`
  overflow-y: auto;

  &:focus {
    outline: none;
  }
`;

// Scrolling area of the dialog, focused when it opens (useModalFocus), so the keyboard scrolls
// it. It shows no focus ring and, as a group, it isn't named after its whole content
const ModalBody = css`
  &:focus {
    outline: none;
  }
`;

const ModalDialog = css`
  min-height: calc(100% - 6rem);
  max-height: calc(100% - 6rem);
  margin: 3em auto;

  @media (max-width: 1199.98px) {
    width: calc(100% - 2rem);
    max-width: calc(100% - 2rem);
    max-height: calc(100% - 2rem);
    min-height: calc(100% - 2rem);
    margin: 1rem !important;
  }
`;

const BtnCloseWrapper = css`
  top: 3rem;
  right: 3rem;
  z-index: 1;

  @media only screen and (max-width: 767.98px) {
    top: 1.5rem;
    right: 1.5rem;
  }
`;

const HeaderContent = css`
  max-width: calc(100% - 40px);
`;

const Content = css`
  border-color: var(--bs-gray-500) !important;
  box-shadow: none !important;
  z-index: 10;

  @media only screen and (max-width: 575.98px) {
    height: 100%;
    width: 100%;
    margin: auto;
  }
`;

const ActiveBackdrop = css`
  animation-name: ${fadeIn50};
  animation-duration: 0.15s;
  animation-timing-function: ease-in-out;
  animation-fill-mode: forwards;
`;

const Btn = css`
  background: transparent;
  border: 0;
  opacity: 0.5;
  font-size: 1.5rem !important;

  @media (hover: hover) {
    &:hover {
      opacity: 0.75;
    }
  }
`;

/** Modal dialog shown while `open` is set; the close buttons, Escape and an outside click close it and call `onClose`. */
export const Modal = (props: Props) => {
  const [openStatus, setOpenStatus] = createSignal(false);
  const [modalRef, setModalRef] = createSignal<HTMLDivElement>();
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [bodyRef, setBodyRef] = createSignal<HTMLDivElement>();

  const closeModal = () => {
    setOpenStatus(false);
    props.onClose();
  };

  useBodyScroll(openStatus, 'modal');
  useModalFocus(modalRef, openStatus, closeModal, bodyRef);
  useOutsideClick([ref], [BANNER_ID], openStatus, closeModal);

  createEffect(() => {
    setOpenStatus(props.open);
  });

  return (
    <Show when={openStatus()}>
      <div class={`modal-backdrop ${ActiveBackdrop}`} />

      <div
        ref={setModalRef}
        class={`modal d-block ${ModalClass} ${Active}`}
        role="dialog"
        tabIndex={-1}
        aria-label={`${props.title} modal`}
        aria-modal={true}
      >
        <div
          ref={setRef}
          role="document"
          class={cx(
            `modal-dialog modal-dialog-centered modal-dialog-scrollable modal-${props.size || 'lg'}`,
            ModalDialog,
            props.modalDialogClass
          )}
        >
          <div id={props.id} class={`modal-content rounded-0 border border-2 mx-auto position-relative ${Content}`}>
            <Show when={props.header}>
              <div class="modal-header rounded-0 d-flex flex-row align-items-center">
                <div class={`modal-title h5 m-0 m-lg-2 flex-grow-1 ${HeaderContent}`}>{props.header}</div>

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

            <div
              ref={setBodyRef}
              role="group"
              tabIndex={-1}
              class={`modal-body h-100 d-flex flex-column ${ModalBody} ${props.bodyClass || 'p-4'}`}
            >
              <Show when={isUndefined(props.header)}>
                <div class={`position-absolute ${BtnCloseWrapper}`}>
                  <button
                    type="button"
                    title="Close modal"
                    class={`btn p-0 rounded-0 lh-1 ${Btn}`}
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

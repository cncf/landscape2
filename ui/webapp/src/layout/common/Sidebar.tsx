import { useBodyScroll, useOutsideClick } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, JSXElement, on, Show } from 'solid-js';

import styles from './Sidebar.module.css';

export interface Props {
  label: string;
  children: JSXElement | JSXElement[];
  header: JSXElement | JSXElement[] | string;
  visibleButton: boolean;
  buttonType?: string;
  buttonTitle?: string;
  buttonIcon?: JSXElement;
  closeButton?: JSXElement | string;
  closeButtonClassName?: string;
  leftButton?: JSXElement;
  className?: string;
  wrapperClassName?: string;
  direction?: 'left' | 'right';
  open?: boolean;
  onOpenStatusChange?: (open: boolean) => void;
}

const DEFAULT_DIRECTION = 'left';

export const Sidebar = (props: Props) => {
  const open = () => props.open || false;
  const [openStatus, setOpenStatus] = createSignal<boolean>(false);
  const direction = () => props.direction || DEFAULT_DIRECTION;
  const [ref, setRef] = createSignal<HTMLDivElement>();
  useOutsideClick([ref], [], openStatus, () => openStatusChange(false));
  useBodyScroll(openStatus, 'sidebar');

  const openStatusChange = (open: boolean): void => {
    setOpenStatus(open);
    if (!isUndefined(props.onOpenStatusChange)) {
      props.onOpenStatusChange(open);
    }
  };

  createEffect(
    on(open, () => {
      setOpenStatus(open());
    })
  );

  return (
    <aside class={props.className} aria-label={props.label}>
      <Show when={props.visibleButton}>
        <button
          type="button"
          class="fw-bold text-uppercase position-relative btn"
          classList={{
            [`${props.buttonType}`]: !isUndefined(props.buttonType),
            'btn-primary': isUndefined(props.buttonType),
          }}
          onClick={() => {
            openStatusChange(true);
          }}
          aria-label="Open sidebar"
          aria-expanded={openStatus()}
        >
          <div class="d-flex align-items-center justify-content-center">
            {props.buttonIcon && <>{props.buttonIcon}</>}
            {props.buttonTitle && <span>{props.buttonTitle}</span>}
          </div>
        </button>
      </Show>

      <Show when={openStatus()}>
        <div class={`modal-backdrop ${styles.activeBackdrop}`} />
      </Show>

      <div
        role="complementary"
        aria-label="Sidebar"
        ref={setRef}
        class={`sidebar position-fixed top-0 bottom-0 ${styles.sidebar} ${styles[direction()]}`}
        classList={{ [styles.active]: openStatus() }}
      >
        <div class="d-flex flex-column h-100">
          <div class="border-bottom p-3">
            <div class="d-flex align-items-center justify-content-between">
              <div class={`text-primary fw-semibold text-truncate ${styles.header}`}>{props.header}</div>

              <div>
                <button
                  type="button"
                  class={`btn-close ms-3 ${styles.closeBtn}`}
                  onClick={() => openStatusChange(false)}
                  aria-label="Close sidebar"
                />
              </div>
            </div>
          </div>

          <div class={`flex-grow-1 d-flex ${styles.contentWrapper} ${props.wrapperClassName}`}>
            <div class="overflow-auto mh-100 w-100 py-3">{props.children}</div>
          </div>

          <div class="mt-auto p-4 border-top">
            <div class="d-flex align-items-center justify-content-between">
              <Show when={!isUndefined(props.leftButton)}>
                <>{props.leftButton}</>
              </Show>
              <button
                type="button"
                class={`ms-auto btn btn-sm btn-secondary rounded-0 lightText text-uppercase ${props.closeButtonClassName}`}
                onClick={() => openStatusChange(false)}
                aria-label="Close"
              >
                <Show when={isUndefined(props.closeButton)} fallback={<>{props.closeButton}</>}>
                  <>Close</>
                </Show>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

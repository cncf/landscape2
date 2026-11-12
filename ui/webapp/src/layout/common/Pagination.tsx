import { SVGIcon, SVGIconKind } from 'common';
import isNumber from 'lodash/isNumber';
import { createSignal, For, JSXElement, Show } from 'solid-js';

import styles from './Pagination.module.css';

interface Props {
  initialLimit: number;
  initialTotal: number;
  active: number;
  class?: string;
  onChange: (pageNumber: number) => void;
}

interface ButtonProps {
  pageNumber: number;
  disabled: boolean;
  content?: JSXElement;
  active: number;
  /** Accessible name; defaults to "Open page" followed by the page number. */
  label?: string;
  onChange: (pageNumber: number) => void;
}

/**
 * Returns the pages to show: the first, the last, the current one and its neighbours,
 * with '...' standing for each gap.
 */
export const getPaginationOptions = (currentPage: number, pageCount: number): (string | number)[] => {
  const delta = 1;
  const range = [];
  for (let i = Math.max(2, currentPage - delta); i <= Math.min(pageCount - 1, currentPage + delta); i++) {
    range.push(i);
  }
  if (currentPage - delta > 2) {
    range.unshift('...');
  }
  if (currentPage + delta < pageCount - 1) {
    range.push('...');
  }
  range.unshift(1);
  if (pageCount > 1) {
    range.push(pageCount);
  }
  return range;
};

const PaginationBtn = (props: ButtonProps) => {
  const [buttonRef, setButtonRef] = createSignal<HTMLDivElement>();

  return (
    <button
      ref={setButtonRef}
      class="page-link rounded-0"
      classList={{ 'text-primary': !props.disabled && props.active !== props.pageNumber }}
      onClick={() => {
        if (props.active !== props.pageNumber) {
          if (buttonRef()) {
            buttonRef()!.blur();
          }
          props.onChange(props.pageNumber);
        }
      }}
      aria-label={props.label ?? `Open page ${props.pageNumber}`}
      disabled={props.disabled}
    >
      {props.content || props.pageNumber}
    </button>
  );
};

const Pagination = (props: Props) => {
  const totalPages = () => Math.ceil(props.initialTotal / props.initialLimit);
  const active = () => props.active;

  const visiblePages = () => getPaginationOptions(active(), totalPages());

  return (
    <Show when={totalPages() > 1}>
      <nav role="navigation" aria-label="pagination">
        <ul class={`pagination justify-content-center ${styles.pagination} ${props.class ?? ''}`}>
          <li class="page-item" classList={{ disabled: active() === 1 }}>
            <PaginationBtn
              pageNumber={active() - 1}
              disabled={active() === 1}
              content={
                <>
                  <span class="d-none d-sm-block">Previous</span>
                  <span class={`d-block d-sm-none ${styles.btnIcon}`}>
                    <SVGIcon kind={SVGIconKind.CaretLeft} />
                  </span>
                </>
              }
              active={active()}
              label="Go to previous page"
              onChange={props.onChange}
            />
          </li>

          <For each={visiblePages()}>
            {(page) => {
              return (
                <Show
                  when={isNumber(page)}
                  fallback={
                    <li class="page-item disabled">
                      <span class="page-link">{page}</span>
                    </li>
                  }
                >
                  <li class="page-item" classList={{ [`active text-light ${styles.active}`]: active() === page }}>
                    <PaginationBtn
                      pageNumber={page as number}
                      disabled={false}
                      active={active()}
                      onChange={props.onChange}
                    />
                  </li>
                </Show>
              );
            }}
          </For>

          <li class="page-item" classList={{ disabled: active() === totalPages() }}>
            <PaginationBtn
              pageNumber={active() + 1}
              disabled={active() === totalPages()}
              content={
                <>
                  <span class="d-none d-sm-block">Next</span>
                  <span class={`d-block d-sm-none ${styles.btnIcon}`}>
                    <SVGIcon kind={SVGIconKind.CaretRight} />
                  </span>
                </>
              }
              active={active()}
              label="Go to next page"
              onChange={props.onChange}
            />
          </li>
        </ul>
      </nav>
    </Show>
  );
};

export default Pagination;

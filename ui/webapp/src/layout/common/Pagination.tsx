import { SVGIcon, SVGIconKind } from 'common';
import isNumber from 'lodash/isNumber';
import isString from 'lodash/isString';
import { createEffect, createSignal, For, JSXElement, Show } from 'solid-js';

import styles from './Pagination.module.css';

interface Props {
  initialLimit: number;
  initialTotal: number;
  offset: number;
  active: number;
  class?: string;
  onChange: (pageNumber: number) => void;
}

interface ButtonProps {
  pageNumber: number;
  disabled: boolean;
  content?: JSXElement | string;
  active: number;
  onChange: (pageNumber: number) => void;
}

const getPaginationOptions = (currentPage: number, pageCount: number): (string | number)[] => {
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
  range.push(pageCount);
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
      aria-label={`Open ${isString(props.content) ? props.content : `page ${props.pageNumber}`}`}
      disabled={props.disabled}
    >
      {props.content || props.pageNumber}
    </button>
  );
};

const Pagination = (props: Props) => {
  const [totalPages, setTotalPages] = createSignal<number>(Math.ceil(props.initialTotal / props.initialLimit));
  const active = () => props.active;

  createEffect(() => {
    setTotalPages(Math.ceil(props.initialTotal / props.initialLimit));
  });

  const visiblePages = () => getPaginationOptions(active(), totalPages());

  return (
    <Show when={totalPages() > 1}>
      <nav role="navigation" aria-label="pagination">
        <ul class={`pagination justify-content-center ${styles.pagination} ${props.class}`}>
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

          <li class="page-item" classList={{ disabled: active === totalPages }}>
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
              onChange={props.onChange}
            />
          </li>
        </ul>
      </nav>
    </Show>
  );
};

export default Pagination;

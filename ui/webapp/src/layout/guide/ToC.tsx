import { useLocation } from '@solidjs/router';
import isUndefined from 'lodash/isUndefined';
import { For, Show } from 'solid-js';

import { ToCTitle } from '../../types';
import { parseHashId } from '../../utils/urlParams';
import styles from './ToC.module.css';

/** Copy of the ToC the ids belong to: the guide renders a mobile and a desktop one. */
export type ToCIdPrefix = 'desktop' | 'mobile';

interface Props {
  idPrefix: ToCIdPrefix;
  toc: ToCTitle[];
  sticky: boolean;
  updateActiveTitle: (activeTitle: string) => void;
}

interface OptionProps {
  idPrefix: ToCIdPrefix;
  option: ToCTitle;
  level: number;
  updateActiveTitle: (activeTitle: string) => void;
}

const ToCOption = (props: OptionProps) => {
  const location = useLocation();

  return (
    <>
      <button
        id={getToCOptionId(props.idPrefix, props.option.id)}
        class={`btn btn-link py-1 px-3 text-start w-100 rounded-0 position-relative text-truncate ${styles.btn} ${
          styles[`level-${props.level}`]
        }`}
        classList={{
          ['fw-semibold text-muted']: props.level === 0,
          [styles.active]: parseHashId(location.hash) === props.option.id,
        }}
        onClick={() => {
          props.updateActiveTitle(props.option.id);
        }}
        aria-label={`Open ${props.option.title} section`}
      >
        {props.option.title}
      </button>
      <Show when={!isUndefined(props.option.options)}>
        <div class="mb-3">
          <For each={props.option.options}>
            {(el: ToCTitle) => {
              return (
                <ToCOption
                  idPrefix={props.idPrefix}
                  option={el}
                  level={props.level + 1}
                  updateActiveTitle={props.updateActiveTitle}
                />
              );
            }}
          </For>
        </div>
      </Show>
    </>
  );
};

const ToC = (props: Props) => {
  return (
    <div classList={{ [`sticky-top ${styles.sticky}`]: props.sticky }}>
      <div
        class="overflow-hidden"
        classList={{ [`border border-1 m-4 ms-0 rounded-0 offcanvas-body ${styles.wrapper}`]: props.sticky }}
      >
        <Show when={props.sticky}>
          <div class={`fs-6 text-uppercase fw-bold border-bottom px-4 py-3 ${styles.title}`}>Index</div>
        </Show>
        <div id={`${props.idPrefix}_menu`} class={`overflow-auto py-3 ${styles.content}`}>
          <For each={props.toc}>
            {(el: ToCTitle) => {
              return (
                <ToCOption
                  idPrefix={props.idPrefix}
                  option={el}
                  level={0}
                  updateActiveTitle={props.updateActiveTitle}
                />
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};

/**
 * Builds the id of a ToC option button, unique per ToC copy.
 *
 * @param idPrefix - ToC copy the option belongs to
 * @param id - Anchor id of the option section
 * @returns Option button id
 */
export const getToCOptionId = (idPrefix: ToCIdPrefix, id: string): string => `${idPrefix}_btn_${id}`;

export default ToC;

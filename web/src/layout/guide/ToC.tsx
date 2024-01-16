import { useLocation } from '@solidjs/router';
import isUndefined from 'lodash/isUndefined';
import { For, Show } from 'solid-js';

import { ToCTitle } from '../../types';
import styles from './ToC.module.css';

interface Props {
  toc: ToCTitle[];
  sticky: boolean;
  activeTitle?: string;
  updateActiveTitle: (activeTitle: string) => void;
}

interface OptionProps {
  option: ToCTitle;
  level: number;
  updateActiveTitle: (activeTitle: string) => void;
}

const ToCOption = (props: OptionProps) => {
  const location = useLocation();

  return (
    <>
      <button
        id={`btn_${props.option.id}`}
        class={`btn btn-link py-1 px-3 text-start w-100 rounded-0 position-relative text-truncate ${styles.btn} ${
          styles[`level-${props.level}`]
        }`}
        classList={{
          ['fw-semibold text-muted']: props.level === 0,
          [styles.active]: location.hash === `#${props.option.id}`,
        }}
        onClick={() => {
          props.updateActiveTitle(props.option.id);
        }}
      >
        {props.option.title}
      </button>
      <Show when={!isUndefined(props.option.options)}>
        <div class="mb-3">
          <For each={props.option.options}>
            {(el: ToCTitle) => {
              return <ToCOption option={el} level={props.level + 1} updateActiveTitle={props.updateActiveTitle} />;
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
        <div id="menu" class={`overflow-auto py-3 ${styles.content}`}>
          <For each={props.toc}>
            {(el: ToCTitle) => {
              return <ToCOption option={el} level={0} updateActiveTitle={props.updateActiveTitle} />;
            }}
          </For>
        </div>
      </div>
    </div>
  );
};

export default ToC;

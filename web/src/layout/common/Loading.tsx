import isUndefined from 'lodash/isUndefined';
import { JSXElement, Show } from 'solid-js';

import styles from './Loading.module.css';

export interface Props {
  class?: string;
  spinnerClass?: string;
  smallSize?: boolean;
  position?: 'fixed' | 'absolute' | 'relative';
  transparentBg?: boolean;
  noWrapper?: boolean;
}

export const Loading = (props: Props) => {
  const getSpinner = (): JSXElement => {
    return (
      <div class="d-flex justify-content-center">
        <div
          class={`${styles.wave} ${props.spinnerClass}`}
          classList={{ [styles.miniWave]: !isUndefined(props.smallSize) && props.smallSize }}
          role="status"
        >
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  };

  return (
    <Show when={isUndefined(props.noWrapper) || !props.noWrapper} fallback={<>{getSpinner()}</>}>
      <div
        class={`top-0 bottom-0 start-0 end-0 position-absolute position-${props.position || 'absolute'} ${
          styles.wrapper
        } ${props.class}`}
        classList={{
          'p-5': isUndefined(props.smallSize) || !props.smallSize,
          [styles.transparentBg]: !isUndefined(props.transparentBg) && props.transparentBg,
        }}
      >
        <div class={props.spinnerClass || 'd-flex flex-row align-items-center justify-content-center w-100 h-100'}>
          {getSpinner()}
        </div>
      </div>
    </Show>
  );
};

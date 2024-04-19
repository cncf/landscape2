import isUndefined from 'lodash/isUndefined';
import { Show } from 'solid-js';

import styles from './Box.module.css';

interface Props {
  label: string;
  data?: number | string;
  legend?: string;
}

const Box = (props: Props) => (
  <Show when={!isUndefined(props.data)}>
    <div class={`text-center p-2 p-md-3 h-100 d-flex flex-column justify-content-center ${styles.box}`}>
      <div class={`fw-bold text-nowrap mb-0 mt-1 ${styles.data}`}>{props.data}</div>
      <div class={`mb-3 pt-1 ${styles.legend}`}>{props.legend}</div>
      <div class={`fw-semibold text-uppercase text-truncate ${styles.label}`}>
        <small>{props.label}</small>
      </div>
    </div>
  </Show>
);

export default Box;

import isUndefined from 'lodash/isUndefined';
import { JSXElement, Show } from 'solid-js';

import styles from './Badge.module.css';

interface Props {
  text: string;
  icon?: JSXElement;
  class?: string;
}

const Badge = (props: Props) => (
  <div class={`badge rounded-0 text-uppercase ${styles.badge} ${props.class}`}>
    <div class="d-flex flex-row align-items-center">
      <Show when={!isUndefined(props.icon)}>
        <div class={`me-1 position-relative ${styles.icon}`}>{props.icon}</div>
      </Show>
      <div>{props.text}</div>
    </div>
  </div>
);

export default Badge;

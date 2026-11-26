import isUndefined from 'lodash/isUndefined';
import { createUniqueId, Show } from 'solid-js';

import styles from './Box.module.css';

interface Props {
  label: string;
  data?: number | string;
  legend?: string;
  description?: string;
}

const Box = (props: Props) => {
  const descriptionId = createUniqueId();

  return (
    <Show when={!isUndefined(props.data)}>
      <div
        class={`text-center p-2 p-md-3 h-100 d-flex flex-column justify-content-center ${styles.box}`}
        role="group"
        aria-describedby={isUndefined(props.description) ? undefined : descriptionId}
      >
        <div class={`fw-bold text-nowrap mb-0 mt-1 ${styles.data}`}>{props.data}</div>
        <div class={`mb-3 pt-1 ${styles.legend}`}>{props.legend}</div>
        <div class={`fw-semibold text-uppercase text-truncate ${styles.label}`}>
          <small>{props.label}</small>
        </div>
        <Show when={!isUndefined(props.description)}>
          <div id={descriptionId} class="visually-hidden">
            {props.description}
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default Box;

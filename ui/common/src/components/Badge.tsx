import isUndefined from 'lodash/isUndefined';
import { JSXElement, Show } from 'solid-js';
import { css } from 'solid-styled-components';

interface Props {
  text: string;
  icon?: JSXElement;
  class?: string;
}

const Wrapper = css`
  background-color: var(--color3);
  font-size: 0.7rem !important;
  font-weight: 500 !important;
`;

const Icon = css`
  top: -1px;
`;

export const Badge = (props: Props) => (
  <div class={`badge rounded-0 text-uppercase ${Wrapper} ${props.class}`}>
    <div class="d-flex flex-row align-items-center">
      <Show when={!isUndefined(props.icon)}>
        <div class={`me-1 position-relative ${Icon}`}>{props.icon}</div>
      </Show>
      <div>{props.text}</div>
    </div>
  </div>
);

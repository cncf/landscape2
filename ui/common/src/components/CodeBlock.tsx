import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { ButtonCopyToClipboard } from './ButtonCopyToClipboard';

interface Props {
  language: string;
  content: string;
  withCopyBtn: boolean;
  visibleBtnText?: boolean;
  orientation?: 'row' | 'column';
  alignment?: 'top' | 'center' | 'bottom';
  codeClass?: string;
  btnWrapperClass?: string;
  label?: string;
  darkCode?: boolean;
}

const Pre = css`
  overscroll-behavior: contain;
`;

const Code = css`
  background-color: var(--bs-gray-200);
`;

export const CodeBlock = (props: Props) => {
  return (
    <div
      class={`d-flex flex-${props.orientation || 'row'} align-items-${
        props.alignment || 'center'
      } justify-content-end pb-2`}
    >
      <pre class={`flex-grow-1 mb-0 ${Pre}`}>
        <code class={`p-3 d-block overflow-x-auto ${Code} ${props.codeClass}`}>{props.content}</code>
      </pre>

      <Show when={props.withCopyBtn}>
        <ButtonCopyToClipboard
          text={props.content}
          label={props.label || 'Copy code to clipboard'}
          wrapperClass={props.btnWrapperClass || 'ms-3'}
          visibleBtnText
        />
      </Show>
    </div>
  );
};

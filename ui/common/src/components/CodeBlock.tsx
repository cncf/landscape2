import { Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { cx } from '../utils/cx';
import { ButtonCopyToClipboard } from './ButtonCopyToClipboard';

interface Props {
  content: string;
  withCopyBtn: boolean;
  alignment?: 'top' | 'center' | 'bottom';
  btnWrapperClass?: string;
  codeClass?: string;
  label?: string;
  orientation?: 'row' | 'column';
}

const Pre = css`
  overscroll-behavior: contain;
`;

const Code = css`
  background-color: var(--bs-gray-200);
`;

/** Preformatted code with an optional copy-to-clipboard button. */
export const CodeBlock = (props: Props) => {
  return (
    <div
      class={`d-flex flex-${props.orientation || 'row'} align-items-${
        props.alignment || 'center'
      } justify-content-end pb-2`}
    >
      <pre class={`flex-grow-1 mb-0 ${Pre}`}>
        <code class={cx('p-3 d-block overflow-x-auto', Code, props.codeClass)}>{props.content}</code>
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

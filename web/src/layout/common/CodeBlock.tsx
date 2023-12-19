import { Show } from 'solid-js';

import ButtonCopyToClipboard from './ButtonCopyToClipboard';
import styles from './CodeBlock.module.css';

interface Props {
  language: string;
  content: string;
  withCopyBtn: boolean;
  visibleBtnText?: boolean;
  codeClass?: string;
  btnWrapperClass?: string;
  label?: string;
  darkCode?: boolean;
}

const CodeBlock = (props: Props) => {
  return (
    <div class="d-flex flex-row align-items-center pb-2">
      <pre class={`flex-grow-1 ${styles.pre}`}>
        <code class={`p-3 d-block overflow-x-auto ${styles.code} ${props.codeClass}`}>{props.content}</code>
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

export default CodeBlock;

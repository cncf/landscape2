import 'highlight.js/styles/stackoverflow-light.css';

import Highlight from 'solid-highlight';

import ButtonCopyToClipboard from './ButtonCopyToClipboard';
import styles from './CodeBlock.module.css';

interface Props {
  language: string;
  content: string;
  withCopyBtn: boolean;
  label?: string;
  darkCode?: boolean;
}

const CodeBlock = (props: Props) => {
  return (
    <div class={`d-flex flex-row align-items-center pb-2 ${styles.codeBlock}`}>
      <Highlight class="p-3" autoDetect={false} language={props.language}>
        {props.content}
      </Highlight>

      {props.withCopyBtn && (
        <ButtonCopyToClipboard
          text={props.content}
          label={props.label || 'Copy code to clipboard'}
          wrapperClass="ms-3"
        />
      )}
    </div>
  );
};

export default CodeBlock;

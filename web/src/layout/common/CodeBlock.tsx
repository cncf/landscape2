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
    <div class="d-flex flex-row align-items-center pb-2">
      <pre class={styles.pre}>
        <code class={`p-3 d-block overflow-x-auto ${styles.code}`}>{props.content}</code>
      </pre>

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

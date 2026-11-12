import { createSignal, onCleanup, Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { SVGIconKind } from '../types/types';
import { cx } from '../utils/cx';
import { SVGIcon } from './SVGIcon';

interface Props {
  text: string;
  label?: string;
  visibleBtnText?: boolean;
  wrapperClass?: string;
}

type CopyStatus = 'idle' | 'copied' | 'failed';

const STATUS_MESSAGES: Record<Exclude<CopyStatus, 'idle'>, string> = {
  copied: 'Copied!',
  failed: 'Copy failed',
};
const STATUS_TIMEOUT = 2 * 1000;

const Tooltip = css`
  bottom: -40px;
`;

const Button = css`
  height: 32px;
  min-width: 32px;
`;

/** Copies `text` to the clipboard and announces "Copied!" or "Copy failed" in a `role="status"` region for 2 seconds. */
export const ButtonCopyToClipboard = (props: Props) => {
  const [status, setStatus] = createSignal<CopyStatus>('idle');
  let disposed = false;
  let statusTimeout: ReturnType<typeof setTimeout> | undefined;
  const message = () => {
    const current = status();
    return current === 'idle' ? undefined : STATUS_MESSAGES[current];
  };

  const showStatus = (value: Exclude<CopyStatus, 'idle'>) => {
    // The Clipboard API may settle after the button is gone
    if (disposed) return;
    clearTimeout(statusTimeout);
    setStatus(value);
    statusTimeout = setTimeout(() => setStatus('idle'), STATUS_TIMEOUT);
  };

  const copyToClipboard = async () => {
    if (!navigator.clipboard) {
      showStatus(copyWithExecCommand(props.text) ? 'copied' : 'failed');
      return;
    }
    try {
      await navigator.clipboard.writeText(props.text);
      showStatus('copied');
    } catch {
      showStatus('failed');
    }
  };

  onCleanup(() => {
    disposed = true;
    clearTimeout(statusTimeout);
  });

  return (
    <div class={cx('position-relative', props.wrapperClass)}>
      <div role="status">
        <Show when={message()}>
          {(text) => (
            <div class={`dropdown-menu rounded-0 popover show end-0 ${Tooltip}`}>
              <div class="tooltip-inner rounded-0">{text()}</div>
            </div>
          )}
        </Show>
      </div>
      <button
        type="button"
        class={`btn btn-sm btn-secondary rounded-0 ${Button}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          copyToClipboard();
        }}
        aria-label={props.label || 'Copy to clipboard'}
      >
        <div class="d-flex flex-row align-items-center" aria-hidden="true">
          <SVGIcon kind={SVGIconKind.Copy} />
          <Show when={props.visibleBtnText}>
            <div class="ms-2 text-nowrap">Copy to clipboard</div>
          </Show>
        </div>
      </button>
    </div>
  );
};

/**
 * Copies the text through a temporary off-screen, readonly textarea and
 * `document.execCommand('copy')`, for browsers without the Clipboard API.
 * Returns whether the browser reported a successful copy.
 */
const copyWithExecCommand = (text: string): boolean => {
  const textField = document.createElement('textarea');
  textField.value = text;
  textField.readOnly = true;
  textField.style.position = 'fixed';
  textField.style.top = '0';
  textField.style.left = '-9999px';
  document.body.appendChild(textField);
  try {
    textField.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textField.remove();
  }
};

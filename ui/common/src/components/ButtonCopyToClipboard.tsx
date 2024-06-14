import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, JSXElement, on, onCleanup, Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { SVGIconKind } from '../types/types';
import { SVGIcon } from './SVGIcon';

interface Props {
  text: string;
  wrapperClass?: string;
  className?: string;
  tooltipClass?: string;
  visibleBtnText?: boolean;
  contentBtn?: string;
  style?: { [key: string]: string };
  icon?: JSXElement;
  disabled?: boolean;
  label?: string;
  tooltipType?: 'normal' | 'light';
  noTooltip?: boolean;
  onClick?: () => void;
}

const Tooltip = css`
  bottom: -40px;
`;

const Button = css`
  height: 32px;
  min-width: 32px;
`;

export const ButtonCopyToClipboard = (props: Props) => {
  const [copyStatus, setCopyStatus] = createSignal<boolean>(false);
  const [copyTimeout, setCopyTimeout] = createSignal<number | undefined>();

  async function copyToClipboard(textToCopy: string) {
    if (!navigator.clipboard) {
      try {
        const textField = document.createElement('textarea');
        textField.textContent = textToCopy;
        document.body.appendChild(textField);
        textField.select();
        document.execCommand('copy');
        textField.remove();
        if (isUndefined(props.noTooltip) || !props.noTooltip) {
          setCopyStatus(true);
        }
      } catch {
        setCopyStatus(false);
      }
    } else {
      try {
        await navigator.clipboard.writeText(textToCopy);
        if (isUndefined(props.noTooltip) || !props.noTooltip) {
          setCopyStatus(true);
        }
      } catch {
        setCopyStatus(false);
      }
    }
  }

  createEffect(
    on(copyStatus, () => {
      if (copyStatus()) {
        // Hide tooltip after 2s
        setCopyTimeout(setTimeout(() => setCopyStatus(false), 2 * 1000));
      }
    })
  );

  onCleanup(() => {
    if (!isUndefined(copyTimeout())) {
      clearTimeout(copyTimeout());
    }
  });

  return (
    <div class={`position-relative ${props.wrapperClass}`}>
      <Show when={copyStatus()}>
        <div class={`dropdown-menu rounded-0 popover show end-0 ${Tooltip} ${props.tooltipClass}`} role="tooltip">
          <div class="tooltip-inner rounded-0">Copied!</div>
        </div>
      </Show>
      <button
        type="button"
        class={`btn btn-sm ${props.className}`}
        classList={{ [`btn-secondary rounded-0 ${Button}`]: isUndefined(props.className) }}
        style={props.style}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          copyToClipboard(props.text);
          if (props.onClick) {
            props.onClick();
          }
        }}
        disabled={props.disabled}
        aria-label={props.label || 'Copy to clipboard'}
      >
        <div class="d-flex flex-row align-items-center" aria-hidden="true">
          <Show when={!isUndefined(props.visibleBtnText) && props.visibleBtnText && props.contentBtn}>
            <div class="me-2">{props.contentBtn}</div>
          </Show>
          <Show when={props.icon} fallback={<SVGIcon kind={SVGIconKind.Copy} />}>
            {props.icon}
          </Show>
          <Show when={!isUndefined(props.visibleBtnText) && props.visibleBtnText && isUndefined(props.contentBtn)}>
            <div class="ms-2 text-nowrap">Copy to clipboard</div>
          </Show>
        </div>
      </button>
    </div>
  );
};

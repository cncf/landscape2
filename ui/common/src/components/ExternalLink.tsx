import { JSXElement, Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { isSafeHref } from '../embed/isSafeHref';
import { SVGIconKind } from '../types/types';
import { cx } from '../utils/cx';
import { SVGIcon } from './SVGIcon';

interface Props {
  children: JSXElement | JSXElement[] | string;
  href: string;
  class?: string;
  externalIconClass?: string;
  // Accessible name for icon-only links; text links take their name from their content
  label?: string;
  title?: string;
  visibleExternalIcon?: boolean;
  onClick?: () => void;
}

const LinkClass = css`
  cursor: pointer;
`;

/** Link opening an external page; an href that is not `http`, `https` or `mailto` renders the children as plain text. */
export const ExternalLink = (props: Props) => {
  const isMailtoLink = () => /^mailto:/i.test(props.href);

  return (
    <Show when={isSafeHref(props.href)} fallback={<span class={props.class}>{props.children}</span>}>
      <a
        title={props.title}
        class={cx('link', LinkClass, props.class)}
        href={props.href}
        target={isMailtoLink() ? undefined : '_blank'}
        rel={isMailtoLink() ? undefined : 'noopener noreferrer'}
        onClick={(e) => {
          e.stopPropagation();
          props.onClick?.();
        }}
        aria-label={props.label}
      >
        <Show when={props.visibleExternalIcon} fallback={props.children}>
          <div class="d-flex flex-row align-items-center">
            {props.children}
            <SVGIcon kind={SVGIconKind.ExternalLink} class={cx('ms-1 icon', props.externalIconClass)} />
          </div>
        </Show>
      </a>
    </Show>
  );
};

// Local copy of the common `ExternalLink` component: the common one depends on
// Bootstrap, which the third-party embed deliberately does not load. It
// follows the same rules: no default accessible name (`label` names icon-only
// and empty links) and unsafe hrefs rendered as plain text.
import { isSafeHref } from 'common/embed';
import { cx } from 'common/utils';
import { JSXElement, Show } from 'solid-js';
import { css, styled } from 'solid-styled-components';

interface Props {
  href: string;
  children?: JSXElement | JSXElement[] | string;
  class?: string;
  // Accessible name for icon-only and empty links; text links take their name from their content
  label?: string;
  paddingBottom?: number;
  title?: string;
}

interface LinkProps {
  paddingBottom?: number;
}

const Link = styled('a')`
  padding-bottom: ${(props: LinkProps) =>
    typeof props.paddingBottom !== 'undefined' ? `${props.paddingBottom}px` : '0'};
`;

const LinkClass = css`
  color: inherit;
  text-decoration: underline;

  &:hover {
    color: inherit;
  }
`;

// An href that is not `http`, `https` or `mailto` renders the children as plain text
const ExternalLink = (props: Props) => {
  return (
    <Show when={isSafeHref(props.href)} fallback={<span class={props.class}>{props.children}</span>}>
      <Link
        title={props.title}
        class={cx(LinkClass, props.class)}
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={props.label}
        paddingBottom={props.paddingBottom}
      >
        {props.children}
      </Link>
    </Show>
  );
};

export default ExternalLink;

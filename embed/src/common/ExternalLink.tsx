import { JSXElement } from 'solid-js';
import { css, styled } from 'solid-styled-components';

interface Props {
  children: JSXElement | JSXElement[] | string;
  href: string;
  paddingBottom?: number;
  class?: string;
  label?: string;
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

const ExternalLink = (props: Props) => {
  return (
    <Link
      title={props.title}
      class={`${LinkClass} ${props.class}`}
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={props.label || 'Open external link'}
      tabIndex={-1}
      paddingBottom={props.paddingBottom}
    >
      {props.children}
    </Link>
  );
};

export default ExternalLink;

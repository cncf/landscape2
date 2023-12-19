import { JSXElement } from 'solid-js';
import { css } from 'solid-styled-components';

interface Props {
  children: JSXElement | JSXElement[] | string;
  href: string;
  class?: string;
  label?: string;
  title?: string;
}

const LinkClass = css`
  color: inherit;
  text-decoration: underline;

  &:hover {
    color: inherit;
  }
`;

const ExternalLink = (props: Props) => {
  return (
    <a
      title={props.title}
      class={`${LinkClass} ${props.class}`}
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={props.label || 'Open external link'}
      tabIndex={-1}
    >
      {props.children}
    </a>
  );
};

export default ExternalLink;

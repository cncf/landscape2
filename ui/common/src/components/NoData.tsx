import { JSXElement } from 'solid-js';
import { css } from 'solid-styled-components';

interface Props {
  children: string | JSXElement;
  class?: string;
}

const Wrapper = css`
  @media only screen and (min-width: 768px) {
    width: 75%;
  }
`;

export const NoData = (props: Props) => (
  <div
    role="alert"
    class={`alert mx-auto my-5 text-center p-4 p-sm-5 border border-1 rounded-0 ${Wrapper} ${props.class}`}
  >
    <div>{props.children}</div>
  </div>
);

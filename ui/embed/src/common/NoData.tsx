import { JSXElement } from 'solid-js';
import { css } from 'solid-styled-components';

interface Props {
  children: string | JSXElement;
}

const AlertClass = css`
  padding: 1.5rem;
  text-align: center;
  margin: 3rem auto;
  border: 1px solid #dee2e6;

  @media only screen and (min-width: 768px) {
    width: 75%;
    padding: 3rem;
  }
`;

const NoData = (props: Props) => (
  <div role="alert" class={AlertClass}>
    <div>{props.children}</div>
  </div>
);

export default NoData;

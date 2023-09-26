import { JSXElement } from 'solid-js';

import styles from './NoData.module.css';

interface Props {
  children: string | JSXElement;
  class?: string;
}

const NoData = (props: Props) => (
  <div
    role="alert"
    class={`alert alert-primary mx-auto my-5 text-center p-4 p-sm-5 border border-1 ${styles.wrapper} ${props.class}`}
  >
    <div>{props.children}</div>
  </div>
);

export default NoData;

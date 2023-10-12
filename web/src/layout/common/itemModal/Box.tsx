import { JSXElement, Show } from 'solid-js';

import styles from './Box.module.css';

interface Props {
  value: string | number | JSXElement;
  legend: string;
  class?: string;
  fillBgPercentage?: number;
}

const Box = (props: Props) => {
  const fillPercentage = () => props.fillBgPercentage || 0;
  const value = () => props.value;
  const legend = () => props.legend;
  const randomId = Math.floor(Math.random() * 10000000 + 1);

  return (
    <>
      <Show when={fillPercentage() > 0}>
        <style>
          {`
          .filledBox-${randomId}::after {
            height: ${fillPercentage() < 1 ? 1 : fillPercentage()}%;
          }
        `}
        </style>
      </Show>

      <div class={props.class || 'col'}>
        <div
          class={`position-relative text-center p-3 h-100 d-flex flex-column justify-content-center filledBox ${styles.highlighted}`}
          classList={{ [`filledBox filledBox-${randomId}`]: fillPercentage() > 0 }}
        >
          <div class={`fw-bold text-nowrap ${styles.highlightedTitle}`}>{value()}</div>
          <div class={`fw-semibold ${styles.highlightedLegend}`}>
            <small>{legend()}</small>
          </div>
        </div>
      </div>
    </>
  );
};

export default Box;

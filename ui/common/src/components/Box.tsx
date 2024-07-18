import { JSXElement, Show } from 'solid-js';
import { css } from 'solid-styled-components';

interface Props {
  value: string | number | JSXElement;
  legend: string;
  class?: string;
  fillBgPercentage?: number;
}

const Highlighted = css`
  background-color: var(--bs-gray-100);
  border: 6px solid var(--bs-gray-300);

  &.filledBox::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: var(--bs-black);
    opacity: 0.03;
    z-index: 0;
  }
`;

const HighlightedTitle = css`
  color: var(--color-stats-1);
  font-size: 2rem;
  z-index: 1;

  @media only screen and (max-width: 767.98px) {
    font-size: 1.25rem;
    line-height: 2.5rem;
  }
`;

const HighlightedLegend = css`
  color: var(--bs-tertiary-color);
  line-height: 0.7rem;
  padding-bottom: 0.75rem;
  z-index: 1;

  @media only screen and (max-width: 767.98px) {
    font-size: 0.9rem;
  }
`;

export const Box = (props: Props) => {
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
          class={`position-relative text-center p-2 p-md-3 h-100 d-flex flex-column justify-content-center filledBox ${Highlighted}`}
          classList={{ [`filledBox filledBox-${randomId}`]: fillPercentage() > 0 }}
        >
          <div class={`fw-bold text-nowrap ${HighlightedTitle}`}>{value()}</div>
          <div class={`fw-semibold ${HighlightedLegend}`}>
            <small>{legend()}</small>
          </div>
        </div>
      </div>
    </>
  );
};

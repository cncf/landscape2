import moment from 'moment';
import { createSignal, For, onMount, Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { calculateAxisValues } from '../utils/calculateAxisValues';

interface Props {
  initialStats: number[];
}

const Chart = css`
  height: 80px;
`;

const Bar = css`
  width: 2%;
  background-color: var(--color-stats-1);
  margin: 0 0.25rem;

  @media only screen and (max-width: 767.98px) {
    min-width: 2px;
    margin: 0 1px;
  }
`;

const Message = css`
  font-size: 0.8rem !important;
`;

const Month = css`
  font-size: 0.7rem !important;
`;

const AxisLegend = css`
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  font-size: 0.6rem;
  line-height: 1.75;
  width: 1.15rem;
`;

const AxisValue = css`
  font-size: 0.6rem;
  line-height: 0.6rem;
`;

export const ParticipationStats = (props: Props) => {
  const [months, setMonths] = createSignal<string[] | undefined>(undefined);
  const isAllZero = () => props.initialStats.every((item) => item === 0);
  const stats = () => props.initialStats;

  const percentage = (partialValue: number) => {
    return (100 * partialValue) / Math.max(...stats());
  };

  onMount(() => {
    setMonths(
      [...Array(5).keys()].map((n: number) => {
        return moment()
          .subtract(n * 3, 'months')
          .format("MMM 'YY");
      })
    );
  });

  return (
    <div class="d-flex flex-row mt-3">
      <div class="flex-grow-1">
        <div class={`mb-2 border-bottom border-end pt-2 ${Chart}`}>
          <div class="d-flex flex-row justify-content-between align-items-end h-100 w-100">
            <Show
              when={!isAllZero()}
              fallback={
                <div class={`alert rounded-0 text-muted mx-auto mb-4 px-5 py-2 text-center border ${Message}`}>
                  No activity in the last year
                </div>
              }
            >
              <For each={stats()}>
                {(x: number) => {
                  return <div title={x.toString()} class={Bar} style={{ height: `${percentage(x)}%` }} />;
                }}
              </For>
            </Show>
          </div>
        </div>
        <Show when={months()}>
          <div class="d-flex flex-row-reverse justify-content-between mb-1">
            <For each={months()}>
              {(m: string) => {
                return <div class={`text-muted text-nowrap ${Month}`}>{m}</div>;
              }}
            </For>
          </div>
        </Show>
      </div>
      <Show when={!isAllZero()}>
        <div class={`d-flex flex-row align-items-center ${Chart}`}>
          <div class="d-flex flex-column-reverse justify-content-between h-100">
            <For each={calculateAxisValues(0, Math.max(...stats()), 4)}>
              {(value: number) => {
                return (
                  <div class={`text-end ps-1 ${AxisValue}`}>{Number.isInteger(value) ? value : value.toFixed(1)}</div>
                );
              }}
            </For>
          </div>
          <div class={`fst-italic text-muted text-center ${AxisLegend}`}>Commits</div>
        </div>
      </Show>
    </div>
  );
};

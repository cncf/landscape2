import isInteger from 'lodash/isInteger';
import moment from 'moment';
import { createSignal, For, onMount, Show } from 'solid-js';

import calculateAxisValues from '../../../utils/calculateAxisValues';
import styles from './ParticipationStats.module.css';

interface Props {
  initialStats: number[];
}

const ParticipationStats = (props: Props) => {
  const [months, setMonths] = createSignal<string[] | undefined>(undefined);
  const isAllZero = () => props.initialStats.every((item) => item === 0);
  const stats = () => props.initialStats;

  const percentage = (partialValue: number) => {
    return (100 * partialValue) / Math.max(...stats());
  };

  onMount(() => {
    setMonths(
      [...Array(4).keys()].map((n: number) => {
        return moment()
          .subtract(n * 3, 'months')
          .format("MMM 'YY");
      })
    );
  });

  return (
    <div class="d-flex flex-row mt-3">
      <div class="flex-grow-1">
        <div class={`mb-2 border-bottom border-end pt-2 ${styles.chart}`}>
          <div class="d-flex flex-row justify-content-between align-items-end h-100 w-100">
            <Show
              when={!isAllZero()}
              fallback={
                <div class={`alert rounded-0 text-muted mx-auto mb-4 px-5 py-2 text-center border ${styles.message}`}>
                  No activity in the last year
                </div>
              }
            >
              <For each={stats()}>
                {(x: number) => {
                  return (
                    <div
                      title={x.toString()}
                      class={`mx-0 mx-md-1 ${styles.bar}`}
                      style={{ height: `${percentage(x)}%` }}
                    />
                  );
                }}
              </For>
            </Show>
          </div>
        </div>
        <Show when={months()}>
          <div class="d-flex flex-row-reverse justify-content-between mb-1">
            <For each={months()}>
              {(m: string) => {
                return <div class={`text-muted text-nowrap ${styles.month}`}>{m}</div>;
              }}
            </For>
          </div>
        </Show>
      </div>
      <Show when={!isAllZero()}>
        <div class={`d-flex flex-row align-items-center ${styles.chart}`}>
          <div class="d-flex flex-column-reverse justify-content-between h-100">
            <For each={calculateAxisValues(0, Math.max(...stats()), 4)}>
              {(value: number) => {
                return (
                  <div class={`text-end ps-1 ${styles.axisValue}`}>{isInteger(value) ? value : value.toFixed(1)}</div>
                );
              }}
            </For>
          </div>
          <div class={`fst-italic text-muted text-center ${styles.axisLegend}`}>Commits</div>
        </div>
      </Show>
    </div>
  );
};

export default ParticipationStats;

import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { createSignal, For, onMount, Show } from 'solid-js';

import { REGEX_UNDERSCORE } from '../../../data';
import { Acquisition, FundingRound } from '../../../types';
import prettifyNumber from '../../../utils/prettifyNumber';
import styles from './FundingRoundsTable.module.css';

interface Props {
  titleClassName?: string;
  rounds: FundingRound[];
}

const MAX_ITEMS = 10;

const FundingRoundsTable = (props: Props) => {
  const [roundsList, setRoundsList] = createSignal<FundingRound[]>();
  const [visibleCollapsableOption, setVisibleCollapsableOption] = createSignal<boolean>(false);
  const [collapsed, setCollapsed] = createSignal<boolean>(true);

  onMount(() => {
    const tmpRounds: Acquisition[] = [];

    props.rounds.forEach((ac: Acquisition) => {
      if (!Object.values(ac).every((el) => el === undefined)) {
        tmpRounds.push(ac);
      }
    });

    if (!isEmpty(tmpRounds)) {
      setRoundsList(tmpRounds);
      setVisibleCollapsableOption(tmpRounds.length > MAX_ITEMS);
    }
  });

  return (
    <Show when={!isUndefined(roundsList())}>
      <div class={`fw-bold text-uppercase mt-3 mt-lg-4 mb-2 mb-lg-3 ${props.titleClassName}`}>Funding rounds</div>
      <div class="w-100 my-3">
        <table class={`table table-sm table-striped table-bordered mb-0 ${styles.tableLayout}`}>
          <thead class={`text-uppercase text-muted ${styles.thead}`}>
            <tr>
              <th class="text-center" scope="col">
                Investment type
              </th>
              <th class={`text-center ${styles.minCol}`} scope="col">
                Price
              </th>
              <th class={`text-center text-nowrap ${styles.minCol}`} scope="col">
                Announced <span class="d-none d-md-inline-block">on</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={collapsed() ? roundsList()!.slice(0, MAX_ITEMS - 1) : roundsList()}>
              {(round: FundingRound) => {
                return (
                  <tr class={styles.tableContent}>
                    <td class="px-2 px-lg-3 text-truncate text-muted text-capitalize">
                      {!isUndefined(round.kind) ? round.kind?.replace(REGEX_UNDERSCORE, ' ') : '-'}
                    </td>
                    <td class="px-2 px-lg-3 text-center text-nowrap">
                      <Show when={!isUndefined(round.amount)} fallback="-">
                        <small class="text-muted">US$</small> {prettifyNumber(round.amount!)}
                      </Show>
                    </td>
                    <td class="px-2 px-lg-3 text-center text-nowrap text-muted">{round.announced_on}</td>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
        <Show when={visibleCollapsableOption()}>
          <div class="w-100 text-center">
            <button
              class={`btn btn-link btn-sm text-muted text-decoration-underline pe-0 ${styles.collapsedBtn}`}
              onClick={() => setCollapsed(!collapsed())}
            >
              Show {collapsed() ? 'more' : 'less'}
            </button>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default FundingRoundsTable;

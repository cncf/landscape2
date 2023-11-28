import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { createSignal, For, onMount, Show } from 'solid-js';

import { Acquisition } from '../../../types';
import prettifyNumber from '../../../utils/prettifyNumber';
import styles from './AcquisitionsTable.module.css';

interface Props {
  titleClassName?: string;
  acquisitions: Acquisition[];
}

const MAX_ITEMS = 10;

const AcquisitionsTable = (props: Props) => {
  const [acquisitionsList, setAcquisitionsList] = createSignal<Acquisition[]>();
  const [visibleCollapsableOption, setVisibleCollapsableOption] = createSignal<boolean>(false);
  const [collapsed, setCollapsed] = createSignal<boolean>(true);

  onMount(() => {
    const tmpAcquisitions: Acquisition[] = [];

    props.acquisitions.forEach((ac: Acquisition) => {
      if (!Object.values(ac).every((el) => el === undefined)) {
        tmpAcquisitions.push(ac);
      }
    });

    if (!isEmpty(tmpAcquisitions)) {
      setAcquisitionsList(tmpAcquisitions);
      setVisibleCollapsableOption(tmpAcquisitions.length > MAX_ITEMS);
    }
  });

  return (
    <Show when={!isUndefined(acquisitionsList())}>
      <div class={`fw-bold text-uppercase mt-3 mt-lg-4 mb-2 mb-lg-3 ${props.titleClassName}`}>Acquisitions</div>
      <div class="w-100 my-3">
        <table class={`table table-sm table-striped table-bordered mb-0 ${styles.tableLayout}`}>
          <thead class={`text-uppercase text-muted ${styles.thead}`}>
            <tr>
              <th class="text-center" scope="col">
                Name
              </th>
              <th class={`text-center ${styles.minCol}`} scope="col">
                Price (USD)
              </th>
              <th class={`text-center text-nowrap ${styles.minCol}`} scope="col">
                Announced <span class="d-none d-md-inline-block">on</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={collapsed() ? acquisitionsList()!.slice(0, MAX_ITEMS - 1) : acquisitionsList()}>
              {(acquisition: Acquisition) => {
                return (
                  <tr class={styles.tableContent}>
                    <td class="px-2 px-lg-3 text-truncate text-muted">{acquisition.acquiree_name}</td>
                    <td class="px-2 px-lg-3 text-center text-nowrap">
                      <Show when={!isUndefined(acquisition.price)} fallback="-">
                        ${prettifyNumber(acquisition.price!)}
                      </Show>
                    </td>
                    <td class="px-2 px-lg-3 text-center text-nowrap text-muted">{acquisition.announced_on}</td>
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

export default AcquisitionsTable;

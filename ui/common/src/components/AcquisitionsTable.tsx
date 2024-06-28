import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { createSignal, For, onMount, Show } from 'solid-js';
import { css } from 'solid-styled-components';

import { Acquisition } from '../types/types';
import { prettifyNumber } from '../utils/prettifyNumber';

interface Props {
  titleClassName?: string;
  acquisitions: Acquisition[];
}

const MAX_ITEMS = 10;

const TableLayout = css`
  table-layout: fixed;
`;

const Thead = css`
  font-size: 0.8rem !important;

  th {
    color: var(--bs-gray-600);
  }

  @media only screen and (max-width: 767.98px) {
    font-size: 0.6rem;
  }
`;

const TableContent = css`
  td {
    font-size: 0.8rem !important;
    line-height: 2;
  }

  @media only screen and (max-width: 767.98px) {
    td {
      font-size: 0.7rem;
      line-height: 1.5;
    }
  }
`;

const MinCol = css`
  width: 200px;

  @media only screen and (max-width: 991.98px) {
    width: 150px;
  }

  @media only screen and (max-width: 767.98px) {
    width: 90px;
  }
`;

const CollapsedBtn = css`
  font-size: 0.8rem !important;
`;

export const AcquisitionsTable = (props: Props) => {
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
        <table class={`table table-sm table-striped table-bordered mb-0 ${TableLayout}`}>
          <thead class={`text-uppercase text-muted ${Thead}`}>
            <tr>
              <th class="text-center" scope="col">
                Name
              </th>
              <th class={`text-center ${MinCol}`} scope="col">
                Price (USD)
              </th>
              <th class={`text-center text-nowrap ${MinCol}`} scope="col">
                Announced <span class="d-none d-md-inline-block">on</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={collapsed() ? acquisitionsList()!.slice(0, MAX_ITEMS - 1) : acquisitionsList()}>
              {(acquisition: Acquisition) => {
                return (
                  <tr class={TableContent}>
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
              class={`btn btn-link btn-sm text-muted text-decoration-underline pe-0 ${CollapsedBtn}`}
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

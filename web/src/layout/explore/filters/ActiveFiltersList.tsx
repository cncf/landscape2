import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, For, on, Show } from 'solid-js';

import { ActiveFilters, FilterCategory, SVGIconKind } from '../../../types';
import formatProfitLabel from '../../../utils/formatLabelProfit';
import getFoundationNameLabel from '../../../utils/getFoundationNameLabel';
import SVGIcon from '../../common/SVGIcon';
import styles from './ActiveFiltersList.module.css';

interface Props {
  activeFilters: ActiveFilters;
  resetFilters: () => void;
  removeFilter: (name: FilterCategory, value: string) => void;
}

const ActiveFiltersList = (props: Props) => {
  const activeFilters = () => props.activeFilters;
  const [showLoading, setShowLoading] = createSignal<boolean>(false);

  const onResetFilters = () => {
    setShowLoading(true);
    setTimeout(() => {
      props.resetFilters();
    }, 200);
  };

  createEffect(
    on(activeFilters, () => {
      if (showLoading() && isEmpty(activeFilters())) {
        setShowLoading(false);
      }
    })
  );

  return (
    <Show when={Object.keys(activeFilters()).length > 0}>
      <div class="d-flex flex-row align-items-center mb-3">
        <div class={`d-flex flex-row align-items-center text-muted text-uppercase me-3 ${styles.btnLegend}`}>
          <small>Filters applied</small>
          <button class={`btn btn-link btn-sm text-muted p-0 ps-1 ${styles.btnReset}`} onClick={onResetFilters}>
            (reset all)
          </button>
          <small>:</small>
        </div>
        <For each={Object.keys(activeFilters())}>
          {(f: string) => {
            if (isUndefined(props.activeFilters[f as FilterCategory])) return null;
            return (
              <div class="d-flex flex-row" role="list">
                {
                  <For each={props.activeFilters[f as FilterCategory]}>
                    {(c: string) => {
                      // Do not render maturity filter when is foundation name
                      if (f === FilterCategory.Maturity && c === getFoundationNameLabel()) return null;
                      return (
                        <span
                          role="listitem"
                          class={`badge badge-sm border rounded-0 me-3 my-1 d-flex flex-row align-items-center ${styles.filterBadge}`}
                        >
                          <div class="d-flex flex-row align-items-baseline">
                            <div>
                              <small class="text-uppercase fw-normal me-2">{f}:</small>
                              <span
                                class={
                                  [FilterCategory.Maturity, FilterCategory.CompanyType].includes(f as FilterCategory)
                                    ? 'text-uppercase'
                                    : ''
                                }
                              >
                                {f === FilterCategory.CompanyType ? formatProfitLabel(c) : c}
                              </span>
                            </div>
                            <button
                              class="btn btn-link btn-sm text-reset lh-1 p-0 ps-2"
                              onClick={() => props.removeFilter(f as FilterCategory, c)}
                              aria-label={`Remove ${c} filter`}
                              title={`Remove ${c} filter`}
                            >
                              <SVGIcon kind={SVGIconKind.ClearCircle} />
                            </button>
                          </div>
                        </span>
                      );
                    }}
                  </For>
                }
              </div>
            );
          }}
        </For>
        <Show when={showLoading()}>
          <div class="spinner-border spinner-border-sm text-secondary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default ActiveFiltersList;

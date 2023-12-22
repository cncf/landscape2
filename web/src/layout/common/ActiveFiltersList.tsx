import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import startCase from 'lodash/startCase';
import { createEffect, createSignal, For, Match, on, Show, Switch } from 'solid-js';

import { REGEX_UNDERSCORE } from '../../data';
import { ActiveFilters, FilterCategory, SVGIconKind } from '../../types';
import formatProfitLabel from '../../utils/formatLabelProfit';
import getFoundationNameLabel from '../../utils/getFoundationNameLabel';
import { formatTAGName } from '../../utils/prepareFilters';
import styles from './ActiveFiltersList.module.css';
import SVGIcon from './SVGIcon';

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
      <div class="d-flex flex-row align-items-start mb-3">
        <div
          class={`d-flex flex-row align-items-center text-nowrap text-muted text-uppercase me-3 mt-2 ${styles.btnLegend}`}
        >
          <small>Filters applied</small>
          <button class={`btn btn-link btn-sm text-muted p-0 ps-1 ${styles.btnReset}`} onClick={onResetFilters}>
            (reset all)
          </button>
          <small>:</small>
        </div>
        <div class="d-flex flex-row flex-wrap">
          <For each={Object.keys(activeFilters())}>
            {(f: string) => {
              if (isUndefined(props.activeFilters[f as FilterCategory])) return null;
              return (
                <>
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
                                  <Switch fallback={<>{c}</>}>
                                    <Match when={f === FilterCategory.CompanyType}>
                                      <>{formatProfitLabel(c)}</>
                                    </Match>
                                    <Match when={f === FilterCategory.TAG}>
                                      <span class="text-uppercase">{formatTAGName(c)}</span>
                                    </Match>
                                    <Match when={f === FilterCategory.InvestmentType}>
                                      <>{startCase(c.replace(REGEX_UNDERSCORE, ' '))}</>
                                    </Match>
                                  </Switch>
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
                </>
              );
            }}
          </For>
        </div>
        <Show when={showLoading()}>
          <div class="spinner-border spinner-border-sm text-secondary mt-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default ActiveFiltersList;

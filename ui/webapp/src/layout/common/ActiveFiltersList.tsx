import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import startCase from 'lodash/startCase';
import { batch, createEffect, createSignal, For, Match, on, Show, Switch } from 'solid-js';

import { REGEX_UNDERSCORE } from '../../data';
import { ActiveFilters, FilterCategory, SVGIconKind } from '../../types';
import formatProfitLabel from '../../utils/formatLabelProfit';
import getFoundationNameLabel from '../../utils/getFoundationNameLabel';
import { formatTAGName } from '../../utils/prepareFilters';
import styles from './ActiveFiltersList.module.css';
import SVGIcon from './SVGIcon';

interface Props {
  activeFilters: ActiveFilters;
  maturityOptions?: string[];
  licenseOptions?: string[];
  resetFilters: () => void;
  removeFilter: (name: FilterCategory, value: string) => void;
}

const ActiveFiltersList = (props: Props) => {
  const initialActiveFilters = () => props.activeFilters;
  const [activeFilters, setActiveFilters] = createSignal<ActiveFilters>({});
  const [activeFiltersKeys, setActiveFiltersKeys] = createSignal<FilterCategory[]>([]);
  const licenseOptions = () => props.licenseOptions;

  createEffect(
    on(initialActiveFilters, () => {
      const keys: FilterCategory[] = [];
      Object.keys(initialActiveFilters()).forEach((key) => {
        if (!isEmpty(initialActiveFilters()[key as FilterCategory])) keys.push(key as FilterCategory);
      });

      batch(() => {
        setActiveFilters(initialActiveFilters());
        setActiveFiltersKeys(keys);
      });
    })
  );

  return (
    <Show when={Object.keys(activeFilters()).length > 0}>
      <div class="d-flex flex-row align-items-start mb-3">
        <div
          class={`d-flex flex-row align-items-center text-nowrap text-muted text-uppercase me-3 mt-2 ${styles.btnLegend}`}
        >
          <small>Filters applied</small>
          <button
            class={`btn btn-link btn-sm text-muted p-0 ps-1 ${styles.btnReset}`}
            onClick={() => props.resetFilters()}
          >
            (reset all)
          </button>
          <small>:</small>
        </div>
        <div class="d-flex flex-row flex-wrap">
          <For each={activeFiltersKeys()}>
            {(f: string) => {
              const activeFiltersPerCategory = () => activeFilters()[f as FilterCategory];
              if (isUndefined(activeFiltersPerCategory()) || isEmpty(activeFiltersPerCategory())) return null;

              const allMaturitySelected = () =>
                !isUndefined(props.maturityOptions) &&
                f === FilterCategory.Maturity &&
                props.maturityOptions.every((element) => activeFiltersPerCategory()!.includes(element));

              const allLicensesSelected = () =>
                !isUndefined(licenseOptions()) &&
                licenseOptions()!.length > 0 &&
                f === FilterCategory.License &&
                licenseOptions()!.every((element) => activeFiltersPerCategory()!.includes(element));

              const foundationLabel = getFoundationNameLabel();

              return (
                <>
                  <Switch>
                    <Match when={allMaturitySelected()}>
                      <span
                        role="listitem"
                        class={`badge badge-sm border rounded-0 me-3 my-1 d-flex flex-row align-items-center ${styles.filterBadge}`}
                      >
                        <div class="d-flex flex-row align-items-baseline">
                          <div>
                            <small class="text-uppercase fw-normal me-2">{f}:</small>
                            <span class="text-uppercase">{foundationLabel}</span>
                          </div>
                          <button
                            class="btn btn-link btn-sm text-reset lh-1 p-0 ps-2"
                            onClick={() => props.removeFilter(f as FilterCategory, foundationLabel)}
                            aria-label={`Remove ${foundationLabel} filter`}
                            title={`Remove ${foundationLabel} filter`}
                          >
                            <SVGIcon kind={SVGIconKind.ClearCircle} />
                          </button>
                        </div>
                      </span>
                    </Match>

                    <Match when={allLicensesSelected()}>
                      <span
                        role="listitem"
                        class={`badge badge-sm border rounded-0 me-3 my-1 d-flex flex-row align-items-center ${styles.filterBadge}`}
                      >
                        <div class="d-flex flex-row align-items-baseline">
                          <div>
                            <small class="text-uppercase fw-normal me-2">{f}:</small>
                            <span class="text-uppercase">Open Source</span>
                          </div>
                          <button
                            class="btn btn-link btn-sm text-reset lh-1 p-0 ps-2"
                            onClick={() => props.removeFilter(f as FilterCategory, 'oss')}
                            aria-label={`Remove open source filter`}
                            title={`Remove open source filter`}
                          >
                            <SVGIcon kind={SVGIconKind.ClearCircle} />
                          </button>
                        </div>
                      </span>
                    </Match>

                    <Match when={f === FilterCategory.Extra}>
                      <For each={activeFiltersPerCategory()}>
                        {(c: string) => {
                          return (
                            <span
                              role="listitem"
                              class={`badge badge-sm border rounded-0 me-3 my-1 d-flex flex-row align-items-center ${styles.filterBadge}`}
                            >
                              <div class="d-flex flex-row align-items-baseline">
                                <div>
                                  <span class="text-uppercase">{c}</span>
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
                    </Match>
                  </Switch>
                  <For each={activeFiltersPerCategory()}>
                    {(c: string) => {
                      if (
                        (allMaturitySelected() && c !== `non-${getFoundationNameLabel()}`) ||
                        (allLicensesSelected() && c !== 'non-oss')
                      )
                        return null;

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
                                  [FilterCategory.Maturity, FilterCategory.OrgType].includes(f as FilterCategory)
                                    ? 'text-uppercase'
                                    : ''
                                }
                              >
                                <Switch fallback={<>{c}</>}>
                                  <Match when={f === FilterCategory.OrgType}>
                                    <>{formatProfitLabel(c)}</>
                                  </Match>
                                  <Match when={f === FilterCategory.TAG}>
                                    <span class="text-uppercase">{formatTAGName(c)}</span>
                                  </Match>
                                  <Match when={f === FilterCategory.InvestmentType}>
                                    <>{startCase(c.replace(REGEX_UNDERSCORE, ' '))}</>
                                  </Match>
                                  <Match when={f === FilterCategory.License && c === 'non-oss'}>
                                    <span class="text-uppercase">Not open source</span>
                                  </Match>
                                  <Match
                                    when={f === FilterCategory.Maturity && c === `non-${getFoundationNameLabel()}`}
                                  >
                                    <span class="text-uppercase">Not {getFoundationNameLabel()} project</span>
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
                </>
              );
            }}
          </For>
        </div>
      </div>
    </Show>
  );
};

export default ActiveFiltersList;

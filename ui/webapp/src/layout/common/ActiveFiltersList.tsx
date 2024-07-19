import { formatProfitLabel, formatTAGName, SVGIcon, SVGIconKind } from 'common';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import startCase from 'lodash/startCase';
import { For, Match, Show, Switch } from 'solid-js';

import { REGEX_UNDERSCORE } from '../../data';
import { ActiveFilters, FilterCategory } from '../../types';
import getFoundationNameLabel from '../../utils/getFoundationNameLabel';
import styles from './ActiveFiltersList.module.css';

interface Props {
  activeFilters: ActiveFilters;
  maturityOptions?: string[];
  licenseOptions?: string[];
  resetFilters: () => void;
  removeFilter: (name: FilterCategory, value: string) => void;
}

interface FiltersProps {
  category: FilterCategory;
  filters: string[];
  removeFilter: (name: FilterCategory, value: string) => void;
}

interface FiltersPerCategoryProps extends FiltersProps {
  maturityOptions?: string[];
  licenseOptions?: string[];
}

const FiltersPerCategoryList = (props: FiltersProps) => {
  return (
    <For each={props.filters}>
      {(c: string) => {
        return (
          <span
            role="listitem"
            class={`badge badge-sm border rounded-0 me-3 my-1 d-flex flex-row align-items-center ${styles.filterBadge}`}
          >
            <div class="d-flex flex-row align-items-baseline">
              <div>
                <small class="text-uppercase fw-normal me-2">{props.category}:</small>
                <span
                  class={
                    [FilterCategory.Maturity, FilterCategory.OrgType].includes(props.category) ? 'text-uppercase' : ''
                  }
                >
                  <Switch fallback={<>{c}</>}>
                    <Match when={props.category === FilterCategory.OrgType}>
                      <>{formatProfitLabel(c)}</>
                    </Match>
                    <Match when={props.category === FilterCategory.TAG}>
                      <span class="text-uppercase">{formatTAGName(c)}</span>
                    </Match>
                    <Match when={props.category === FilterCategory.InvestmentType}>
                      <>{startCase(c.replace(REGEX_UNDERSCORE, ' '))}</>
                    </Match>
                    <Match when={props.category === FilterCategory.License && c === 'non-oss'}>
                      <span class="text-uppercase">Not open source</span>
                    </Match>
                    <Match when={props.category === FilterCategory.Maturity && c === `non-${getFoundationNameLabel()}`}>
                      <span class="text-uppercase">Not {getFoundationNameLabel()} project</span>
                    </Match>
                    <Match when={props.category === FilterCategory.ProjectMaturity}>
                      <>{startCase(c)}</>
                    </Match>
                  </Switch>
                </span>
              </div>
              <button
                class="btn btn-link btn-sm text-reset lh-1 p-0 ps-2"
                onClick={() => props.removeFilter(props.category, c)}
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
  );
};

const FiltersPerCategory = (props: FiltersPerCategoryProps) => {
  const foundationLabel = getFoundationNameLabel();

  return (
    <Switch>
      <Match when={props.category === FilterCategory.Maturity}>
        <Show
          when={
            !isUndefined(props.maturityOptions) &&
            props.maturityOptions.length > 0 &&
            props.maturityOptions.every((element) => props.filters.includes(element))
          }
          fallback={
            <FiltersPerCategoryList
              category={props.category}
              filters={props.filters}
              removeFilter={props.removeFilter}
            />
          }
        >
          <span
            role="listitem"
            class={`badge badge-sm border rounded-0 me-3 my-1 d-flex flex-row align-items-center ${styles.filterBadge}`}
          >
            <div class="d-flex flex-row align-items-baseline">
              <div>
                <small class="text-uppercase fw-normal me-2">{props.category}:</small>
                <span class="text-uppercase">{foundationLabel}</span>
              </div>
              <button
                class="btn btn-link btn-sm text-reset lh-1 p-0 ps-2"
                onClick={() => props.removeFilter(props.category, foundationLabel)}
                aria-label={`Remove ${foundationLabel} filter`}
                title={`Remove ${foundationLabel} filter`}
              >
                <SVGIcon kind={SVGIconKind.ClearCircle} />
              </button>
            </div>
          </span>
        </Show>
      </Match>
      <Match when={props.category === FilterCategory.License}>
        <Show
          when={
            !isUndefined(props.licenseOptions) &&
            props.licenseOptions.length > 0 &&
            props.licenseOptions.every((element) => props.filters.includes(element))
          }
          fallback={
            <FiltersPerCategoryList
              category={props.category}
              filters={props.filters}
              removeFilter={props.removeFilter}
            />
          }
        >
          <span
            role="listitem"
            class={`badge badge-sm border rounded-0 me-3 my-1 d-flex flex-row align-items-center ${styles.filterBadge}`}
          >
            <div class="d-flex flex-row align-items-baseline">
              <div>
                <small class="text-uppercase fw-normal me-2">{props.category}:</small>
                <span class="text-uppercase">Open Source</span>
              </div>
              <button
                class="btn btn-link btn-sm text-reset lh-1 p-0 ps-2"
                onClick={() => props.removeFilter(props.category, 'oss')}
                aria-label={`Remove open source filter`}
                title={`Remove open source filter`}
              >
                <SVGIcon kind={SVGIconKind.ClearCircle} />
              </button>
            </div>
          </span>
        </Show>
      </Match>
      <Match when={props.category === FilterCategory.Extra}>
        <For each={props.filters}>
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
                    onClick={() => props.removeFilter(props.category, c)}
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
      <Match when={![FilterCategory.Maturity, FilterCategory.License, FilterCategory.Extra].includes(props.category)}>
        <FiltersPerCategoryList category={props.category} filters={props.filters} removeFilter={props.removeFilter} />{' '}
      </Match>
    </Switch>
  );
};

const ActiveFiltersList = (props: Props) => {
  const initialActiveFilters = () => props.activeFilters;

  return (
    <Show when={Object.keys(initialActiveFilters()).length > 0}>
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
          <For each={Object.keys(initialActiveFilters())}>
            {(f: string) => {
              const category = f as FilterCategory;
              const filters = () => initialActiveFilters()[category];
              if (isUndefined(filters()) || isEmpty(filters())) return null;

              return (
                <FiltersPerCategory
                  category={category}
                  filters={filters()!}
                  maturityOptions={props.maturityOptions}
                  licenseOptions={props.licenseOptions}
                  removeFilter={props.removeFilter}
                />
              );
            }}
          </For>
        </div>
      </div>
    </Show>
  );
};

export default ActiveFiltersList;

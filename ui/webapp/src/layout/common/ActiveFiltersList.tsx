import { formatProfitLabel, formatTAGName, REGEX_UNDERSCORE } from 'common';
import difference from 'lodash/difference';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import startCase from 'lodash/startCase';
import { For, Match, Show, Switch } from 'solid-js';

import { FOUNDATION } from '../../data';
import { ActiveFilters, FilterCategory } from '../../types';
import { OSS_LICENSE } from '../../utils/exploreQuery';
import getFoundationNameLabel from '../../utils/getFoundationNameLabel';
import styles from './ActiveFiltersList.module.css';
import FilterBadge from './FilterBadge';

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
      {(c: string) => (
        <FilterBadge
          category={props.category}
          label={
            <span
              class={[FilterCategory.Maturity, FilterCategory.OrgType].includes(props.category) ? 'text-uppercase' : ''}
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
                  <span class="text-uppercase">Non open source</span>
                </Match>
                <Match when={props.category === FilterCategory.License && c === OSS_LICENSE}>
                  <span class="text-uppercase">Open Source</span>
                </Match>
                <Match
                  when={props.category === FilterCategory.Maturity && c === `non-${getFoundationNameLabel(FOUNDATION)}`}
                >
                  <span class="text-uppercase">Non {getFoundationNameLabel(FOUNDATION)} project</span>
                </Match>
                <Match when={props.category === FilterCategory.ProjectMaturity}>
                  <>{startCase(c)}</>
                </Match>
              </Switch>
            </span>
          }
          removeLabel={`Remove ${c} filter`}
          onRemove={() => props.removeFilter(props.category, c)}
        />
      )}
    </For>
  );
};

const FiltersPerCategory = (props: FiltersPerCategoryProps) => {
  const foundationLabel = getFoundationNameLabel(FOUNDATION);
  const allMaturitySelected = () => isEverySelected(props.filters, props.maturityOptions);
  const allLicensesSelected = () => isEverySelected(props.filters, props.licenseOptions);

  // A collapsed badge stands for every option, and each remaining value gets its own badge
  return (
    <Switch>
      <Match when={props.category === FilterCategory.Maturity}>
        <Show when={allMaturitySelected()}>
          <FilterBadge
            category={props.category}
            label={<span class="text-uppercase">{foundationLabel}</span>}
            removeLabel={`Remove ${foundationLabel} filter`}
            onRemove={() => props.removeFilter(props.category, foundationLabel)}
          />
        </Show>
        <FiltersPerCategoryList
          category={props.category}
          filters={allMaturitySelected() ? difference(props.filters, props.maturityOptions!) : props.filters}
          removeFilter={props.removeFilter}
        />
      </Match>
      <Match when={props.category === FilterCategory.License}>
        <Show when={allLicensesSelected()}>
          <FilterBadge
            category={props.category}
            label={<span class="text-uppercase">Open Source</span>}
            removeLabel="Remove open source filter"
            onRemove={() => props.removeFilter(props.category, OSS_LICENSE)}
          />
        </Show>
        <FiltersPerCategoryList
          category={props.category}
          filters={allLicensesSelected() ? difference(props.filters, props.licenseOptions!) : props.filters}
          removeFilter={props.removeFilter}
        />
      </Match>
      <Match when={props.category === FilterCategory.Extra}>
        <For each={props.filters}>
          {(c: string) => (
            <FilterBadge
              label={<span class="text-uppercase">{c}</span>}
              removeLabel={`Remove ${c} filter`}
              onRemove={() => props.removeFilter(props.category, c)}
            />
          )}
        </For>
      </Match>
      <Match when={![FilterCategory.Maturity, FilterCategory.License, FilterCategory.Extra].includes(props.category)}>
        <FiltersPerCategoryList category={props.category} filters={props.filters} removeFilter={props.removeFilter} />
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
            type="button"
            class={`btn btn-link btn-sm text-muted p-0 ps-1 ${styles.btnReset}`}
            onClick={() => props.resetFilters()}
            aria-label="Reset all filters"
          >
            (reset all)
          </button>
          <small>:</small>
        </div>
        <div class="d-flex flex-row flex-wrap" role="list" aria-label="Filters applied">
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

/** Checks whether the filters hold every option, when there are options. */
const isEverySelected = (filters: string[], options?: string[]): boolean =>
  !isUndefined(options) && options.length > 0 && options.every((option) => filters.includes(option));

export default ActiveFiltersList;

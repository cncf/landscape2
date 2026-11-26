import difference from 'lodash/difference';
import uniq from 'lodash/uniq';

import {
  CLASSIFY_PARAM,
  DEFAULT_CLASSIFY,
  DEFAULT_SORT,
  DEFAULT_SORT_DIRECTION,
  GROUP_PARAM,
  SORT_BY_PARAM,
  SORT_DIRECTION_PARAM,
  VIEW_MODE_PARAM,
} from '../data';
import { ActiveFilters, ClassifyOption, FilterCategory, SortDirection, SortOption, ViewMode } from '../types';
import { parseEnum, RawParam } from './urlParams';

/** Query keys of the Extra filter options, each written as `<key>=true`. */
const EXTRA_FILTER_KEYS: readonly string[] = ['specification', 'enduser'];

/** Value of an active Extra filter key. */
const EXTRA_FILTER_VALUE = 'true';

/** Query keys owned by the filters, removed before the active filters are written. */
const FILTER_KEYS: readonly string[] = [...Object.values(FilterCategory), ...EXTRA_FILTER_KEYS];

/** License filter token that stands for every license of the group. */
export const OSS_LICENSE = 'oss';

const SORT_DIRECTIONS = Object.values(SortDirection);

/** Filter categories written as `<category>=<value>`; Extra uses its own keys. */
const VALUE_FILTER_CATEGORIES: readonly string[] = Object.values(FilterCategory).filter(
  (category) => category !== FilterCategory.Extra
);

/** Explore view state carried by the query string. */
export interface ExploreQuery {
  classify: ClassifyOption;
  filters: ActiveFilters;
  sortBy: SortOption;
  sortDirection: SortDirection;
}

/** Options that the Explore query is parsed and built against. */
export interface ExploreQueryContext {
  /** Classify options available in the active group. */
  classifyOptions: readonly ClassifyOption[];
  /** Maturity filter token that stands for every maturity option (for example `cncf`). */
  foundationLabel: string;
  /** Licenses of the active group's repositories, empty until the full data is loaded. */
  licenseOptions: readonly string[];
  /** Maturity options of the landscape. */
  maturityOptions: readonly string[];
  /** Sort options available in the active group. */
  sortOptions: readonly SortOption[];
}

/** Explore state written into the URL by `buildExploreSearch`. */
export interface ExploreSearchState {
  /** Active filters. */
  filters: ActiveFilters;
  /** Current search, whose params outside the Explore contract (`item`, `overlay-*`) are kept. */
  search: string;
  /** View mode. */
  viewMode: ViewMode;
  /** Classify option, only written in Card view. */
  classify?: ClassifyOption;
  /** Group, not written when the landscape has no groups. */
  group?: string;
  /** Sort option, only written in Card view. */
  sortBy?: SortOption;
  /** Sort direction, only written in Card view. */
  sortDirection?: SortDirection;
}

/**
 * Returns the search of the Explore state: the current search with the Explore params
 * replaced by the state's ones. The group is set only when it is defined, and the
 * classify and sort params only when they are. Returns a `?`-prefixed search, or an
 * empty string when no params are left.
 */
export const buildExploreSearch = (state: ExploreSearchState, ctx: ExploreQueryContext): string => {
  const params = new URLSearchParams(state.search);
  FILTER_KEYS.forEach((key) => params.delete(key));

  const scalars: [string, string | undefined][] = [
    [GROUP_PARAM, state.group],
    [VIEW_MODE_PARAM, state.viewMode],
    [CLASSIFY_PARAM, state.classify],
    [SORT_BY_PARAM, state.sortBy],
    [SORT_DIRECTION_PARAM, state.sortDirection],
  ];
  scalars.forEach(([key, value]) => {
    if (value === undefined) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  buildFiltersQuery(state.filters, ctx).forEach((value, key) => params.append(key, value));

  const query = params.toString();
  return query === '' ? '' : `?${query}`;
};

/**
 * Returns the query params of the active filters. A category holding every maturity
 * option is written as the foundation label, and one holding every license as `oss`,
 * followed by any remaining value of that category. Extra values are written as
 * `<key>=true`.
 */
export const buildFiltersQuery = (filters: ActiveFilters, ctx: ExploreQueryContext): URLSearchParams => {
  const params = new URLSearchParams();

  (Object.keys(filters) as FilterCategory[]).forEach((category) => {
    const values = filters[category] ?? [];

    if (category === FilterCategory.Extra) {
      values.filter((key) => EXTRA_FILTER_KEYS.includes(key)).forEach((key) => params.append(key, EXTRA_FILTER_VALUE));
    } else if (category === FilterCategory.Maturity) {
      appendCollapsible(params, category, values, ctx.maturityOptions, ctx.foundationLabel);
    } else if (category === FilterCategory.License) {
      appendCollapsible(params, category, values, ctx.licenseOptions, OSS_LICENSE);
    } else {
      values.forEach((value) => params.append(category, value));
    }
  });

  return params;
};

/**
 * Parses the Explore query. Classify and sort values outside the group's options give
 * the defaults. Repeated filter keys accumulate, the foundation label and `oss` expand
 * to every maturity option and license (when there are any), Extra keys count only
 * with the value `true`, and unknown keys are ignored.
 */
export const parseExploreQuery = (search: string, ctx: ExploreQueryContext): ExploreQuery => {
  const params = new URLSearchParams(search);
  const filters: ActiveFilters = {};

  const addValues = (category: FilterCategory, values: readonly string[]) => {
    filters[category] = uniq([...(filters[category] ?? []), ...values]);
  };

  params.forEach((value, key) => {
    if (EXTRA_FILTER_KEYS.includes(key)) {
      if (value === EXTRA_FILTER_VALUE) {
        addValues(FilterCategory.Extra, [key]);
      }
    } else if (VALUE_FILTER_CATEGORIES.includes(key) && value !== '') {
      const category = key as FilterCategory;
      if (category === FilterCategory.Maturity && value === ctx.foundationLabel && ctx.maturityOptions.length > 0) {
        addValues(category, ctx.maturityOptions);
      } else if (category === FilterCategory.License && value === OSS_LICENSE && ctx.licenseOptions.length > 0) {
        addValues(category, ctx.licenseOptions);
      } else {
        addValues(category, [value]);
      }
    }
  });

  return {
    classify: parseEnum(getParam(params, CLASSIFY_PARAM), ctx.classifyOptions, DEFAULT_CLASSIFY),
    filters,
    sortBy: parseEnum(getParam(params, SORT_BY_PARAM), ctx.sortOptions, DEFAULT_SORT),
    sortDirection: parseEnum(getParam(params, SORT_DIRECTION_PARAM), SORT_DIRECTIONS, DEFAULT_SORT_DIRECTION),
  };
};

/**
 * Appends the values of a category that has a collapsed token: the token when the
 * values hold every option (and there are options), followed by the remaining values.
 */
const appendCollapsible = (
  params: URLSearchParams,
  category: FilterCategory,
  values: readonly string[],
  options: readonly string[],
  token: string
) => {
  const collapsed = options.length > 0 && options.every((option) => values.includes(option));
  if (collapsed) {
    params.append(category, token);
  }

  const remaining = collapsed ? difference(values, [...options, token]) : values;
  remaining.forEach((value) => params.append(category, value));
};

/** Returns a param as the router reads it: its value, its values when repeated, or `undefined`. */
const getParam = (params: URLSearchParams, key: string): RawParam => {
  const values = params.getAll(key);
  if (values.length === 0) return undefined;
  return values.length === 1 ? values[0] : values;
};

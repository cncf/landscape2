import uniq from 'lodash/uniq';

import { FINANCES_KIND_PARAM, PAGE_PARAM, SORT_BY_PARAM, SORT_DIRECTION_PARAM } from '../data';
import { ActiveFilters, FilterCategory } from '../types';
import { parseEnum } from './urlParams';

/** Query keys owned by the table pages, replaced when their state is written. */
const TABLE_KEYS: readonly string[] = [
  FINANCES_KIND_PARAM,
  PAGE_PARAM,
  SORT_BY_PARAM,
  SORT_DIRECTION_PARAM,
  ...Object.values(FilterCategory),
];

/** A positive integer without leading zeros or sign. */
const PAGE_REGEX = /^[1-9]\d*$/;

/** Sort of a table: the field and the direction. */
export interface TableSort {
  by: string;
  direction: 'asc' | 'desc';
}

/** Sort option of a table's Order select. */
export interface TableSortOption extends TableSort {
  label: string;
}

/** Options that a table query is parsed against. */
export interface TableQueryConfig<K extends string = string> {
  /** Sort used when the query holds none of the allowed sorts. */
  defaultSort: TableSort;
  /** Filter categories of the table. */
  filterCategories: readonly FilterCategory[];
  /** Allowed sorts, or the allowed sorts of each kind. */
  sortOptions: readonly TableSort[] | Readonly<Record<K, readonly TableSort[]>>;
  /** Kind used when the query holds none of the allowed kinds. */
  defaultKind?: K;
  /** Allowed kinds, for tables that show several kinds of rows. */
  kinds?: readonly K[];
}

/** Table state carried by the query string. */
export interface TableQuery<K extends string = string> {
  filters: ActiveFilters;
  page: number;
  sort: TableSort;
  kind?: K;
}

/** Table state written into the URL by `buildTableQuery`. */
export interface TableQueryState {
  /** Active filters. */
  filters: ActiveFilters;
  /** Current search, whose params outside the table contract (`item`, `overlay-*`) are kept. */
  search: string;
  /** Sort. */
  sort: TableSort;
  /** Kind, not written when undefined. */
  kind?: string;
  /** Page number, not written when undefined (tables without pagination). */
  page?: number;
}

/**
 * Returns the search of the table state: the current search with the table params
 * replaced by the state's ones. Returns a `?`-prefixed search, or an empty string when
 * no params are left.
 */
export const buildTableQuery = (state: TableQueryState): string => {
  const params = new URLSearchParams(state.search);
  TABLE_KEYS.forEach((key) => params.delete(key));

  if (state.kind !== undefined) {
    params.set(FINANCES_KIND_PARAM, state.kind);
  }
  if (state.page !== undefined) {
    params.set(PAGE_PARAM, state.page.toString());
  }
  params.set(SORT_BY_PARAM, state.sort.by);
  params.set(SORT_DIRECTION_PARAM, state.sort.direction);
  (Object.keys(state.filters) as FilterCategory[]).forEach((category) => {
    (state.filters[category] ?? []).forEach((value) => params.append(category, value));
  });

  const query = params.toString();
  return query === '' ? '' : `?${query}`;
};

/**
 * Parses a table query. A kind outside the allowed kinds gives the default kind, and a
 * sort outside the allowed sorts (those of the parsed kind, when sorts depend on it)
 * gives the default sort. The page must be a positive integer, 1 by default. Repeated
 * filter keys accumulate, and empty values and keys outside the filter categories are
 * ignored.
 */
export const parseTableQuery = <K extends string = string>(search: string, cfg: TableQueryConfig<K>): TableQuery<K> => {
  const params = new URLSearchParams(search);

  const filters: ActiveFilters = {};
  params.forEach((value, key) => {
    const category = key as FilterCategory;
    if (cfg.filterCategories.includes(category) && value !== '') {
      filters[category] = uniq([...(filters[category] ?? []), value]);
    }
  });

  const kind =
    cfg.kinds !== undefined && cfg.defaultKind !== undefined
      ? parseEnum(getSingleParam(params, FINANCES_KIND_PARAM), cfg.kinds, cfg.defaultKind)
      : undefined;

  const rawPage = getSingleParam(params, PAGE_PARAM);
  const page =
    rawPage !== undefined && PAGE_REGEX.test(rawPage) && Number.isSafeInteger(Number(rawPage)) ? Number(rawPage) : 1;

  const by = getSingleParam(params, SORT_BY_PARAM);
  const direction = getSingleParam(params, SORT_DIRECTION_PARAM);
  const sort =
    getSortOptions(cfg, kind).find((option) => option.by === by && option.direction === direction) ?? cfg.defaultSort;

  const query: TableQuery<K> = { filters, page, sort: pickSort(sort) };
  if (kind !== undefined) {
    query.kind = kind;
  }
  return query;
};

/** Returns the value of a query param when it appears exactly once, or `undefined`. */
const getSingleParam = (params: URLSearchParams, key: string): string | undefined => {
  const values = params.getAll(key);
  return values.length === 1 ? values[0] : undefined;
};

/** Returns the allowed sorts of the kind given, or the only list of sorts when they don't depend on the kind. */
const getSortOptions = <K extends string>(cfg: TableQueryConfig<K>, kind: K | undefined): readonly TableSort[] => {
  if (isSortList(cfg.sortOptions)) return cfg.sortOptions;
  return kind !== undefined ? (cfg.sortOptions[kind] ?? []) : [];
};

/** Checks whether the sort options are a single list rather than a list per kind. */
const isSortList = <K extends string>(
  sortOptions: TableQueryConfig<K>['sortOptions']
): sortOptions is readonly TableSort[] => Array.isArray(sortOptions);

/** Returns the field and direction of a sort, without any other property (such as an option label). */
const pickSort = (sort: TableSort): TableSort => ({ by: sort.by, direction: sort.direction });

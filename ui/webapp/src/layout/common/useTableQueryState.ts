import { useLocation, useNavigate } from '@solidjs/router';
import isEqual from 'lodash/isEqual';
import { createMemo } from 'solid-js';

import { ActiveFilters, FilterCategory } from '../../types';
import { buildTableQuery, parseTableQuery, TableQuery, TableQueryConfig, TableSort } from '../../utils/tableQuery';
import { buildPath } from '../../utils/urlParams';

/** Options of `useTableQueryState`. */
export interface TableQueryStateConfig<K extends string = string> extends TableQueryConfig<K> {
  /** Whether the table is paginated, so the page is written into the URL. */
  paginated?: boolean;
}

/**
 * Table state (filters, sort, page and kind) derived from the URL, with setters that
 * write it back, replacing the current history entry. Changing the filters or the sort
 * goes back to page 1, and changing the kind also resets the filters and the sort. The
 * page is returned as written in the URL: the view clamps it to its page count.
 */
const useTableQueryState = <K extends string = string>(config: TableQueryStateConfig<K>) => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = createMemo(() => parseTableQuery(location.search, config));
  const filters = createMemo(() => query().filters, undefined, { equals: isEqual });
  const sort = createMemo(() => query().sort, undefined, { equals: isEqual });
  const page = createMemo(() => query().page);
  const kind = createMemo(() => query().kind);

  const write = (updates: Partial<TableQuery<K>>) => {
    const state = { ...query(), ...updates };
    const search = buildTableQuery({
      filters: state.filters,
      kind: state.kind,
      page: config.paginated ? state.page : undefined,
      search: location.search,
      sort: state.sort,
    });
    navigate(buildPath(location.pathname, search, location.hash), { replace: true });
  };

  const setFilters = (newFilters: ActiveFilters) => write({ filters: newFilters, page: 1 });

  // Sets the values of a filter category, removing the category when none are left
  const updateFilter = (category: FilterCategory, values: string[]) => {
    const newFilters: ActiveFilters = { ...filters() };
    if (values.length === 0) {
      delete newFilters[category];
    } else {
      newFilters[category] = values;
    }
    setFilters(newFilters);
  };

  const removeFilter = (category: FilterCategory, value: string) => {
    const remaining = (filters()[category] ?? []).filter((current) => current !== value);
    updateFilter(category, remaining);
  };

  const resetFilters = () => setFilters({});

  const setSort = (newSort: TableSort) => write({ page: 1, sort: newSort });

  const setPage = (newPage: number) => write({ page: newPage });

  const setKind = (newKind: K) => write({ filters: {}, kind: newKind, page: 1, sort: config.defaultSort });

  return { filters, kind, page, removeFilter, resetFilters, setFilters, setKind, setPage, setSort, sort, updateFilter };
};

export default useTableQueryState;

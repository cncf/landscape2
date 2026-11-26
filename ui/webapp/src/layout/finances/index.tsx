import { useLocation } from '@solidjs/router';
import {
  ExternalLink,
  Loading,
  NoData,
  prettifyNumber,
  REGEX_UNDERSCORE,
  SMALL_DEVICES_BREAKPOINTS,
  useBreakpointDetect,
} from 'common';
import isUndefined from 'lodash/isUndefined';
import orderBy from 'lodash/orderBy';
import { createEffect, createMemo, For, Match, on, Show, Switch } from 'solid-js';

import { ACQUISITIONS_PATH, DEFAULT_FINANCES_KIND } from '../../data';
import { AcquisitionData, ActiveFilters, FilterCategory, FinancesData, FinancesKind, FundingData } from '../../types';
import itemsDataGetter from '../../utils/itemsDataGetter';
import prepareFinances from '../../utils/prepareFinances';
import scrollToTop from '../../utils/scrollToTop';
import { TableSort, TableSortOption } from '../../utils/tableQuery';
import ActiveFiltersList from '../common/ActiveFiltersList';
import tableStyles from '../common/DataTable.module.css';
import FiltersInLine from '../common/FiltersInLine';
import MobileFilters from '../common/MobileFilters';
import OrderSelect from '../common/OrderSelect';
import Pagination from '../common/Pagination';
import RequireFullData from '../common/RequireFullData';
import useTableQueryState from '../common/useTableQueryState';
import Footer from '../navigation/Footer';
import { useFinancesDataContent, useSetFinancesDataContent } from '../stores/financesData';
import { useFullDataReady } from '../stores/fullData';
import styles from './Finances.module.css';

/** Status of the Finances page: waiting for the data, without finances data, or showing it. */
type FinancesStatus = 'loading' | 'unavailable' | 'ready';

/** Row of a finances table. */
type FinancesRow = FundingData | AcquisitionData;

const DEFAULT_LIMIT_PER_PAGE = 50;

const DEFAULT_SORT: TableSort = { by: 'announced_on', direction: 'desc' };

/** Filter categories of the finances tables. */
const FILTER_CATEGORIES: readonly FilterCategory[] = [
  FilterCategory.InvestmentType,
  FilterCategory.Membership,
  FilterCategory.Organization,
];

/** Finances kinds, as label and value pairs, in the order of their buttons. */
const KIND_OPTIONS = Object.entries(FinancesKind);

const SORT_OPTIONS: Record<FinancesKind, TableSortOption[]> = {
  [FinancesKind.Funding]: [
    { label: 'Date (desc)', by: 'announced_on', direction: 'desc' },
    { label: 'Date (asc)', by: 'announced_on', direction: 'asc' },
    { label: 'Amount (desc)', by: 'amount', direction: 'desc' },
    { label: 'Amount (asc)', by: 'amount', direction: 'asc' },
  ],
  [FinancesKind.Acquisitions]: [
    { label: 'Date (desc)', by: 'announced_on', direction: 'desc' },
    { label: 'Date (asc)', by: 'announced_on', direction: 'asc' },
    { label: 'Price (desc)', by: 'price', direction: 'desc' },
    { label: 'Price (asc)', by: 'price', direction: 'asc' },
  ],
};

const Finances = () => {
  const location = useLocation();
  // The /acquisitions route opens the acquisitions by default
  const defaultKind = location.pathname === ACQUISITIONS_PATH ? FinancesKind.Acquisitions : DEFAULT_FINANCES_KIND;
  const fullDataReady = useFullDataReady();
  const financesData = useFinancesDataContent();
  const setFinancesData = useSetFinancesDataContent();
  const tableQuery = useTableQueryState({
    defaultKind,
    defaultSort: DEFAULT_SORT,
    filterCategories: FILTER_CATEGORIES,
    kinds: Object.values(FinancesKind),
    paginated: true,
    sortOptions: SORT_OPTIONS,
  });
  const { point } = useBreakpointDetect();
  const onSmallDevice = () => SMALL_DEVICES_BREAKPOINTS.includes(point());
  const kind = () => tableQuery.kind() ?? defaultKind;

  const status = createMemo<FinancesStatus>(() => {
    if (!window.baseDS.finances_available) return 'unavailable';
    const data = financesData();
    if (isUndefined(data)) return 'loading';
    return data === null || !hasOrganizations(data) ? 'unavailable' : 'ready';
  });

  // Only read once the status is ready
  const data = () => financesData()!;

  const visibleRows = createMemo(() =>
    status() === 'ready' ? sortRows(filterRows(data()[kind()], tableQuery.filters()), tableQuery.sort()) : []
  );
  const totalPages = () => Math.max(1, Math.ceil(visibleRows().length / DEFAULT_LIMIT_PER_PAGE));
  const page = () => Math.min(Math.max(tableQuery.page(), 1), totalPages());
  const offset = () => (page() - 1) * DEFAULT_LIMIT_PER_PAGE;
  const pageRows = createMemo(() => visibleRows().slice(offset(), offset() + DEFAULT_LIMIT_PER_PAGE));

  const onPageNumberChange = (pageNumber: number) => {
    scrollToTop(onSmallDevice());
    tableQuery.setPage(pageNumber);
  };

  // The finances data is prepared once and cached in the store for later visits
  createEffect(
    on(fullDataReady, (ready) => {
      if (ready && window.baseDS.finances_available && isUndefined(financesData())) {
        const crunchbaseData = itemsDataGetter.getCrunchbaseData();
        setFinancesData(isUndefined(crunchbaseData) ? null : prepareFinances(crunchbaseData, itemsDataGetter.getAll()));
      }
    })
  );

  const orderSelect = () => (
    <OrderSelect options={SORT_OPTIONS[kind()]} value={tableQuery.sort()} onChange={tableQuery.setSort} />
  );

  return (
    <>
      <RequireFullData>
        <main class="flex-grow-1 container-fluid px-3 px-lg-4 mainPadding position-relative">
          <Switch>
            <Match when={status() === 'loading'}>
              <Loading spinnerClass="position-fixed top-50 start-50" />
            </Match>

            <Match when={status() === 'unavailable'}>
              <div class="py-4">
                <NoData>
                  <div class="fs-4">There is no finances data available for this landscape.</div>
                </NoData>
              </div>
            </Match>

            <Match when={status() === 'ready'}>
              <div class="mt-2 mt-md-3 py-1">
                <div class="d-flex flex-row justify-content-between justify-content-lg-start align-items-center mb-3 mb-lg-0">
                  <div class="d-block d-lg-none">
                    <MobileFilters
                      filters={data().filters[kind()]}
                      initialActiveFilters={tableQuery.filters}
                      updateActiveFilters={tableQuery.updateFilter}
                      resetFilters={tableQuery.resetFilters}
                    >
                      {orderSelect()}
                    </MobileFilters>
                  </div>

                  <div class="me-0 me-lg-4">
                    <div class="d-none d-lg-flex flex-row align-items-baseline my-2">
                      <div class={`text-uppercase text-primary fw-bold ${tableStyles.title}`}>Category</div>
                    </div>

                    <div
                      class={`btn-group btn-group-sm ${styles.btnGroup}`}
                      role="group"
                      aria-label="Finances category options"
                    >
                      <For each={KIND_OPTIONS}>
                        {([label, value]) => (
                          <button
                            title={`Finances kind: ${label}`}
                            type="button"
                            class="btn btn-outline-primary rounded-0 fw-semibold"
                            classList={{
                              'active text-white': value === kind(),
                            }}
                            onClick={() => {
                              if (value !== kind()) {
                                tableQuery.setKind(value);
                              }
                            }}
                            aria-label={`Open ${label}`}
                            aria-pressed={value === kind()}
                          >
                            {label}
                          </button>
                        )}
                      </For>
                    </div>
                  </div>

                  <div class="d-none d-lg-block ms-0 ms-lg-4">
                    <FiltersInLine
                      filters={data().filters[kind()]}
                      initialActiveFilters={tableQuery.filters}
                      updateActiveFilters={tableQuery.updateFilter}
                    />
                  </div>

                  <div class="d-none d-lg-block ms-4">
                    <div class="d-flex flex-row align-items-baseline my-2">
                      <div class={`text-uppercase text-primary fw-bold ${tableStyles.title}`}>Order</div>
                    </div>

                    {orderSelect()}
                  </div>
                </div>

                <div class="d-none d-lg-block">
                  <div class="mt-4">
                    <ActiveFiltersList
                      activeFilters={tableQuery.filters()}
                      resetFilters={tableQuery.resetFilters}
                      removeFilter={tableQuery.removeFilter}
                    />
                  </div>
                </div>
              </div>

              <Show
                when={visibleRows().length > 0}
                fallback={
                  <div class="py-4">
                    <NoData>
                      <>
                        <div class="fs-4">We couldn't find any data that match the criteria selected.</div>
                        <p class="h6 my-4 lh-base">
                          You can update them and try again or{' '}
                          <button
                            type="button"
                            class="btn btn-link lh-1 p-0 text-reset align-baseline"
                            onClick={() => tableQuery.resetFilters()}
                            aria-label="Reset filters"
                          >
                            reset all
                          </button>{' '}
                          the filters.
                        </p>
                      </>
                    </NoData>
                  </div>
                }
              >
                <div class="text-dark mb-3">
                  <small>
                    <span class="fw-semibold">{offset() + 1}</span> -{' '}
                    <span class="fw-semibold">{offset() + pageRows().length}</span> of{' '}
                    <span class="fw-semibold">{visibleRows().length}</span> results
                  </small>
                </div>
                <Switch>
                  <Match when={kind() === FinancesKind.Funding}>
                    <table
                      class={`table table-sm table-striped table-bordered mb-0 ${tableStyles.tableLayout} ${styles.financesTable}`}
                    >
                      <thead class={`text-uppercase text-muted ${tableStyles.thead}`}>
                        <tr>
                          <th class="text-center" scope="col">
                            Organization
                          </th>
                          <th class="d-none d-md-table-cell text-center" scope="col">
                            Investment Type
                          </th>
                          <th class="d-none d-md-table-cell text-center" scope="col">
                            Membership
                          </th>
                          <th class={`text-center ${styles.col}`} scope="col">
                            <span class="d-block d-lg-none">Amount</span>
                            <span class="d-none d-lg-block">Amount Raised (USD)</span>
                          </th>
                          <th class={`text-center ${styles.col}`} scope="col">
                            <span class="d-block d-md-none">Date</span>
                            <span class="d-none d-md-block">Announced on</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={pageRows() as FundingData[]}>
                          {(round: FundingData) => {
                            return (
                              <tr class={tableStyles.tableContent}>
                                <td class="px-1 px-md-2 px-lg-3 text-truncate text-muted">
                                  <Show when={!isUndefined(round.crunchbase_url)} fallback={round.organization_name}>
                                    <ExternalLink
                                      title={`${round.organization_name} crunchbase link`}
                                      href={round.crunchbase_url!}
                                      class="text-decoration-underline"
                                    >
                                      {round.organization_name}
                                    </ExternalLink>
                                  </Show>
                                </td>
                                <td class="d-none d-md-table-cell px-1 px-md-2 px-lg-3 text-truncate text-muted text-capitalize text-center">
                                  {!isUndefined(round.kind) ? round.kind?.replace(REGEX_UNDERSCORE, ' ') : '-'}
                                </td>
                                <td class="d-none d-md-table-cell px-1 px-md-2 px-lg-3 text-center text-truncate text-muted">
                                  <Show when={!isUndefined(round.membership)} fallback="-">
                                    {round.membership}
                                  </Show>
                                </td>
                                <td class="px-1 px-md-2 px-lg-3 text-center text-muted">
                                  <Show when={!isUndefined(round.amount)} fallback="-">
                                    {`$${prettifyNumber(round.amount!)}`}
                                  </Show>
                                </td>
                                <td class="px-1 px-md-2 px-lg-3 text-center text-nowrap text-muted">
                                  <span class="d-block d-md-none">{round.announced_on?.slice(0, 7)}</span>
                                  <span class="d-none d-md-block">{round.announced_on}</span>
                                </td>
                              </tr>
                            );
                          }}
                        </For>
                      </tbody>
                    </table>
                  </Match>
                  <Match when={kind() === FinancesKind.Acquisitions}>
                    <table
                      class={`table table-sm table-striped table-bordered mb-0 ${tableStyles.tableLayout} ${styles.financesTable}`}
                    >
                      <thead class={`text-uppercase text-muted ${tableStyles.thead}`}>
                        <tr>
                          <th class="text-center" scope="col">
                            Organization
                          </th>
                          <th class="text-center" scope="col">
                            Acquiree
                          </th>
                          <th class="d-none d-md-table-cell text-center" scope="col">
                            Membership
                          </th>
                          <th class={`text-center ${styles.acqCol}`} scope="col">
                            <span class="d-block d-md-none">Price</span>
                            <span class="d-none d-md-block">Price (USD)</span>
                          </th>
                          <th class={`text-center ${styles.acqCol}`} scope="col">
                            <span class="d-block d-md-none">Date</span>
                            <span class="d-none d-md-block">Announced on</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={pageRows() as AcquisitionData[]}>
                          {(acquisition: AcquisitionData) => {
                            return (
                              <tr class={tableStyles.tableContent}>
                                <td class="px-1 px-md-2 px-lg-3 text-truncate text-muted">
                                  <Show
                                    when={!isUndefined(acquisition.crunchbase_url)}
                                    fallback={acquisition.organization_name}
                                  >
                                    <ExternalLink
                                      title={`${acquisition.organization_name} crunchbase link`}
                                      href={acquisition.crunchbase_url!}
                                      class="text-decoration-underline"
                                    >
                                      {acquisition.organization_name}
                                    </ExternalLink>
                                  </Show>
                                </td>
                                <td class="px-1 px-md-2 px-lg-3 text-truncate text-muted">
                                  <Show
                                    when={!isUndefined(acquisition.acquiree_cb_permalink)}
                                    fallback={acquisition.acquiree_name}
                                  >
                                    <ExternalLink
                                      title={`${acquisition.acquiree_name} crunchbase link`}
                                      href={`https://www.crunchbase.com/organization/${acquisition.acquiree_cb_permalink}`}
                                      class="text-decoration-underline"
                                    >
                                      {acquisition.acquiree_name}
                                    </ExternalLink>
                                  </Show>
                                </td>
                                <td class="d-none d-md-table-cell px-1 px-md-2 px-lg-3 text-center text-truncate text-muted">
                                  <Show when={!isUndefined(acquisition.membership)} fallback="-">
                                    {acquisition.membership}
                                  </Show>
                                </td>
                                <td class="px-1 px-md-2 px-lg-3 text-center text-muted">
                                  <Show when={!isUndefined(acquisition.price)} fallback="-">
                                    ${`${prettifyNumber(acquisition.price!)}`}
                                  </Show>
                                </td>
                                <td class="px-1 px-md-2 px-lg-3 text-center text-nowrap text-muted">
                                  <span class="d-block d-md-none">{acquisition.announced_on?.slice(0, 7)}</span>
                                  <span class="d-none d-md-block">{acquisition.announced_on}</span>
                                </td>
                              </tr>
                            );
                          }}
                        </For>
                      </tbody>
                    </table>
                  </Match>
                </Switch>

                <div class="mt-3 mx-auto">
                  <Pagination
                    initialLimit={DEFAULT_LIMIT_PER_PAGE}
                    initialTotal={visibleRows().length}
                    active={page()}
                    class="mt-4 mt-md-5 mb-0 mb-md-4"
                    onChange={onPageNumberChange}
                  />
                </div>
              </Show>
            </Match>
          </Switch>
        </main>
      </RequireFullData>
      <Footer />
    </>
  );
};

export default Finances;

/** Returns the rows that match every active filter. */
const filterRows = (rows: FinancesRow[], activeFilters: ActiveFilters): FinancesRow[] =>
  rows.filter((row: FinancesRow) => {
    const organizations = activeFilters[FilterCategory.Organization];
    if (organizations && (isUndefined(row.organization_name) || !organizations.includes(row.organization_name))) {
      return false;
    }
    const memberships = activeFilters[FilterCategory.Membership];
    if (memberships && (isUndefined(row.membership) || !memberships.includes(row.membership))) {
      return false;
    }
    const investmentTypes = activeFilters[FilterCategory.InvestmentType];
    const investmentType = (row as FundingData).kind;
    if (investmentTypes && (isUndefined(investmentType) || !investmentTypes.includes(investmentType))) {
      return false;
    }
    return true;
  });

/** Checks whether the finances data holds any funding round or acquisition. */
const hasOrganizations = (data: FinancesData): boolean =>
  data[FinancesKind.Funding].length > 0 || data[FinancesKind.Acquisitions].length > 0;

/** Sorts the rows by the sort field. Rows without it sort as `null` in ascending order and as 0 in descending order. */
const sortRows = (rows: FinancesRow[], sort: TableSort): FinancesRow[] =>
  orderBy(
    rows,
    [(row: FinancesRow) => (sort.by in row ? (row as never)[sort.by] : sort.direction === 'asc' ? null : 0)],
    [sort.direction]
  );

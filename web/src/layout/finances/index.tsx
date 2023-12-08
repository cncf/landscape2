import isEqual from 'lodash/isEqual';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import orderBy from 'lodash/orderBy';
import moment from 'moment';
import { batch, createEffect, createSignal, For, Match, on, onMount, Show, Switch } from 'solid-js';

import { DEFAULT_FINANCES_KIND, REGEX_UNDERSCORE, SMALL_DEVICES_BREAKPOINTS } from '../../data';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import { AcquisitionData, ActiveFilters, FilterCategory, FinancesData, FinancesKind, FundingData } from '../../types';
import itemsDataGetter from '../../utils/itemsDataGetter';
import prepareFinances from '../../utils/prepareFinances';
import prettifyNumber from '../../utils/prettifyNumber';
import scrollToTop from '../../utils/scrollToTop';
import ActiveFiltersList from '../common/ActiveFiltersList';
import ExternalLink from '../common/ExternalLink';
import FiltersInLine from '../common/FiltersInLine';
import Loading from '../common/Loading';
import NoData from '../common/NoData';
import Pagination from '../common/Pagination';
import Footer from '../navigation/Footer';
import { useFinancesDataContent, useSetFinancesDataContent } from '../stores/financesData';
import { useFullDataReady } from '../stores/fullData';
import styles from './Finances.module.css';
import MobileFilters from './MobileFilters';

type SortOptionsGroup = {
  [key in FinancesKind]: SortOption[];
};

interface SortOption {
  by: string;
  direction: 'asc' | 'desc';
  label?: string;
}
const DEFAULT_SORT_BY = 'announced_on';
const DEFAULT_SORT_DIRECTION = 'desc';
const DEFAULT_LIMIT_PER_PAGE = 50;

const SORT_OPTIONS: SortOptionsGroup = {
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

const filterFinances = (
  data: (FundingData | AcquisitionData)[],
  activeFilters: ActiveFilters
): (FundingData | AcquisitionData)[] => {
  let filteredData: (FundingData | AcquisitionData)[] = [];

  filteredData = data.filter((item: FundingData | AcquisitionData) => {
    if (activeFilters[FilterCategory.Organization]) {
      if (
        isUndefined((item as FundingData).organization_name) ||
        !activeFilters[FilterCategory.Organization].includes((item as FundingData).organization_name)
      ) {
        return false;
      }
    }
    if (activeFilters[FilterCategory.Membership]) {
      if (
        isUndefined((item as FundingData).membership) ||
        !activeFilters[FilterCategory.Membership].includes((item as FundingData).membership!)
      ) {
        return false;
      }
    }
    if (activeFilters[FilterCategory.InvestmentType]) {
      if (
        isUndefined((item as FundingData).kind) ||
        !activeFilters[FilterCategory.InvestmentType].includes((item as FundingData).kind!)
      ) {
        return false;
      }
    }

    return true;
  });

  return filteredData;
};

const Finances = () => {
  const fullDataReady = useFullDataReady();
  const financesData = useFinancesDataContent();
  const setFinancesData = useSetFinancesDataContent();
  const [data, setData] = createSignal<FinancesData | null>();
  const [visibleData, setVisibleData] = createSignal<FundingData[] | AcquisitionData[]>();
  const [selectedKind, setSelectedKind] = createSignal<FinancesKind>(DEFAULT_FINANCES_KIND);
  const [selectedSortOption, setSelectedSortOption] = createSignal<SortOption>({
    by: DEFAULT_SORT_BY,
    direction: DEFAULT_SORT_DIRECTION,
  });
  const [pageNumber, setPageNumber] = createSignal<number>(1);
  const [offset, setOffset] = createSignal<number>(0);
  const [activeFilters, setActiveFilters] = createSignal<ActiveFilters>({});
  const { point } = useBreakpointDetect();
  const onSmallDevice = !isUndefined(point()) && SMALL_DEVICES_BREAKPOINTS.includes(point()!);

  const onPageNumberChange = (pNumber: number) => {
    scrollToTop(onSmallDevice);
    setOffset(DEFAULT_LIMIT_PER_PAGE * (pNumber - 1));
    setPageNumber(pNumber);
  };

  const formatVisibleData = () => {
    if (!isUndefined(data())) {
      const tmpData = filterFinances(data()![selectedKind()], activeFilters());
      const sortedData = orderBy(
        tmpData,
        [
          // eslint-disable-next-line solid/reactivity
          (i: AcquisitionData | FundingData) => {
            if (selectedSortOption().by in i) {
              const value = (i as never)[selectedSortOption().by];
              return value;
            }
            return selectedSortOption().direction === 'asc' ? null : 0;
          },
        ],
        [selectedSortOption().direction]
      );

      setVisibleData(sortedData as AcquisitionData[] | FundingData[]);
    }
  };

  const getItemsPerPage = (items: AcquisitionData[] | FundingData[]): AcquisitionData[] | FundingData[] => {
    return items.slice(offset(), offset() + DEFAULT_LIMIT_PER_PAGE);
  };

  const applyFilters = (newFilters: ActiveFilters) => {
    setActiveFilters(newFilters);
    formatVisibleData();
  };

  const removeFilter = (name: FilterCategory, value: string) => {
    let tmpActiveFilters: string[] = ({ ...activeFilters() }[name] || []).filter((f: string) => f !== value);
    if (name === FilterCategory.Maturity) {
      if (isEqual(tmpActiveFilters, [window.baseDS.foundation.toLowerCase()])) {
        tmpActiveFilters = [];
      }
    }
    updateActiveFilters(name, tmpActiveFilters);
  };

  const updateActiveFilters = (value: FilterCategory, options: string[]) => {
    const f: ActiveFilters = { ...activeFilters() };
    if (options.length === 0) {
      delete f[value];
    } else {
      f[value] = options;
    }
    applyFilters(f);
  };

  const resetFilters = () => {
    applyFilters({});
  };

  const orderSelect = () => (
    <select
      class={`form-select form-select-sm rounded-0 ${styles.select}`}
      value={`${selectedSortOption().by}-${selectedSortOption().direction}`}
      aria-label="Order"
      onChange={(e) => {
        const options = e.target.value.split('-');
        batch(() => {
          setPageNumber(1);
          setOffset(0);
          setSelectedSortOption({ by: options[0], direction: options[1] as 'asc' | 'desc' });
        });
      }}
    >
      <For each={SORT_OPTIONS[selectedKind()]}>
        {(opt: SortOption) => {
          return <option value={`${opt.by}-${opt.direction}`}>{opt.label}</option>;
        }}
      </For>
    </select>
  );
  onMount(() => {
    if (!isUndefined(financesData())) {
      setTimeout(() => {
        setData(financesData());
      }, 5);
    }
  });

  async function prepareFinancesData() {
    try {
      const items = await itemsDataGetter.getAll();
      const crunchbaseData = await itemsDataGetter.getCrunchbaseData();
      if (!isUndefined(crunchbaseData)) {
        const finances = prepareFinances(crunchbaseData, items);
        setData(finances);
        setFinancesData(finances);
        formatVisibleData();
      }
    } catch {
      setData(null);
    }
  }

  createEffect(
    on(fullDataReady, () => {
      if (fullDataReady()) {
        prepareFinancesData();
      }
    })
  );

  createEffect(() => formatVisibleData());

  return (
    <Show when={!isUndefined(data())}>
      <main class="flex-grow-1 container-fluid px-3 px-lg-4 mainPadding position-relative">
        <div class="mt-2 mt-md-3 py-1">
          <div class="d-flex flex-row justify-content-between justify-content-lg-start align-items-center mb-3 mb-lg-0">
            <div class="d-block d-lg-none">
              <MobileFilters
                filters={data()!.filters[selectedKind()]}
                initialActiveFilters={activeFilters}
                updateActiveFilters={updateActiveFilters}
                resetFilters={resetFilters}
              >
                {orderSelect()}
              </MobileFilters>
            </div>

            <div class="me-0 me-lg-4">
              <div class="d-none d-lg-flex flex-row align-items-baseline my-2">
                <div class={`text-uppercase text-primary fw-bold ${styles.title}`}>Category</div>
              </div>

              <div
                class={`btn-group btn-group-sm ${styles.btnGroup}`}
                role="group"
                aria-label="Finances category options"
              >
                <For each={Object.keys(FinancesKind)}>
                  {(kind) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const value = (FinancesKind as any)[kind];

                    return (
                      <button
                        title={`Finances kind: ${kind}`}
                        type="button"
                        class="btn btn-outline-primary rounded-0 fw-semibold"
                        classList={{
                          'active text-white': value === selectedKind(),
                        }}
                        onClick={() => {
                          if (!(value === selectedKind())) {
                            batch(() => {
                              setPageNumber(1);
                              setOffset(0);
                              setActiveFilters({});
                              setSelectedKind(value);
                              setSelectedSortOption({ by: DEFAULT_SORT_BY, direction: DEFAULT_SORT_DIRECTION });
                            });
                          }
                        }}
                      >
                        {kind}
                      </button>
                    );
                  }}
                </For>
              </div>
            </div>

            <div class="d-none d-lg-block ms-0 ms-lg-4">
              <FiltersInLine
                filters={data()!.filters[selectedKind()]}
                initialActiveFilters={activeFilters}
                updateActiveFilters={updateActiveFilters}
                resetFilters={resetFilters}
              />
            </div>

            <div class="d-none d-lg-block ms-4">
              <div class="d-flex flex-row align-items-baseline my-2">
                <div class={`text-uppercase text-primary fw-bold ${styles.title}`}>Order</div>
              </div>

              {orderSelect()}
            </div>
          </div>

          <div class="d-none d-lg-block">
            <div class="mt-4">
              <ActiveFiltersList
                activeFilters={activeFilters()}
                resetFilters={resetFilters}
                removeFilter={removeFilter}
              />
            </div>
          </div>
        </div>

        <Show when={!isUndefined(visibleData())} fallback={<Loading spinnerClass="position-fixed top-50 start-50" />}>
          <Show
            when={visibleData()!.length > 0}
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
                        onClick={resetFilters}
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
                <span class="fw-semibold">
                  {offset() + DEFAULT_LIMIT_PER_PAGE > visibleData()!.length
                    ? visibleData()!.length
                    : offset() + DEFAULT_LIMIT_PER_PAGE}
                </span>{' '}
                of <span class="fw-semibold">{visibleData()!.length}</span> results
              </small>
            </div>
            <Switch>
              <Match when={selectedKind() === FinancesKind.Funding}>
                <table class={`table table-sm table-striped table-bordered mb-0 ${styles.tableLayout}`}>
                  <thead class={`text-uppercase text-muted ${styles.thead}`}>
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
                    <For each={getItemsPerPage(visibleData()!) as FundingData[]}>
                      {(round: FundingData) => {
                        return (
                          <tr class={styles.tableContent}>
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
                              <span class="d-block d-md-none">
                                {moment(round.announced_on, 'YYYY-MM-DD').format('YYYY-MM')}
                              </span>
                              <span class="d-none d-md-block">{round.announced_on}</span>
                            </td>
                          </tr>
                        );
                      }}
                    </For>
                  </tbody>
                </table>
              </Match>
              <Match when={selectedKind() === FinancesKind.Acquisitions}>
                <table class={`table table-sm table-striped table-bordered mb-0 ${styles.tableLayout}`}>
                  <thead class={`text-uppercase text-muted ${styles.thead}`}>
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
                    <For each={getItemsPerPage(visibleData()!) as AcquisitionData[]}>
                      {(acquisition: AcquisitionData) => {
                        return (
                          <tr class={styles.tableContent}>
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
                              <span class="d-block d-md-none">
                                {moment(acquisition.announced_on, 'YYYY-MM-DD').format('YYYY-MM')}
                              </span>
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
          </Show>
        </Show>

        <Show when={!isNull(visibleData()) && !isUndefined(visibleData()) && visibleData()!.length > 0}>
          <div class="mt-3 mx-auto">
            <Pagination
              initialLimit={DEFAULT_LIMIT_PER_PAGE}
              offset={offset()}
              initialTotal={visibleData()!.length}
              active={pageNumber()}
              class="mt-4 mt-md-5 mb-0 mb-md-4"
              onChange={onPageNumberChange}
            />
          </div>
        </Show>
      </main>
      <Footer logo={window.baseDS.images.footer_logo} />
    </Show>
  );
};

export default Finances;

import { useLocation, useNavigate } from '@solidjs/router';
import { capitalizeFirstLetter, Image, Loading, NoData } from 'common';
import { isEmpty, isNull, isUndefined, orderBy } from 'lodash';
import { batch, createEffect, createSignal, For, JSXElement, on, onMount, Show } from 'solid-js';

import { SORT_BY_PARAM, SORT_DIRECTION_PARAM } from '../../data';
import { ActiveFilters, FilterCategory, FilterSection, Item, SecurityAudit, SortDirection } from '../../types';
import itemsDataGetter from '../../utils/itemsDataGetter';
import ActiveFiltersList from '../common/ActiveFiltersList';
import FiltersInLine from '../common/FiltersInLine';
import Footer from '../navigation/Footer';
import { useUpdateActiveItemId } from '../stores/activeItem';
import { useFullDataReady } from '../stores/fullData';
import MobileFilters from './MobileFilters';
import styles from './Projects.module.css';

interface SortOption {
  by: string;
  direction: 'asc' | 'desc';
  label?: string;
}
const DEFAULT_SORT_BY = 'name';
const DEFAULT_SORT_DIRECTION = 'asc';

const SORT_OPTIONS: SortOption[] = [
  { label: 'Accepted date (asc)', by: 'accepted_at', direction: 'asc' },
  { label: 'Accepted date (desc)', by: 'accepted_at', direction: 'desc' },
  { label: 'Archived date (asc)', by: 'archived_at', direction: 'asc' },
  { label: 'Archived date (desc)', by: 'archived_at', direction: 'desc' },
  { label: 'Graduated date (asc)', by: 'graduated_at', direction: 'asc' },
  { label: 'Graduated date (desc)', by: 'graduated_at', direction: 'desc' },
  { label: 'Incubating date (asc)', by: 'incubating_at', direction: 'asc' },
  { label: 'Incubating date (desc)', by: 'incubating_at', direction: 'desc' },
  { label: 'Last security audit date (asc)', by: 'last_audit', direction: 'asc' },
  { label: 'Last security audit date (desc)', by: 'last_audit', direction: 'desc' },
  { label: 'Name (asc)', by: 'name', direction: 'asc' },
  { label: 'Name (desc)', by: 'name', direction: 'desc' },
  { label: 'Sandbox date (asc)', by: 'sandbox_at', direction: 'asc' },
  { label: 'Sandbox date (desc)', by: 'sandbox_at', direction: 'desc' },
  { label: 'Security audits number (asc)', by: 'num_audits', direction: 'asc' },
  { label: 'Security audits number (desc)', by: 'num_audits', direction: 'desc' },
];

const Projects = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fullDataReady = useFullDataReady();
  const updateActiveItemId = useUpdateActiveItemId();
  const [filters, setFilters] = createSignal<FilterSection[]>([]);
  const [projects, setProjects] = createSignal<Item[] | undefined>();
  const [visibleProjects, setVisibleProjects] = createSignal<Item[] | undefined>();
  const [activeFilters, setActiveFilters] = createSignal<ActiveFilters>({});
  const [selectedSortOption, setSelectedSortOption] = createSignal<SortOption>({
    by: DEFAULT_SORT_BY,
    direction: DEFAULT_SORT_DIRECTION,
  });

  const prepareQuery = () => {
    if (location.search !== '') {
      const currentFilters: ActiveFilters = {};
      const params = new URLSearchParams(location.search);
      for (const [key, value] of params) {
        const f = key as FilterCategory;
        if (Object.values(FilterCategory).includes(f)) {
          if (currentFilters[f]) {
            currentFilters[f] = [...currentFilters[f]!, value];
          } else {
            currentFilters[f] = [value];
          }
        }
      }

      batch(() => {
        setActiveFilters(currentFilters);
        setSelectedSortOption({
          by: params.get(SORT_BY_PARAM) || DEFAULT_SORT_BY,
          direction: !isNull(params.get(SORT_DIRECTION_PARAM))
            ? (params.get(SORT_DIRECTION_PARAM) as 'asc') || 'desc'
            : DEFAULT_SORT_DIRECTION,
        });
      });
    }
  };

  const sortItems = (items: Item[]) => {
    const direction = selectedSortOption().direction;

    const getValue = (date: string | undefined): number => {
      if (date) {
        return new Date(date).valueOf();
      } else {
        return direction === SortDirection.Asc ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
      }
    };

    switch (selectedSortOption().by) {
      case 'name':
        return orderBy(items, [(i: Item) => i.name.toLowerCase()], [direction]);

      case 'sandbox_at':
        return orderBy(items, [(i: Item) => getValue(getSandboxDate(i))], [direction]);

      case 'num_audits':
        return orderBy(items, [(i: Item) => (i.audits ? i.audits.length : 0)], [direction]);

      case 'last_audit':
        return orderBy(items, [(i: Item) => getValue(getLastAuditDate(i.audits))], [direction]);

      default:
        // eslint-disable-next-line solid/reactivity
        return orderBy(items, [(i: Item) => getValue(i[selectedSortOption().by as keyof Item] as string)], [direction]);
    }
  };

  const fetchProjects = () => {
    const itemsData = itemsDataGetter.getItemsWithMaturity();
    const maturityOptions = itemsDataGetter.getMaturityOptions();

    if (itemsData) {
      const sortedItems = sortItems(itemsData);
      batch(() => {
        if (maturityOptions.length > 1) {
          setFilters([
            {
              value: FilterCategory.ProjectMaturity,
              title: 'Maturity',
              options: maturityOptions.map((opt: string) => ({
                value: opt,
                name: capitalizeFirstLetter(opt),
              })),
            },
          ]);
        }
      });
      setProjects(sortedItems);
      setVisibleProjects(sortedItems);
    } else {
      batch(() => {
        setProjects([]);
        setVisibleProjects([]);
      });
    }
  };

  const getLastAuditDate = (audits?: SecurityAudit[]): string | undefined => {
    if (audits) {
      if (audits.length > 0) {
        const sortedAudits = audits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return sortedAudits[0].date;
      } else {
        return audits[0].date;
      }
    }
    return undefined;
  };

  const getSandboxDate = (project: Item): string | undefined => {
    if (
      project.accepted_at &&
      project.accepted_at !== project.incubating_at &&
      project.accepted_at !== project.graduated_at
    ) {
      return project.accepted_at;
    }
    return undefined;
  };

  const applyFilters = (newFilters: ActiveFilters) => {
    setActiveFilters(newFilters);
    filterData();
    updateFiltersQueryString(newFilters);
  };

  const filterData = () => {
    let filteredProjects = projects();
    Object.keys(activeFilters()).forEach((filterId: string) => {
      const filter = activeFilters()[filterId as FilterCategory];
      if (filter) {
        filteredProjects = filteredProjects!.filter((project: Item) => {
          return filter.includes(project.maturity!);
        });
      }
    });

    if (filteredProjects) {
      setVisibleProjects(sortItems(filteredProjects!));
    }
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

  const removeFilter = (name: FilterCategory, value: string) => {
    const tmpActiveFilters: string[] = ({ ...activeFilters() }[name] || []).filter((f: string) => f !== value);
    updateActiveFilters(name, tmpActiveFilters);
  };

  const updateFiltersQueryString = (filters: ActiveFilters) => {
    const f = filters || activeFilters();
    const params = new URLSearchParams();
    if (!isUndefined(f) && !isEmpty(f)) {
      Object.keys(f).forEach((filterId: string) => {
        return f![filterId as FilterCategory]!.forEach((id: string) => {
          params.append(filterId as string, id.toString());
        });
      });
    }

    const query = params.toString();

    navigate(
      `${location.pathname}?${SORT_BY_PARAM}=${
        selectedSortOption().by
      }&${SORT_DIRECTION_PARAM}=${selectedSortOption().direction}${query !== '' ? `&${query}` : ''}`,
      {
        replace: true,
        scroll: true, // default
      }
    );
  };

  const updateSortQueryString = (sort: SortOption) => {
    const updatedSearchParams = new URLSearchParams(location.search);
    updatedSearchParams.set(SORT_BY_PARAM, sort.by);
    updatedSearchParams.set(SORT_DIRECTION_PARAM, sort.direction);

    navigate(`${location.pathname}?${updatedSearchParams.toString()}`, {
      replace: true,
      scroll: true, // default
    });
  };

  const resetFilters = () => {
    batch(() => {
      setActiveFilters({});
      setVisibleProjects(sortItems(projects()!));
    });
  };

  const orderSelect = () => (
    <select
      id="order"
      class={`form-select form-select-sm rounded-0 ${styles.select}`}
      value={`${selectedSortOption().by}-${selectedSortOption().direction}`}
      aria-label="Order"
      onChange={(e) => {
        const options = e.target.value.split('-');
        const selectedOption = { by: options[0], direction: options[1] as 'asc' | 'desc' };
        batch(() => {
          setSelectedSortOption(selectedOption);
          updateSortQueryString(selectedOption);
        });
      }}
    >
      <For each={SORT_OPTIONS}>
        {(opt: SortOption) => {
          return <option value={`${opt.by}-${opt.direction}`}>{opt.label}</option>;
        }}
      </For>
    </select>
  );

  createEffect(
    on(fullDataReady, () => {
      if (fullDataReady()) {
        fetchProjects();
      }
    })
  );

  createEffect(
    on(selectedSortOption, () => {
      if (visibleProjects()) {
        setVisibleProjects(sortItems(visibleProjects()!));
      }
    })
  );

  const formatDatesForDevices = (date: string): JSXElement => {
    const shortDate = date.split('-');
    shortDate.pop();
    return (
      <>
        <span class="d-none d-lg-block">{date}</span>
        <span class="d-block d-lg-none">{shortDate.join('-')}</span>
      </>
    );
  };

  onMount(() => {
    prepareQuery();
  });

  return (
    <Show when={!isUndefined(visibleProjects())} fallback={<Loading spinnerClass="position-fixed top-50 start-50" />}>
      <main class="flex-grow-1 container-fluid px-3 px-lg-4 mainPadding position-relative">
        <div class="mt-2 mt-md-3 py-1">
          <Show when={!isEmpty(filters())}>
            <div class="d-flex flex-row align-items-center mb-3 mb-lg-0">
              <div class="d-block d-lg-none">
                <MobileFilters
                  filters={filters()}
                  initialActiveFilters={activeFilters}
                  updateActiveFilters={updateActiveFilters}
                  resetFilters={resetFilters}
                >
                  {orderSelect()}
                </MobileFilters>
              </div>

              <div class="d-none d-lg-block">
                <FiltersInLine
                  filters={filters()}
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
          </Show>
        </div>
        <table class={`table table-sm table-striped table-bordered mb-0 ${styles.tableLayout}`}>
          <thead class={`text-uppercase text-muted ${styles.thead}`}>
            <tr>
              <th class={`text-center ${styles.projectNameCell}`} scope="col">
                Project
              </th>
              <th class="text-center" scope="col">
                Maturity
              </th>
              <th class="d-none d-md-table-cell text-center" scope="col">
                Accepted
              </th>
              <th class="text-center" scope="col">
                Sandbox
              </th>
              <th class="text-center" scope="col">
                Incubating
              </th>
              <th class="text-center" scope="col">
                Graduated
              </th>
              <th class="d-none d-md-table-cell text-center" scope="col">
                Archived
              </th>
              <th class="d-none d-sm-table-cell text-center" scope="col">
                Audits
              </th>
              <th class="d-none d-sm-table-cell text-center text-nowrap" scope="col">
                Last audit
              </th>
            </tr>
          </thead>
          <tbody>
            <Show
              when={visibleProjects()!.length > 0}
              fallback={
                <tr class={styles.tableContent}>
                  <td colSpan={9}>
                    <div class="py-4">
                      <NoData class="bg-white">
                        <div class="fs-4">No projects found.</div>
                      </NoData>
                    </div>
                  </td>
                </tr>
              }
            >
              <For each={visibleProjects()}>
                {(project: Item) => {
                  return (
                    <tr class={styles.tableContent}>
                      <td class="px-1 px-md-2 px-lg-3 text-truncate text-muted">
                        <button
                          class={`btn btn-sm p-0 btn-link fw-semibold w-100 text-start ${styles.projectBtn}`}
                          onClick={() => updateActiveItemId(project.id)}
                        >
                          <div class="d-flex flex-row align-items-center">
                            <div
                              class={`d-none d-xl-flex align-items-center justify-content-center me-3 ${styles.logoWrapper}`}
                            >
                              <Image name={project.name} logo={project.logo} class={styles.logo} enableLazyLoad />
                            </div>
                            <div class="text-truncate">{project.name}</div>
                          </div>
                        </button>
                      </td>
                      <td class="px-1 px-md-2 px-lg-3 text-center text-muted">
                        <span class={`text-uppercase ${styles.maturity}`}>{project.maturity}</span>
                      </td>
                      <td class="d-none d-md-table-cell px-1 px-md-2 px-lg-3 text-center text-muted text-nowrap">
                        {formatDatesForDevices(project.accepted_at!)}
                      </td>
                      <td class="px-1 px-md-2 px-lg-3 text-center text-muted text-nowrap">
                        <Show when={getSandboxDate(project)} fallback={'-'}>
                          <>{formatDatesForDevices(getSandboxDate(project)!)}</>
                        </Show>
                      </td>
                      <td class="px-1 px-md-2 px-lg-3 text-center text-muted text-nowrap">
                        <Show when={!isUndefined(project.incubating_at)} fallback={'-'}>
                          {formatDatesForDevices(project.incubating_at!)}
                        </Show>
                      </td>
                      <td class="px-1 px-md-2 px-lg-3 text-center text-muted text-nowrap">
                        <Show when={!isUndefined(project.graduated_at)} fallback={'-'}>
                          {formatDatesForDevices(project.graduated_at!)}
                        </Show>
                      </td>
                      <td class="d-none d-md-table-cell px-1 px-md-2 px-lg-3 text-center text-muted text-nowrap">
                        <Show when={!isUndefined(project.archived_at)} fallback={'-'}>
                          {formatDatesForDevices(project.archived_at!)}
                        </Show>
                      </td>
                      <td class="d-none d-sm-table-cell px-1 px-md-2 px-lg-3 text-center text-muted text-nowrap">
                        {project.audits ? project.audits.length : 0}
                      </td>
                      <td class="d-none d-sm-table-cell px-1 px-md-2 px-lg-3 text-center text-muted text-nowrap">
                        <Show when={project.audits} fallback={'-'}>
                          {formatDatesForDevices(getLastAuditDate(project.audits)!)}
                        </Show>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </Show>
          </tbody>
        </table>
      </main>
      <Footer />
    </Show>
  );
};

export default Projects;

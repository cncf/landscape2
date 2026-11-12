import { capitalizeFirstLetter, Image, Loading, NoData } from 'common';
import isUndefined from 'lodash/isUndefined';
import orderBy from 'lodash/orderBy';
import { createMemo, For, JSXElement, Show } from 'solid-js';

import { ActiveFilters, FilterCategory, FilterSection, Item } from '../../types';
import getLastAuditDate from '../../utils/getLastAuditDate';
import itemsDataGetter from '../../utils/itemsDataGetter';
import { TableSort, TableSortOption } from '../../utils/tableQuery';
import ActiveFiltersList from '../common/ActiveFiltersList';
import tableStyles from '../common/DataTable.module.css';
import FiltersInLine from '../common/FiltersInLine';
import MobileFilters from '../common/MobileFilters';
import OrderSelect from '../common/OrderSelect';
import RequireFullData from '../common/RequireFullData';
import useTableQueryState from '../common/useTableQueryState';
import Footer from '../navigation/Footer';
import { useUpdateActiveItemId } from '../stores/activeItem';
import { useFullDataReady } from '../stores/fullData';
import styles from './Projects.module.css';

/** Column of the projects table. */
interface Column {
  /** Classes of the header cell. */
  class: string;
  label: string;
  /** Label shown below the large breakpoint. */
  shortLabel?: string;
}

/** Columns of the projects table, in order: they drive the header and the empty-state row span. */
const COLUMNS: Column[] = [
  { class: `text-center ${styles.projectNameCell}`, label: 'Project' },
  { class: 'text-center', label: 'Maturity' },
  { class: 'd-none d-md-table-cell text-center', label: 'Accepted' },
  { class: 'text-center', label: 'Sandbox' },
  { class: 'text-center', label: 'Incubating' },
  { class: 'text-center', label: 'Graduated' },
  { class: 'd-none d-md-table-cell text-center', label: 'Archived' },
  { class: 'd-none d-sm-table-cell text-center text-nowrap', label: 'First commit', shortLabel: '1st commit' },
  { class: 'd-none d-md-table-cell text-center', label: 'Audits' },
  { class: 'd-none d-sm-table-cell text-center text-nowrap', label: 'Last audit' },
];

const DEFAULT_SORT: TableSort = { by: 'name', direction: 'asc' };

/** Filter categories of the projects table. */
const FILTER_CATEGORIES: readonly FilterCategory[] = [FilterCategory.ProjectMaturity];

const SORT_OPTIONS: TableSortOption[] = [
  { label: 'Accepted date (asc)', by: 'accepted_at', direction: 'asc' },
  { label: 'Accepted date (desc)', by: 'accepted_at', direction: 'desc' },
  { label: 'Archived date (asc)', by: 'archived_at', direction: 'asc' },
  { label: 'Archived date (desc)', by: 'archived_at', direction: 'desc' },
  { label: 'First commit date (asc)', by: 'first_commit', direction: 'asc' },
  { label: 'First commit date (desc)', by: 'first_commit', direction: 'desc' },
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
  const fullDataReady = useFullDataReady();
  const updateActiveItemId = useUpdateActiveItemId();
  const tableQuery = useTableQueryState({
    defaultSort: DEFAULT_SORT,
    filterCategories: FILTER_CATEGORIES,
    sortOptions: SORT_OPTIONS,
  });
  // The maturity filter is only offered when there is more than one maturity level
  const maturityOptions = itemsDataGetter.getMaturityOptions();
  const filterSections: FilterSection[] =
    maturityOptions.length > 1
      ? [
          {
            value: FilterCategory.ProjectMaturity,
            title: 'Maturity',
            options: maturityOptions.map((opt) => ({ value: opt.name, name: capitalizeFirstLetter(opt.name) })),
          },
        ]
      : [];

  const projects = createMemo(() => (fullDataReady() ? (itemsDataGetter.getItemsWithMaturity() ?? []) : undefined));
  const visibleProjects = createMemo(() => {
    const items = projects();
    return items && sortItems(filterByMaturity(items, tableQuery.filters()), tableQuery.sort());
  });

  const orderSelect = () => (
    <OrderSelect options={SORT_OPTIONS} value={tableQuery.sort()} onChange={tableQuery.setSort} />
  );

  return (
    <RequireFullData>
      <Show when={!isUndefined(visibleProjects())} fallback={<Loading spinnerClass="position-fixed top-50 start-50" />}>
        <main class="flex-grow-1 container-fluid px-3 px-lg-4 mainPadding position-relative">
          <div class="mt-2 mt-md-3 py-1">
            <div class="d-flex flex-row align-items-center mb-3 mb-lg-0">
              <div class="d-block d-lg-none">
                <MobileFilters
                  filters={filterSections}
                  initialActiveFilters={tableQuery.filters}
                  updateActiveFilters={tableQuery.updateFilter}
                  resetFilters={tableQuery.resetFilters}
                >
                  {orderSelect()}
                </MobileFilters>
              </div>

              <Show when={filterSections.length > 0}>
                <div class="d-none d-lg-block">
                  <FiltersInLine
                    filters={filterSections}
                    initialActiveFilters={tableQuery.filters}
                    updateActiveFilters={tableQuery.updateFilter}
                  />
                </div>
              </Show>

              <div class="d-none d-lg-block" classList={{ 'ms-4': filterSections.length > 0 }}>
                <div class="d-flex flex-row align-items-baseline my-2">
                  <div class={`text-uppercase text-primary fw-bold ${tableStyles.title}`}>Order</div>
                </div>

                {orderSelect()}
              </div>
            </div>

            <Show when={filterSections.length > 0}>
              <div class="d-none d-lg-block">
                <div class="mt-4">
                  <ActiveFiltersList
                    activeFilters={tableQuery.filters()}
                    resetFilters={tableQuery.resetFilters}
                    removeFilter={tableQuery.removeFilter}
                  />
                </div>
              </div>
            </Show>
          </div>
          <table
            class={`table table-sm table-striped table-bordered mb-0 ${tableStyles.tableLayout} ${styles.projectsTable}`}
          >
            <thead class={`text-uppercase text-muted ${tableStyles.thead}`}>
              <tr>
                <For each={COLUMNS}>
                  {(column: Column) => (
                    <th class={column.class} scope="col">
                      <Show when={column.shortLabel} fallback={column.label}>
                        <span class="d-none d-lg-inline">{column.label}</span>
                        <span class="d-inline d-lg-none">{column.shortLabel}</span>
                      </Show>
                    </th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <Show
                when={visibleProjects()!.length > 0}
                fallback={
                  <tr class={tableStyles.tableContent}>
                    <td colSpan={COLUMNS.length}>
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
                      <tr class={tableStyles.tableContent}>
                        <td class="px-1 px-md-2 px-lg-3 text-truncate text-muted">
                          <button
                            class={`btn btn-sm p-0 btn-link fw-semibold w-100 text-start ${styles.projectBtn}`}
                            onClick={() => updateActiveItemId(project.id)}
                            aria-label={`Open ${project.name} details`}
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
                            {(sandboxDate) => formatDatesForDevices(sandboxDate())}
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
                          {formatFirstCommitDate(project)}
                        </td>
                        <td class="d-none d-md-table-cell px-1 px-md-2 px-lg-3 text-center text-muted text-nowrap">
                          {project.audits?.length ?? 0}
                        </td>
                        <td class="d-none d-sm-table-cell px-1 px-md-2 px-lg-3 text-center text-muted text-nowrap">
                          <Show
                            when={project.audits?.length ? getLastAuditDate(project.audits) : undefined}
                            fallback="-"
                          >
                            {(lastAuditDate) => formatDatesForDevices(lastAuditDate())}
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
    </RequireFullData>
  );
};

export default Projects;

/** Returns the projects whose maturity is one of the active maturity filters, or every project without them. */
const filterByMaturity = (projects: Item[], activeFilters: ActiveFilters): Item[] => {
  const maturities = activeFilters[FilterCategory.ProjectMaturity];
  return maturities ? projects.filter((project: Item) => maturities.includes(project.maturity ?? '')) : projects;
};

/** Renders a date in full on large devices and without the day below them. */
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

/** Renders the date of the first commit of the project, or `-` when it is unknown. */
const formatFirstCommitDate = (project: Item): JSXElement => {
  const firstCommit = getFirstCommitTimestamp(project);
  if (firstCommit) {
    const dateOnly = new Date(firstCommit).toISOString().split('T')[0];
    return formatDatesForDevices(dateOnly);
  }
  return '-';
};

/** Returns the first commit timestamp of the project's primary repository (or its first one). */
const getFirstCommitTimestamp = (project: Item): string | undefined => {
  if (project.repositories && project.repositories.length > 0) {
    const primaryRepo = project.repositories.find((repo) => repo.primary);
    const repo = primaryRepo || project.repositories[0];
    return repo.github_data?.first_commit?.ts || undefined;
  }
  return undefined;
};

/** Returns the date the project was accepted into the sandbox, when it didn't join at a higher level. */
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

/** Sorts the projects by the sort field. Projects without a date go last in both directions. */
const sortItems = (items: Item[], sort: TableSort): Item[] => {
  const direction = sort.direction;

  const getValue = (date: string | undefined): number => {
    if (date) {
      return new Date(date).valueOf();
    } else {
      return direction === 'asc' ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
    }
  };

  switch (sort.by) {
    case 'name':
      return orderBy(items, [(i: Item) => i.name.toLowerCase()], [direction]);

    case 'sandbox_at':
      return orderBy(items, [(i: Item) => getValue(getSandboxDate(i))], [direction]);

    case 'first_commit':
      return orderBy(items, [(i: Item) => getValue(getFirstCommitTimestamp(i))], [direction]);

    case 'num_audits':
      return orderBy(items, [(i: Item) => i.audits?.length ?? 0], [direction]);

    case 'last_audit':
      return orderBy(items, [(i: Item) => getValue(getLastAuditDate(i.audits))], [direction]);

    default:
      return orderBy(items, [(i: Item) => getValue(i[sort.by as keyof Item] as string)], [direction]);
  }
};

import { useLocation, useNavigate } from '@solidjs/router';
import { Loading, NoData, SMALL_DEVICES_BREAKPOINTS, SVGIcon, SVGIconKind, useBreakpointDetect } from 'common';
import difference from 'lodash/difference';
import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import pick from 'lodash/pick';
import throttle from 'lodash/throttle';
import { createEffect, createMemo, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';

import {
  ALL_OPTION,
  CLASSIFY_PARAM,
  DEFAULT_CLASSIFY,
  DEFAULT_SORT,
  DEFAULT_SORT_DIRECTION,
  EXPLORE_PATH,
  FOUNDATION,
  GROUP_PARAM,
  SORT_OPTION_LABEL,
  VIEW_MODE_PARAM,
  ZOOM_LEVELS,
} from '../../data';
import {
  ActiveFilters,
  BaseData,
  ClassifyOption,
  FilterCategory,
  Group,
  SortDirection,
  SortOption,
  StateContent,
  ViewMode,
} from '../../types';
import { getAnchorId } from '../../utils/anchorIds';
import {
  buildExploreSearch,
  ExploreQueryContext,
  ExploreSearchState,
  OSS_LICENSE,
  parseExploreQuery,
} from '../../utils/exploreQuery';
import getFoundationNameLabel from '../../utils/getFoundationNameLabel';
import itemsDataGetter from '../../utils/itemsDataGetter';
import scrollToTop from '../../utils/scrollToTop';
import { buildPath, parseEnum } from '../../utils/urlParams';
import ActiveFiltersList from '../common/ActiveFiltersList';
import Footer from '../navigation/Footer';
import { useFullDataReady, useFullDataStatus, useRetryFullData } from '../stores/fullData';
import { useSetGridWidth } from '../stores/gridWidth';
import { useGroupActive, useResolvedGroup } from '../stores/groupActive';
import { useMobileTOCStatus, useSetMobileTOCStatus } from '../stores/mobileTOC';
import { useViewMode } from '../stores/viewMode';
import { useSetZoomLevel, useZoomLevel } from '../stores/zoom';
import CardCategory from './card';
import Content from './Content';
import styles from './Explore.module.css';
import Filters from './filters';
import ExploreMobileIndex from './mobile/ExploreMobileIndex';

interface Props {
  initialData: BaseData;
}

const TITLE_GAP = 40;
const CONTROLS_WIDTH = 102 + 49 + 160 + 101 + 24 + 32; // Filters + Group legend + View Mode + Zoom + Right margin + Loading
const CONTROLS_CARD_WIDTH = CONTROLS_WIDTH + 0 + 435 - 101; // + Classify/Sort - Zoom
const DELAY_ACTIONS = 40;
const SORT_PARAM = 'sort';
// Filters the base data can apply, so the Grid view doesn't wait for the full data
const BASE_DATA_FILTERS: string[] = [FilterCategory.Maturity, FilterCategory.TAG];

const Explore = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { point } = useBreakpointDetect();
  const state = () => location.state || {};
  const from = () => (state() as StateContent).from || undefined;

  const fullDataReady = useFullDataReady();
  const fullDataStatus = useFullDataStatus();
  const retryFullData = useRetryFullData();
  const zoom = useZoomLevel();
  const updateZoom = useSetZoomLevel();
  const viewMode = useViewMode();
  const resolvedGroup = useResolvedGroup();
  const activeGroup = useGroupActive();
  const updateContainerGridWidth = useSetGridWidth();

  const [visibleLoading, setVisibleLoading] = createSignal<boolean>(false);
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
  const [controlsGroupWrapper, setControlsGroupWrapper] = createSignal<HTMLDivElement>();
  const [controlsGroupWrapperWidth, setControlsGroupWrapperWidth] = createSignal<number>(0);
  const [openMenuStatus, setOpenMenuStatus] = createSignal<boolean>(false);
  const [visibleSelectForGroups, setVisibleSelectForGroups] = createSignal<boolean>(false);
  const openMenuTOCFromHeader = useMobileTOCStatus();
  const setMenuTOCFromHeader = useSetMobileTOCStatus();
  const activeGroups = () => itemsDataGetter.getGroups();
  // The Grid view has no all option, so it shows the first group for the all option, as
  // when a Card view URL for every group falls back to the Grid view without the full data
  const selectedGroup = createMemo(() => {
    const firstGroup = activeGroups()?.[0];
    return viewMode() === ViewMode.Grid && activeGroup() === ALL_OPTION && !isUndefined(firstGroup)
      ? firstGroup
      : activeGroup();
  });
  // Group written to the URL: the group shown, none when the landscape has no groups
  const group = () => (isUndefined(resolvedGroup()) ? undefined : selectedGroup());

  const maturityOptions = itemsDataGetter.getMaturityOptions().map((option) => option.name);
  const foundationLabel = getFoundationNameLabel(FOUNDATION);

  // The full data gives the items and the classify and sort options of each group
  const landscapeData = createMemo(() => (fullDataReady() ? itemsDataGetter.getAll() : undefined));
  const classifyAndSortOptions = createMemo(() => {
    fullDataReady();
    return itemsDataGetter.getClassifyAndSortOptions();
  });

  // Every option is available until the full data gives the options of each group
  const getClassifyOptions = (groupName: string): ClassifyOption[] =>
    classifyAndSortOptions()[groupName]?.classify ?? Object.values(ClassifyOption);
  const getSortOptions = (groupName: string): SortOption[] =>
    classifyAndSortOptions()[groupName]?.sort ?? Object.values(SortOption);

  const classifyOptions = createMemo(() => getClassifyOptions(selectedGroup()));
  const sortOptions = createMemo(() => getSortOptions(selectedGroup()));
  const licenseOptions = createMemo(
    () => {
      // The licenses come from the full data
      fullDataReady();
      return itemsDataGetter.getLicenseOptionsPerGroup(selectedGroup());
    },
    [],
    { equals: isEqual }
  );

  const getQueryContext = (groupName: string): ExploreQueryContext => ({
    classifyOptions: getClassifyOptions(groupName),
    foundationLabel,
    licenseOptions: licenseOptions(),
    maturityOptions,
    sortOptions: getSortOptions(groupName),
  });

  // The view state follows the URL, so Back, Forward and reloads restore it
  const exploreQuery = createMemo(() => parseExploreQuery(location.search, getQueryContext(selectedGroup())));
  const classify = createMemo(() => exploreQuery().classify);
  const sorted = createMemo(() => exploreQuery().sortBy);
  const sortDirection = createMemo(() => exploreQuery().sortDirection);
  // Without the full data, the base data grid stays and the views that need it are disabled
  const fullDataFailed = () => fullDataStatus() === 'error';
  // The URL filters the base data can't apply are left out while the full data has failed to load
  const activeFilters = createMemo(
    () => {
      const filters = exploreQuery().filters;
      return fullDataFailed() ? pick(filters, BASE_DATA_FILTERS) : filters;
    },
    {},
    { equals: isEqual }
  );

  // The Card view and the filters the base data can't apply need the full data
  const fullDataRequired = createMemo(
    () =>
      viewMode() === ViewMode.Card || Object.keys(activeFilters()).some((filter) => !BASE_DATA_FILTERS.includes(filter))
  );
  const readyData = () => !fullDataRequired() || fullDataReady();

  // Items of the URL filters and group, also after Back or Forward. The full data is
  // only read when the view needs it, so its arrival doesn't re-render the grid
  const queryResult = createMemo(() => {
    if (fullDataRequired()) {
      fullDataReady();
    }
    return itemsDataGetter.queryItems(activeFilters(), selectedGroup(), classify());
  });
  const numVisibleItems = () => queryResult().numItems[selectedGroup()];

  // Anchor ids of the Card view menu shown, in menu order; empty until the full data is ready
  const cardSectionIds = createMemo(
    () => {
      if (viewMode() !== ViewMode.Card || !fullDataReady()) return [];
      const menu = queryResult().menu[selectedGroup()] ?? {};
      return Object.entries(menu).flatMap(([title, subtitles]) =>
        subtitles
          .map((subtitle) => getAnchorId({ title, subtitle, grouped: true }))
          .filter((anchorId): anchorId is string => !isUndefined(anchorId))
      );
    },
    [],
    { equals: isEqual }
  );

  // Explore URL state as currently shown; classify and sort only belong to the Card view
  const getSearchState = (): ExploreSearchState => {
    const isCard = viewMode() === ViewMode.Card;
    return {
      classify: isCard ? classify() : undefined,
      filters: activeFilters(),
      group: group(),
      search: location.search,
      sortBy: isCard ? sorted() : undefined,
      sortDirection: isCard ? sortDirection() : undefined,
      viewMode: viewMode(),
    };
  };

  const closeMenuStatus = () => {
    setOpenMenuStatus(false);
    setMenuTOCFromHeader(false);
  };

  const hideVisibleLoading = () => {
    setTimeout(() => {
      setVisibleLoading(false);
    });
  };

  const updateQueryString = (param: string, value: string) => {
    const nextGroup = param === GROUP_PARAM ? value : selectedGroup();
    const nextViewMode = param === VIEW_MODE_PARAM ? parseEnum(value, Object.values(ViewMode), viewMode()) : viewMode();
    const nextClassifyOptions = getClassifyOptions(nextGroup);
    const nextSortOptions = getSortOptions(nextGroup);

    let groupParam = param === GROUP_PARAM ? value : group();
    // The Grid view has no all option
    const groups = activeGroups();
    if (nextViewMode === ViewMode.Grid && nextGroup === ALL_OPTION && !isUndefined(groups)) {
      groupParam = groups[0];
    }

    let nextClassify = param === CLASSIFY_PARAM ? parseEnum(value, nextClassifyOptions, classify()) : classify();
    let nextSortBy = sorted();
    let nextSortDirection = sortDirection();
    if (param === SORT_PARAM) {
      const [sortBy, direction] = value.split('_');
      nextSortBy = parseEnum(sortBy, nextSortOptions, sorted());
      nextSortDirection = parseEnum(direction, Object.values(SortDirection), sortDirection());
    }

    // Classify and sort options missing in the next group fall back to the defaults
    if (!nextClassifyOptions.includes(nextClassify)) {
      nextClassify = DEFAULT_CLASSIFY;
    }
    if (!nextSortOptions.includes(nextSortBy)) {
      nextSortBy = DEFAULT_SORT;
      nextSortDirection = DEFAULT_SORT_DIRECTION;
    }

    const isCard = nextViewMode === ViewMode.Card;
    const search = buildExploreSearch(
      {
        classify: isCard ? nextClassify : undefined,
        // Filters are reset when the group changes
        filters: param === GROUP_PARAM ? {} : activeFilters(),
        group: groupParam,
        search: location.search,
        sortBy: isCard ? nextSortBy : undefined,
        sortDirection: isCard ? nextSortDirection : undefined,
        viewMode: nextViewMode,
      },
      getQueryContext(nextGroup)
    );

    if (param === GROUP_PARAM) {
      scrollToTop(false);
    }
    hideVisibleLoading();

    // Group and view mode changes add a history entry, the other changes replace it. The
    // section hash is dropped: the Card view hash effect opens the first section of the next menu
    navigate(buildPath(EXPLORE_PATH, search, ''), {
      replace: ![GROUP_PARAM, VIEW_MODE_PARAM].includes(param),
      scroll: true, // default
    });
  };

  const updateFiltersQueryString = (filters: ActiveFilters) => {
    const search = buildExploreSearch({ ...getSearchState(), filters }, getQueryContext(selectedGroup()));

    // The section hash is dropped: the Card view hash effect opens the first section of the filtered menu
    navigate(buildPath(EXPLORE_PATH, search, ''), {
      replace: true,
      scroll: true, // default
    });

    hideVisibleLoading();
  };

  // The Card view opens at the first section of the menu shown when the URL names no section of
  // it: on load, and after the classify, filters, group or view mode change the menu or drop the hash
  createEffect(
    on([cardSectionIds, () => location.hash], ([sectionIds, hash]) => {
      const [firstSectionId] = sectionIds;
      if (isUndefined(firstSectionId) || sectionIds.includes(hash.replace('#', ''))) return;
      navigate(buildPath(EXPLORE_PATH, location.search, `#${firstSectionId}`), {
        replace: true,
        scroll: true, // default
      });
    })
  );

  createEffect(
    on(viewMode, () => {
      // Check if select for groups has to be visible
      checkContainerWidth();
    })
  );

  createEffect(
    on(openMenuTOCFromHeader, () => {
      if (openMenuTOCFromHeader()) {
        setOpenMenuStatus(true);
      }
    })
  );

  const removeFilter = (name: FilterCategory, value: string) => {
    let tmpActiveFilters: string[] = (activeFilters()[name] ?? []).filter((f: string) => f !== value);
    if (name === FilterCategory.Maturity && value === foundationLabel) {
      tmpActiveFilters = difference(tmpActiveFilters, maturityOptions);
    } else if (name === FilterCategory.License && value === OSS_LICENSE) {
      tmpActiveFilters = difference(tmpActiveFilters, licenseOptions());
    }
    updateActiveFilters(name, tmpActiveFilters);
  };

  const updateActiveFilters = (value: FilterCategory, options: string[]) => {
    const tmpActiveFilters: ActiveFilters = { ...activeFilters() };
    if (options.length === 0) {
      delete tmpActiveFilters[value];
    } else {
      tmpActiveFilters[value] = options;
    }
    applyFilters(tmpActiveFilters);
  };

  const resetFilters = () => {
    applyFilters({});
  };

  // The filters are applied by the URL they are written to, which the items query follows
  const applyFilters = (newFilters: ActiveFilters) => {
    setVisibleLoading(true);

    setTimeout(() => {
      updateFiltersQueryString(newFilters);
    }, DELAY_ACTIONS);
  };

  const checkContainerWidth = () => {
    const container = containerRef();
    if (!isUndefined(container)) {
      const gap = SMALL_DEVICES_BREAKPOINTS.includes(point()) ? 0 : TITLE_GAP;
      const width = container.offsetWidth - gap;
      if (width > 0) {
        updateContainerGridWidth(width);
      }

      // Avoid groups section with multiline
      if (!SMALL_DEVICES_BREAKPOINTS.includes(point())) {
        const controls = viewMode() === ViewMode.Card ? CONTROLS_CARD_WIDTH : CONTROLS_WIDTH;
        const controlsWrapper = controlsGroupWrapper();
        if (!isUndefined(controlsWrapper)) {
          if (controlsGroupWrapperWidth() === 0) {
            const controlsGWidth = controlsWrapper.clientWidth;
            if (controlsGWidth + controls > container.clientWidth) {
              setVisibleSelectForGroups(true);
            } else {
              setVisibleSelectForGroups(false);
            }
            setControlsGroupWrapperWidth(controlsGWidth);
          } else {
            if (controlsGroupWrapperWidth() + controls > container.clientWidth) {
              setVisibleSelectForGroups(true);
            } else {
              setVisibleSelectForGroups(false);
            }
          }
        }
      }
    }
  };

  onMount(() => {
    if (from() === 'header') {
      scrollToTop(false);
    }

    // The same reference is added and removed, and a pending call is dropped on unmount
    const onResize = throttle(checkContainerWidth, 400);
    window.addEventListener('resize', onResize, { passive: true });
    onCleanup(() => {
      window.removeEventListener('resize', onResize);
      onResize.cancel();
    });
    checkContainerWidth();
  });

  return (
    <>
      <main class="flex-grow-1 container-fluid px-3 px-lg-4 mainPadding position-relative">
        <div class="d-flex flex-column flex-lg-row my-2 my-md-3 py-1">
          <div class="d-flex flex-row align-items-center mb-1 mb-md-0 w-100">
            <div class="d-block d-lg-none ms-0 ms-lg-4">
              <button
                title="Index"
                class={`position-relative btn btn-sm btn-secondary text-white btn-sm rounded-0 py-0 me-1 me-lg-4 btnIconMobile ${styles.mobileToCBtn}`}
                onClick={() => setOpenMenuStatus(true)}
                disabled={
                  numVisibleItems() === 0 || (viewMode() === ViewMode.Card && classify() === ClassifyOption.None)
                }
                aria-label="Open Table of contents"
              >
                <SVGIcon kind={SVGIconKind.ToC} />
              </button>
            </div>

            <Filters
              data={props.initialData}
              initialLandscapeData={landscapeData}
              initialSelectedGroup={selectedGroup}
              initialActiveFilters={activeFilters}
              applyFilters={applyFilters}
              classify={classify()}
              sorted={sorted()}
              sortDirection={sortDirection()}
              updateQueryString={updateQueryString}
              classifyOptions={classifyOptions()}
              sortOptions={sortOptions()}
            />

            <Show when={visibleLoading()}>
              <div class="d-flex d-lg-none ms-2">
                <div class={`spinner-border text-secondary mt-1 ${styles.spinner}`} role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </div>
            </Show>

            <div class="d-none d-lg-flex align-items-center">
              <Show when={viewMode() === ViewMode.Card || (activeGroups()?.length ?? 0) > 1}>
                <div class={styles.btnGroupLegend}>
                  <small class="text-muted me-2">GROUP:</small>
                </div>
                <div
                  ref={setControlsGroupWrapper}
                  classList={{ 'd-flex': !visibleSelectForGroups(), 'd-none': visibleSelectForGroups() }}
                >
                  <div
                    class={`btn-group btn-group-sm ${styles.btnGroup}`}
                    classList={{
                      'me-4': viewMode() === ViewMode.Card || (activeGroups()?.length ?? 0) > 1,
                    }}
                  >
                    <For each={props.initialData.groups}>
                      {(group: Group) => {
                        const normalizedName = group.normalized_name;
                        if (isUndefined(normalizedName) || activeGroups()?.includes(normalizedName) === false)
                          return null;
                        return (
                          <button
                            title={`Group: ${group.name}`}
                            class={`btn btn-outline-primary btn-sm rounded-0 fw-semibold text-nowrap ${styles.navLink}`}
                            classList={{
                              [`active ${styles.active}`]: normalizedName === selectedGroup(),
                            }}
                            onClick={() => {
                              setVisibleLoading(true);

                              setTimeout(() => {
                                updateQueryString(GROUP_PARAM, normalizedName);
                              }, DELAY_ACTIONS);
                            }}
                            aria-label={group.name}
                          >
                            {group.name}
                          </button>
                        );
                      }}
                    </For>
                    <Show when={viewMode() === ViewMode.Card}>
                      <button
                        title="All"
                        class={`btn btn-outline-primary btn-sm rounded-0 fw-semibold text-nowrap ${styles.navLink}`}
                        classList={{
                          [`active ${styles.active}`]: ALL_OPTION === selectedGroup() || activeGroups()?.length === 0,
                        }}
                        onClick={() => {
                          setVisibleLoading(true);

                          setTimeout(() => {
                            updateQueryString(GROUP_PARAM, ALL_OPTION);
                          }, DELAY_ACTIONS);
                        }}
                        aria-label="All"
                      >
                        All
                      </button>
                    </Show>
                  </div>
                </div>
                {/* Only visible when btn grouped for groups overflows wrapper */}
                <Show when={viewMode() === ViewMode.Card || (activeGroups()?.length ?? 0) > 1}>
                  <div classList={{ 'd-none': !visibleSelectForGroups(), 'd-flex': visibleSelectForGroups() }}>
                    <select
                      id="desktop-group"
                      class={`form-select form-select-sm border-primary text-primary rounded-0 me-4 ${styles.desktopSelect}`}
                      value={activeGroups()?.length === 0 ? ALL_OPTION : selectedGroup()}
                      aria-label="Groups list"
                      onChange={(e) => {
                        setVisibleLoading(true);
                        const group = e.currentTarget.value;

                        setTimeout(() => {
                          updateQueryString(GROUP_PARAM, group);
                        }, DELAY_ACTIONS);
                      }}
                    >
                      <For each={props.initialData.groups}>
                        {(group: Group) => {
                          const normalizedName = group.normalized_name;
                          if (isUndefined(normalizedName) || activeGroups()?.includes(normalizedName) === false)
                            return null;
                          return <option value={normalizedName}>{group.name}</option>;
                        }}
                      </For>
                      <Show when={viewMode() === ViewMode.Card}>
                        <option value={ALL_OPTION}>All</option>
                      </Show>
                    </select>
                  </div>
                </Show>
              </Show>
            </div>
            <div class={`d-none d-md-block ms-0 ms-md-auto ms-lg-0 ${styles.btnGroupLegend}`}>
              <small class="text-muted text-nowrap me-2">VIEW MODE:</small>
            </div>
            <div
              class={`btn-group btn-group-sm me-0 me-lg-4 ms-auto ms-md-0 ${styles.btnGroup}`}
              role="group"
              aria-label="View mode options"
            >
              <For each={Object.entries(ViewMode)}>
                {([mode, value]) => {
                  return (
                    <button
                      title={`View mode: ${mode}`}
                      type="button"
                      class="btn btn-outline-primary rounded-0 fw-semibold"
                      classList={{
                        [`active ${styles.active}`]: value === viewMode(),
                      }}
                      disabled={value === ViewMode.Card && fullDataFailed()}
                      onClick={() => {
                        if (!(value === viewMode())) {
                          setVisibleLoading(true);

                          setTimeout(() => {
                            updateQueryString(VIEW_MODE_PARAM, value);
                          }, DELAY_ACTIONS);
                        }
                      }}
                      aria-label={`Change view mode to ${mode}`}
                    >
                      {mode}
                    </button>
                  );
                }}
              </For>
            </div>
            <div class="d-none d-lg-flex align-items-center">
              <Switch>
                <Match when={viewMode() === ViewMode.Grid}>
                  <div class={styles.btnGroupLegend}>
                    <small class="text-muted me-2">ZOOM:</small>
                  </div>
                  <div class="d-flex flex-row">
                    <div class={`btn-group btn-group-sm ${styles.btnGroup}`}>
                      <button
                        type="button"
                        title="Decrease zoom level"
                        class="btn btn-outline-primary rounded-0 fw-semibold"
                        disabled={zoom() === 0}
                        onClick={() => {
                          updateZoom(zoom() - 1);
                        }}
                        aria-label="Decrease zoom level"
                      >
                        <div class={styles.btnSymbol}>-</div>
                      </button>
                      <button
                        type="button"
                        title="Increase zoom level"
                        class="btn btn-outline-primary rounded-0 fw-semibold"
                        disabled={zoom() === ZOOM_LEVELS.length - 1}
                        onClick={() => {
                          updateZoom(zoom() + 1);
                        }}
                        aria-label="Increase zoom level"
                      >
                        <div class={styles.btnSymbol}>+</div>
                      </button>
                    </div>
                  </div>
                </Match>
                <Match when={viewMode() === ViewMode.Card}>
                  <div class={styles.btnGroupLegend}>
                    <small class="text-muted text-uppercase me-2">Classify:</small>
                  </div>
                  <select
                    id="classify"
                    class={`form-select form-select-sm border-primary text-primary rounded-0 me-4 ${styles.desktopSelect} ${styles.miniSelect}`}
                    value={classify()}
                    aria-label="Classify options"
                    onChange={(e) => {
                      setVisibleLoading(true);
                      const classifyOpt = e.currentTarget.value as ClassifyOption;

                      setTimeout(() => {
                        updateQueryString(CLASSIFY_PARAM, classifyOpt);
                      }, DELAY_ACTIONS);
                    }}
                  >
                    <For each={classifyOptions()}>
                      {(opt: ClassifyOption) => {
                        const label = Object.keys(ClassifyOption)[Object.values(ClassifyOption).indexOf(opt)];
                        return <option value={opt}>{label}</option>;
                      }}
                    </For>
                  </select>
                  <div class={styles.btnGroupLegend}>
                    <small class="text-muted text-uppercase me-2">Sort:</small>
                  </div>
                  <select
                    id="sorted"
                    class={`form-select form-select-sm border-primary text-primary rounded-0 ${styles.desktopSelect} ${styles.midSelect}`}
                    value={`${sorted()}_${sortDirection()}`}
                    aria-label="Sort options"
                    onChange={(e) => {
                      setVisibleLoading(true);
                      const sortValue = e.currentTarget.value;

                      setTimeout(() => {
                        updateQueryString(SORT_PARAM, sortValue);
                      }, DELAY_ACTIONS);
                    }}
                  >
                    <For each={sortOptions()}>
                      {(opt: SortOption) => {
                        return (
                          <For each={Object.values(SortDirection)}>
                            {(direction: string) => {
                              return (
                                <option value={`${opt}_${direction}`}>
                                  {SORT_OPTION_LABEL[opt]} ({direction})
                                </option>
                              );
                            }}
                          </For>
                        );
                      }}
                    </For>
                  </select>
                </Match>
              </Switch>
            </div>
            <Show when={visibleLoading()}>
              <div class="d-none d-lg-flex ms-auto">
                <div class={`spinner-border text-secondary ms-3 mt-1 ${styles.spinner}`} role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
              </div>
            </Show>
          </div>
          <Show when={!isUndefined(props.initialData.groups) && (activeGroups()?.length ?? 0) > 1}>
            <div class="d-flex d-lg-none align-items-center mt-3 mt-md-4 mt-lg-0 mb-2 mb-md-3 mb-lg-0">
              <div class={`d-none d-md-block ${styles.btnGroupLegend}`}>
                <small class="text-muted me-2">GROUP:</small>
              </div>
              <select
                id="mobile-group"
                class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                value={selectedGroup()}
                aria-label="Groups list"
                onChange={(e) => {
                  setVisibleLoading(true);
                  const group = e.currentTarget.value;

                  setTimeout(() => {
                    updateQueryString(GROUP_PARAM, group);
                  }, DELAY_ACTIONS);
                }}
              >
                {/* Do not display All option for mobile */}
                <For each={props.initialData.groups}>
                  {(group: Group) => {
                    const normalizedName = group.normalized_name;
                    if (isUndefined(normalizedName) || activeGroups()?.includes(normalizedName) === false) return null;

                    return <option value={normalizedName}>{group.name}</option>;
                  }}
                </For>
              </select>
            </div>
          </Show>
        </div>

        <div class="d-none d-lg-block">
          <ActiveFiltersList
            activeFilters={activeFilters()}
            maturityOptions={maturityOptions}
            licenseOptions={licenseOptions()}
            resetFilters={resetFilters}
            removeFilter={removeFilter}
          />
        </div>

        <Show when={fullDataFailed()}>
          <div
            class="alert alert-warning d-flex flex-column flex-sm-row align-items-sm-center rounded-0 my-3"
            role="alert"
          >
            <div class="flex-grow-1">
              We couldn't load the full landscape data, so the Card view and the filters are not available.
            </div>
            <button
              type="button"
              class="btn btn-sm btn-secondary rounded-0 mt-2 mt-sm-0 ms-sm-3 align-self-start align-self-sm-center"
              onClick={() => retryFullData()}
            >
              Try again
            </button>
          </div>
        </Show>

        <Show when={!readyData() && !fullDataFailed()}>
          <Loading spinnerClass="position-fixed top-50 start-50" transparentBg />
        </Show>

        <Show when={numVisibleItems() === 0 && readyData()}>
          <div class="pt-5">
            <NoData>
              <>
                <div class="fs-4">We couldn't find any items that match the criteria selected.</div>
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
        </Show>

        <Switch>
          <Match when={SMALL_DEVICES_BREAKPOINTS.includes(point())}>
            <Show when={readyData()}>
              <div ref={setContainerRef}>
                <ExploreMobileIndex
                  openMenuStatus={openMenuStatus()}
                  closeMenuStatus={closeMenuStatus}
                  data={queryResult().grid[isUndefined(props.initialData.groups) ? ALL_OPTION : selectedGroup()]}
                  cardData={queryResult().card[selectedGroup()]}
                  menu={queryResult().menu[selectedGroup()]}
                  classify={classify()}
                  sorted={sorted()}
                  direction={sortDirection()}
                />
              </div>
            </Show>
          </Match>
          <Match when={!SMALL_DEVICES_BREAKPOINTS.includes(point())}>
            <div class="position-relative d-flex w-100 pt-1">
              <div
                ref={setContainerRef}
                style={{
                  '--card-size-width': `${ZOOM_LEVELS[zoom()][0]}px`,
                  '--card-size-height': `${ZOOM_LEVELS[zoom()][1]}px`,
                }}
                // On Windows, we add a class to prevent flattening the items of the grid
                class={`d-flex flex-column flex-grow-1 w-100 ${styles.container} zoom-${zoom()} ${navigator.userAgent.indexOf('Win') != -1 ? styles.containerWindows : ''}`}
              >
                <Show when={readyData()}>
                  <Show
                    when={(activeGroups()?.length ?? 0) > 0}
                    fallback={
                      <Show
                        when={isUndefined(props.initialData.groups)}
                        fallback={
                          <Content
                            data={{}}
                            initialSelectedGroup={ALL_OPTION}
                            group={ALL_OPTION}
                            cardData={queryResult().card[ALL_OPTION]}
                            menu={queryResult().menu[ALL_OPTION]}
                            categories_overridden={props.initialData.categories_overridden}
                            classify={classify()}
                            sorted={sorted()}
                            direction={sortDirection()}
                          />
                        }
                      >
                        <Content
                          data={queryResult().grid[ALL_OPTION]}
                          cardData={queryResult().card[ALL_OPTION]}
                          menu={queryResult().menu[ALL_OPTION]}
                          categories_overridden={props.initialData.categories_overridden}
                          classify={classify()}
                          sorted={sorted()}
                          direction={sortDirection()}
                        />
                      </Show>
                    }
                  >
                    <div class={viewMode() === ViewMode.Card && selectedGroup() === ALL_OPTION ? 'd-block' : 'd-none'}>
                      <CardCategory
                        initialIsVisible={viewMode() === ViewMode.Card && selectedGroup() === ALL_OPTION}
                        data={queryResult().card[ALL_OPTION]}
                        menu={queryResult().menu[ALL_OPTION]}
                        classify={classify()}
                        sorted={sorted()}
                        direction={sortDirection()}
                      />
                    </div>
                    <For each={activeGroups()}>
                      {(group: string) => {
                        return (
                          <Content
                            group={group}
                            initialSelectedGroup={selectedGroup()}
                            data={queryResult().grid[group]}
                            cardData={queryResult().card[group]}
                            menu={queryResult().menu[group]}
                            categories_overridden={props.initialData.categories_overridden}
                            classify={classify()}
                            sorted={sorted()}
                            direction={sortDirection()}
                          />
                        );
                      }}
                    </For>
                  </Show>
                </Show>
              </div>
            </div>
          </Match>
        </Switch>
      </main>
      <Footer />
    </>
  );
};

export default Explore;

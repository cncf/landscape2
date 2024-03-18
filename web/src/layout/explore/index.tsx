import { useLocation, useNavigate, useSearchParams } from '@solidjs/router';
import { some } from 'lodash';
import compact from 'lodash/compact';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import throttle from 'lodash/throttle';
import uniq from 'lodash/uniq';
import { batch, createEffect, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';

import {
  ALL_OPTION,
  CLASSIFIED_PARAM,
  DEFAULT_CLASSIFIED,
  DEFAULT_SORT,
  DEFAULT_SORT_DIRECTION,
  GROUP_PARAM,
  SMALL_DEVICES_BREAKPOINTS,
  SORT_BY_PARAM,
  SORT_DIRECTION_PARAM,
  SORT_OPTION_LABEL,
  VIEW_MODE_PARAM,
  ZOOM_LEVELS,
} from '../../data';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import {
  ActiveFilters,
  BaseData,
  CardMenu,
  ClassifiedOption,
  FilterCategory,
  Group,
  Item,
  SortDirection,
  SortOption,
  StateContent,
  SVGIconKind,
  ViewMode,
} from '../../types';
import countVisibleItems from '../../utils/countVisibleItems';
import getFoundationNameLabel from '../../utils/getFoundationNameLabel';
import itemsDataGetter from '../../utils/itemsDataGetter';
import { GroupData } from '../../utils/prepareData';
import scrollToTop from '../../utils/scrollToTop';
import ActiveFiltersList from '../common/ActiveFiltersList';
import Loading from '../common/Loading';
import NoData from '../common/NoData';
import SVGIcon from '../common/SVGIcon';
import Footer from '../navigation/Footer';
import { useFullDataReady } from '../stores/fullData';
import { useSetGridWidth } from '../stores/gridWidth';
import { useGroupActive, useSetGroupActive } from '../stores/groupActive';
import { useMobileTOCStatus, useSetMobileTOCStatus } from '../stores/mobileTOC';
import { useSetViewMode, useViewMode } from '../stores/viewMode';
import { useSetZoomLevel, useZoomLevel } from '../stores/zoom';
import CardCategory from './card';
import Content from './Content';
import styles from './Explore.module.css';
import Filters from './filters';
import ExploreMobileIndex from './mobile/ExploreMobileIndex';

interface Props {
  initialData: BaseData;
}

export type LoadedContent = {
  [key in ViewMode]: string[];
};

const TITLE_GAP = 40;
const CONTROLS_WIDTH = 102 + 49 + 160 + 101 + 24; // Filters + Group legend + View Mode + Zoom + Right margin
const CONTROLS_CARD_WIDTH = CONTROLS_WIDTH + 0 + 385 - 101; // + Classified/Sort - Zoom
const EXTRA_FILTERS = ['specification'];

const Explore = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { point } = useBreakpointDetect();
  const state = () => location.state || {};
  const from = () => (state() as StateContent).from || undefined;

  const fullDataReady = useFullDataReady();
  const zoom = useZoomLevel();
  const updateZoom = useSetZoomLevel();
  const viewMode = useViewMode();
  const setViewMode = useSetViewMode();
  const selectedGroup = useGroupActive();
  const setSelectedGroup = useSetGroupActive();
  const updateContainerGridWidth = useSetGridWidth();

  const [readyData, setReadyData] = createSignal<boolean>(true);
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
  const [controlsGroupWrapper, setControlsGroupWrapper] = createSignal<HTMLDivElement>();
  const [controlsGroupWrapperWidth, setControlsGroupWrapperWidth] = createSignal<number>(0);
  const [landscapeData, setLandscapeData] = createSignal<Item[]>();
  const [groupsData, setGroupsData] = createSignal<GroupData>();
  const [cardData, setCardData] = createSignal<{ [key: string]: unknown }>();
  const [cardMenu, setCardMenu] = createSignal<{ [key: string]: CardMenu | undefined }>();
  const [numVisibleItems, setNumVisibleItems] = createSignal<number>();
  const [visibleLoading, setVisibleLoading] = createSignal<boolean>(false);
  const [fullDataApplied, setFullDataApplied] = createSignal<boolean>(false);
  const [openMenuStatus, setOpenMenuStatus] = createSignal<boolean>(false);
  const [visibleSelectForGroups, setVisibleSelectForGroups] = createSignal<boolean>(false);
  const [classified, setClassified] = createSignal<ClassifiedOption>(
    searchParams[CLASSIFIED_PARAM] ? (searchParams[CLASSIFIED_PARAM] as ClassifiedOption) : DEFAULT_CLASSIFIED
  );
  const [sorted, setSorted] = createSignal<SortOption>(
    searchParams[SORT_BY_PARAM] ? (searchParams[SORT_BY_PARAM] as SortOption) : DEFAULT_SORT
  );
  const [sortDirection, setSortDirection] = createSignal<SortDirection>(
    searchParams[SORT_DIRECTION_PARAM] ? (searchParams[SORT_DIRECTION_PARAM] as SortDirection) : DEFAULT_SORT_DIRECTION
  );
  const [loaded, setLoaded] = createSignal<LoadedContent>({ grid: [], card: [] });
  const openMenuTOCFromHeader = useMobileTOCStatus();
  const setMenuTOCFromHeader = useSetMobileTOCStatus();
  const onSmallDevice = !isUndefined(point()) && SMALL_DEVICES_BREAKPOINTS.includes(point()!);
  const [availableMaturityClassification, setAvailableMaturityClassification] = createSignal<boolean>(false);

  const checkIfFullDataRequired = (): boolean => {
    const activeFiltersKeys = Object.keys(activeFilters());
    if (!isEmpty(activeFilters())) {
      const filtersInBase = [FilterCategory.Maturity, FilterCategory.TAG];
      // If base data is enough for active filters
      if (activeFiltersKeys.every((f) => filtersInBase.includes(f as FilterCategory))) {
        return false;
      } else {
        return true;
      }
    }

    return false;
  };

  const getMaturityOptions = () => {
    const maturity = props.initialData.items.map((i: Item) => i.maturity);
    return uniq(compact(maturity)) || [];
  };

  const finishLoading = () => {
    setVisibleLoading(false);
  };

  const prepareData = (newData: GroupData) => {
    const currentNumber = countVisibleItems(newData[selectedGroup() || ALL_OPTION]);
    if (currentNumber === 0) {
      finishLoading();
    }
    setNumVisibleItems(currentNumber);
    setGroupsData(newData);
  };

  const maturityOptions = getMaturityOptions();

  const getActiveFiltersFromUrl = (): ActiveFilters => {
    const currentFilters: ActiveFilters = {};

    const params = new URLSearchParams(location.search);
    for (const [key, value] of params) {
      const f = key as FilterCategory;
      if (Object.values(FilterCategory).includes(f)) {
        if (f === FilterCategory.Maturity && value === getFoundationNameLabel()) {
          currentFilters[f] = maturityOptions;
        } else {
          if (currentFilters[f]) {
            currentFilters[f] = [...currentFilters[f]!, value];
          } else {
            currentFilters[f] = [value];
          }
        }
      } else {
        if (EXTRA_FILTERS.includes(key)) {
          if (currentFilters[f]) {
            currentFilters[FilterCategory.Extra] = [...currentFilters[FilterCategory.Extra]!, key];
          } else {
            currentFilters[FilterCategory.Extra] = [key];
          }
        }
      }
    }
    const data = itemsDataGetter.queryItems(currentFilters, selectedGroup() || ALL_OPTION, classified()!);
    prepareData(data.grid as GroupData);
    setCardData(data.card);
    setCardMenu(data.menu);

    return currentFilters;
  };

  // eslint-disable-next-line solid/reactivity
  const [activeFilters, setActiveFilters] = createSignal<ActiveFilters>(getActiveFiltersFromUrl());

  const checkIfVisibleLoading = (viewMode?: ViewMode, groupName?: string) => {
    // Not for small devices
    if (!onSmallDevice) {
      if (viewMode) {
        const group = groupName || selectedGroup() || ALL_OPTION;
        if (!loaded()[viewMode].includes(groupName || ALL_OPTION)) {
          setVisibleLoading(true);

          setLoaded({
            ...loaded(),
            [viewMode]: [...loaded()[viewMode], group],
          });
        } else {
          setVisibleLoading(false);
        }
      } else {
        setVisibleLoading(false);
      }
    }
  };

  const closeMenuStatus = () => {
    setOpenMenuStatus(false);
    setMenuTOCFromHeader(false);
  };

  const updateQueryString = (param: string, value: string) => {
    const updatedSearchParams = new URLSearchParams(location.search);
    if (param === 'sort') {
      const sortOpt = value.split('_');
      updatedSearchParams.set(SORT_BY_PARAM, sortOpt[0]);
      updatedSearchParams.set(SORT_DIRECTION_PARAM, sortOpt[1]);
    } else {
      updatedSearchParams.set(param, value);
    }
    if (location.search === '' && param === 'group') {
      updatedSearchParams.set(VIEW_MODE_PARAM, viewMode());
    }
    if (param === VIEW_MODE_PARAM) {
      if (value === ViewMode.Grid) {
        updatedSearchParams.delete(CLASSIFIED_PARAM);
        updatedSearchParams.delete(SORT_BY_PARAM);
      } else {
        updatedSearchParams.set(CLASSIFIED_PARAM, classified());
        updatedSearchParams.set(SORT_BY_PARAM, sorted());
      }
    }

    navigate(`${location.pathname}?${updatedSearchParams.toString()}`, {
      state: location.state,
      replace: true,
      scroll: true, // default
    });
  };

  const getFiltersQuery = (filters?: ActiveFilters): URLSearchParams => {
    const f = filters || activeFilters();
    const params = new URLSearchParams();
    const foundation = getFoundationNameLabel();
    if (!isUndefined(f) && !isEmpty(f)) {
      Object.keys(f).forEach((filterId: string) => {
        if (
          filterId === FilterCategory.Maturity &&
          maturityOptions.every((element) => f![filterId as FilterCategory]!.includes(element))
        ) {
          return params.append(filterId as string, foundation);
        } else {
          return f![filterId as FilterCategory]!.forEach((id: string) => {
            if (id.toString() !== foundation) {
              params.append(filterId as string, id.toString());
            }
          });
        }
      });
    }
    return params;
  };

  const updateFiltersQueryString = (filters: ActiveFilters) => {
    const params = new URLSearchParams(location.search);
    Object.values(FilterCategory).forEach((f: string) => {
      params.delete(f);
    });
    EXTRA_FILTERS.forEach((f: string) => {
      params.delete(f);
    });

    if (params.toString() === '') {
      params.set(GROUP_PARAM, selectedGroup()!);
      params.set(VIEW_MODE_PARAM, viewMode());

      if (viewMode() === ViewMode.Card) {
        params.set(CLASSIFIED_PARAM, classified());
        params.set(SORT_BY_PARAM, sorted());
        params.set(SORT_DIRECTION_PARAM, sortDirection());
      }
    }

    const filtersParams = getFiltersQuery(filters);
    for (const [key, val] of filtersParams.entries()) {
      if (key === FilterCategory.Extra) {
        params.append(val, 'true');
      } else {
        params.append(key, val);
      }
    }

    const query = params.toString();

    // Keep hash if exists
    navigate(`${location.pathname}${query === '' ? '' : `?${query}`}${location.hash !== '' ? location.hash : ''}`, {
      state: location.state,
      replace: true,
      scroll: true, // default
    });
  };

  const updateHash = (hash?: string) => {
    const params = new URLSearchParams(location.search);
    params.set(GROUP_PARAM, selectedGroup() || 'default');
    params.set(VIEW_MODE_PARAM, ViewMode.Card);
    params.set(CLASSIFIED_PARAM, classified());
    params.set(SORT_BY_PARAM, sorted());
    params.set(SORT_DIRECTION_PARAM, sortDirection());

    navigate(`${location.pathname}?${params.toString()}${!isUndefined(hash) ? `#${hash}` : ''}`, {
      replace: true,
      scroll: false,
    });
  };

  async function fetchItems() {
    try {
      const fullData = await itemsDataGetter.getAll();
      setLandscapeData(fullData);
      // Full data is only applied when card view is active or filters are not empty to avoid re-render grid
      // After this when filters are applied or view mode changes, we use fullData if available
      if (viewMode() === ViewMode.Card || checkIfFullDataRequired()) {
        const data = itemsDataGetter.queryItems(activeFilters(), selectedGroup() || ALL_OPTION, classified()!);
        prepareData(data.grid as GroupData);
        setCardData(data.card);
        setCardMenu(data.menu);

        setFullDataApplied(true);
        setReadyData(true);
      }
    } catch {
      setLandscapeData(undefined);
    }
  }

  createEffect(
    on(fullDataReady, () => {
      if (fullDataReady()) {
        fetchItems();
      }
    })
  );

  createEffect(
    on(selectedGroup, () => {
      if (groupsData()) {
        const currentNumber = countVisibleItems(groupsData()![selectedGroup() || ALL_OPTION]);
        if (currentNumber === 0) {
          finishLoading();
        }
        setNumVisibleItems(currentNumber);
      }
    })
  );

  createEffect(
    on(classified, () => {
      const data = itemsDataGetter.queryItems(activeFilters(), selectedGroup() || ALL_OPTION, classified()!);
      setCardData(data.card);
      setCardMenu(data.menu);
    })
  );

  createEffect(
    on(viewMode, () => {
      if (viewMode() === ViewMode.Card && !fullDataApplied() && !isUndefined(landscapeData())) {
        if (!isEmpty(activeFilters())) {
          applyFilters(activeFilters());
        } else {
          const data = itemsDataGetter.queryItems({}, selectedGroup() || ALL_OPTION, classified()!);
          prepareData(data.grid as GroupData);
          setCardData(data.card);
          setCardMenu(data.menu);
        }
      }
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
    let tmpActiveFilters: string[] = ({ ...activeFilters() }[name] || []).filter((f: string) => f !== value);
    if (name === FilterCategory.Maturity) {
      if (isEqual(tmpActiveFilters, [window.baseDS.foundation.toLowerCase()])) {
        tmpActiveFilters = [];
      }
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

  const resetFilter = (name: FilterCategory) => {
    updateActiveFilters(name, []);
  };

  const applyFilters = (newFilters: ActiveFilters) => {
    setActiveFilters(newFilters);
    const data = itemsDataGetter.queryItems(activeFilters(), selectedGroup() || ALL_OPTION, classified()!);
    prepareData(data.grid as GroupData);
    setCardData(data.card);
    setCardMenu(data.menu);
    if (!isUndefined(landscapeData())) {
      setFullDataApplied(true);
    }
    updateFiltersQueryString(newFilters);
  };

  const handler = () => {
    if (!isUndefined(containerRef())) {
      const gap = !isUndefined(point()) && SMALL_DEVICES_BREAKPOINTS.includes(point()!) ? 0 : TITLE_GAP;
      const width = containerRef()!.offsetWidth - gap;
      if (width > 0) {
        updateContainerGridWidth(containerRef()!.offsetWidth - gap);
      }

      // Avoid groups section with multiline
      if (!SMALL_DEVICES_BREAKPOINTS.includes(point()!)) {
        const controls = viewMode() === ViewMode.Card ? CONTROLS_CARD_WIDTH : CONTROLS_WIDTH;
        if (!isUndefined(controlsGroupWrapper())) {
          if (controlsGroupWrapperWidth() === 0) {
            const controlsGWidth = controlsGroupWrapper()!.clientWidth;
            if (controlsGWidth + controls > containerRef()!.clientWidth) {
              setVisibleSelectForGroups(true);
            } else {
              setVisibleSelectForGroups(false);
            }
            setControlsGroupWrapperWidth(controlsGWidth);
          } else {
            if (controlsGroupWrapperWidth() + controls > containerRef()!.clientWidth) {
              setVisibleSelectForGroups(true);
            } else {
              setVisibleSelectForGroups(false);
            }
          }
        }
      }
    }
  };

  createEffect(
    on(from, () => {
      // When we click on header logo, we reset filters
      if (from() === 'logo-header') {
        resetFilters();
      }
    })
  );

  onMount(() => {
    setReadyData(!checkIfFullDataRequired());

    if (from() === 'header') {
      scrollToTop(false);
    }

    window.addEventListener(
      'resize',
      // eslint-disable-next-line solid/reactivity
      throttle(() => handler(), 400),
      { passive: true }
    );
    handler();

    if (fullDataReady()) {
      fetchItems();
    }

    if (some(window.baseDS.items, (i: Item) => !isUndefined(i.maturity))) {
      setAvailableMaturityClassification(true);
    }

    const data = itemsDataGetter.queryItems(activeFilters(), selectedGroup() || ALL_OPTION, classified()!);
    setGroupsData(data.grid);
    setCardData(data.card);
    setCardMenu(data.menu);
    checkIfVisibleLoading(viewMode(), selectedGroup());
  });

  onCleanup(() => {
    window.removeEventListener('resize', handler);
  });

  return (
    <Show when={!isUndefined(groupsData())}>
      <main class="flex-grow-1 container-fluid px-3 px-lg-4 mainPadding position-relative">
        <div class="d-flex flex-column flex-lg-row my-2 my-md-3 py-1">
          <div class="d-flex flex-row align-items-center mb-1 mb-md-0">
            <div class="d-block d-lg-none ms-0 ms-lg-4">
              <button
                title="Index"
                class={`position-relative btn btn-sm btn-secondary text-white btn-sm rounded-0 py-0 me-1 me-lg-4 btnIconMobile ${styles.mobileToCBtn}`}
                onClick={() => setOpenMenuStatus(true)}
                disabled={numVisibleItems() === 0}
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
              classified={classified()}
              sorted={sorted()}
              sortDirection={sortDirection()}
              updateQueryString={updateQueryString}
              setClassified={setClassified}
              setSorted={setSorted}
              setSortDirection={setSortDirection}
              availableMaturityClassification={availableMaturityClassification()}
            />

            <div class="d-none d-lg-flex align-items-center">
              <Show when={!isUndefined(props.initialData.groups)}>
                <div class={styles.btnGroupLegend}>
                  <small class="text-muted me-2">GROUP:</small>
                </div>
                <div
                  ref={setControlsGroupWrapper}
                  classList={{ 'd-flex': !visibleSelectForGroups(), 'd-none': visibleSelectForGroups() }}
                >
                  <div class={`btn-group btn-group-sm me-4 ${styles.btnGroup}`}>
                    <Show when={viewMode() === ViewMode.Card}>
                      <button
                        title="All"
                        class={`btn btn-outline-primary btn-sm rounded-0 fw-semibold text-nowrap ${styles.navLink}`}
                        classList={{
                          [`active text-white ${styles.active}`]:
                            !isUndefined(selectedGroup()) && ALL_OPTION === selectedGroup(),
                        }}
                        onClick={() => {
                          checkIfVisibleLoading(viewMode(), ALL_OPTION);
                          updateQueryString(GROUP_PARAM, ALL_OPTION);
                          setSelectedGroup(ALL_OPTION);
                        }}
                      >
                        All
                      </button>
                    </Show>
                    <For each={props.initialData.groups}>
                      {(group: Group) => {
                        return (
                          <button
                            title={`Group: ${group.name}`}
                            class={`btn btn-outline-primary btn-sm rounded-0 fw-semibold text-nowrap ${styles.navLink}`}
                            classList={{
                              [`active text-white ${styles.active}`]:
                                !isUndefined(selectedGroup()) && group.normalized_name === selectedGroup(),
                            }}
                            onClick={() => {
                              checkIfVisibleLoading(viewMode(), group.normalized_name);
                              updateQueryString(GROUP_PARAM, group.normalized_name);
                              setSelectedGroup(group.normalized_name);
                            }}
                          >
                            {group.name}
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </div>
                {/* Only visible when btn grouped for groups overflows wrapper */}
                <div classList={{ 'd-none': !visibleSelectForGroups(), 'd-flex': visibleSelectForGroups() }}>
                  <select
                    id="desktop-group"
                    class={`form-select form-select-sm border-primary text-primary rounded-0 me-4 ${styles.desktopSelect}`}
                    value={selectedGroup() || props.initialData.groups![0].normalized_name}
                    aria-label="Group"
                    onChange={(e) => {
                      const group = e.currentTarget.value;
                      updateQueryString(GROUP_PARAM, group);
                      setSelectedGroup(group);
                    }}
                  >
                    <For each={props.initialData.groups}>
                      {(group: Group) => {
                        return <option value={group.normalized_name}>{group.name}</option>;
                      }}
                    </For>
                  </select>
                </div>
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
              <For each={Object.keys(ViewMode)}>
                {(mode) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const value = (ViewMode as any)[mode];

                  return (
                    <button
                      title={`View mode: ${mode}`}
                      type="button"
                      class="btn btn-outline-primary rounded-0 fw-semibold"
                      classList={{
                        'active text-white': value === viewMode(),
                      }}
                      onClick={() => {
                        if (!(value === viewMode())) {
                          checkIfVisibleLoading(value, selectedGroup());
                          updateQueryString(VIEW_MODE_PARAM, value);
                          setViewMode(value);
                        }
                      }}
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
                        title="Increase zoom level"
                        class="btn btn-outline-primary rounded-0 fw-semibold"
                        disabled={zoom() === 0}
                        onClick={() => {
                          updateZoom(zoom() - 1);
                        }}
                      >
                        <div class={styles.btnSymbol}>-</div>
                      </button>
                      <button
                        title="Decrease zoom level"
                        class="btn btn-outline-primary rounded-0 fw-semibold"
                        disabled={zoom() === 10}
                        onClick={() => {
                          updateZoom(zoom() + 1);
                        }}
                      >
                        <div class={styles.btnSymbol}>+</div>
                      </button>
                    </div>
                  </div>
                </Match>
                <Match when={viewMode() === ViewMode.Card}>
                  <div class={styles.btnGroupLegend}>
                    <small class="text-muted text-uppercase me-2">Classified:</small>
                  </div>
                  <select
                    id="classified"
                    class={`form-select form-select-sm border-primary text-primary rounded-0 me-4 ${styles.desktopSelect} ${styles.miniSelect}`}
                    value={classified()}
                    aria-label="Classified"
                    onChange={(e) => {
                      const classifiedOpt = e.currentTarget.value as ClassifiedOption;
                      updateQueryString(CLASSIFIED_PARAM, classifiedOpt);
                      setClassified(classifiedOpt);
                    }}
                  >
                    <For each={Object.keys(ClassifiedOption)}>
                      {(opt: string) => {
                        if (opt === ClassifiedOption.Maturity && !availableMaturityClassification()) return null;

                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const value = (ClassifiedOption as any)[opt];
                        return <option value={value}>{opt}</option>;
                      }}
                    </For>
                  </select>
                  <div class={styles.btnGroupLegend}>
                    <small class="text-muted text-uppercase me-2">Sort:</small>
                  </div>
                  <select
                    id="sorted"
                    class={`form-select form-select-sm border-primary text-primary rounded-0 ${styles.desktopSelect} ${styles.miniSelect}`}
                    value={`${sorted()}_${sortDirection()}`}
                    aria-label="Sort"
                    onChange={(e) => {
                      const sortValue = e.currentTarget.value;
                      const sortOpt = sortValue.split('_');
                      updateQueryString('sort', sortValue);

                      batch(() => {
                        setSorted(sortOpt[0] as SortOption);
                        setSortDirection(sortOpt[1] as SortDirection);
                      });
                    }}
                  >
                    <option value="" />
                    <For each={Object.keys(SortOption)}>
                      {(opt: string) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const value = (SortOption as any)[opt];

                        return (
                          <For each={Object.values(SortDirection)}>
                            {(direction: string) => {
                              return (
                                <option value={`${value}_${direction}`}>
                                  {(SORT_OPTION_LABEL as never)[value]} ({direction})
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
          </div>
          <Show when={!isUndefined(props.initialData.groups)}>
            <div class="d-flex d-lg-none align-items-center mt-3 mt-md-4 mt-lg-0 mb-2 mb-md-3 mb-lg-0">
              <div class={`d-none d-md-block ${styles.btnGroupLegend}`}>
                <small class="text-muted me-2">GROUP:</small>
              </div>
              <select
                id="mobile-group"
                class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                value={selectedGroup() || props.initialData.groups![0].normalized_name}
                aria-label="Group"
                onChange={(e) => {
                  const group = e.currentTarget.value;
                  updateQueryString(GROUP_PARAM, group);
                  setSelectedGroup(group);
                }}
              >
                {/* Do not display All option for mobile */}
                <For each={props.initialData.groups}>
                  {(group: Group) => {
                    return <option value={group.normalized_name}>{group.name}</option>;
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
            resetFilter={resetFilter}
            resetFilters={resetFilters}
            removeFilter={removeFilter}
          />
        </div>

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

        <Show when={!isUndefined(point())}>
          <Switch>
            <Match when={SMALL_DEVICES_BREAKPOINTS.includes(point()!)}>
              <Show when={readyData() && !isUndefined(groupsData())}>
                <div ref={setContainerRef}>
                  <ExploreMobileIndex
                    openMenuStatus={openMenuStatus()}
                    closeMenuStatus={closeMenuStatus}
                    data={{ ...groupsData() }[selectedGroup() || ALL_OPTION]}
                    cardData={{ ...cardData() }[selectedGroup() || ALL_OPTION]}
                    menu={!isUndefined(cardMenu()) ? cardMenu()![selectedGroup() || ALL_OPTION] : undefined}
                    categories_overridden={props.initialData.categories_overridden}
                    finishLoading={finishLoading}
                    classified={classified()}
                    sorted={sorted()}
                    direction={sortDirection()}
                  />
                </div>
              </Show>
            </Match>
            <Match when={!SMALL_DEVICES_BREAKPOINTS.includes(point()!)}>
              <div class="position-relative d-flex w-100 pt-1">
                <div
                  ref={setContainerRef}
                  style={{
                    '--card-size-width': `${ZOOM_LEVELS[zoom()][0]}px`,
                    '--card-size-height': `${ZOOM_LEVELS[zoom()][1]}px`,
                  }}
                  class={`d-flex flex-column flex-grow-1 w-100 ${styles.container} zoom-${zoom()}`}
                  classList={{ [styles.loadingContent]: visibleLoading() }}
                >
                  {(visibleLoading() || !readyData()) && (
                    <Loading spinnerClass="position-fixed top-50 start-50" transparentBg />
                  )}

                  <Show when={readyData()}>
                    <Show
                      when={!isUndefined(props.initialData.groups)}
                      fallback={
                        <Content
                          data={{ ...groupsData() }[ALL_OPTION]}
                          cardData={!isUndefined(cardData()) ? cardData()![ALL_OPTION] : undefined}
                          menu={!isUndefined(cardMenu()) ? cardMenu()![ALL_OPTION] : undefined}
                          categories_overridden={props.initialData.categories_overridden}
                          classified={classified()}
                          sorted={sorted()}
                          direction={sortDirection()}
                          updateHash={updateHash}
                          finishLoading={finishLoading}
                        />
                      }
                    >
                      <div class={viewMode() === ViewMode.Card ? 'd-block' : 'd-none'}>
                        <CardCategory
                          initialIsVisible={viewMode() === ViewMode.Card && selectedGroup() === ALL_OPTION}
                          data={!isUndefined(cardData()) ? cardData()![ALL_OPTION] : undefined}
                          menu={!isUndefined(cardMenu()) ? cardMenu()![ALL_OPTION] : undefined}
                          group={ALL_OPTION}
                          classified={classified()}
                          sorted={sorted()}
                          direction={sortDirection()}
                          updateHash={updateHash}
                          finishLoading={finishLoading}
                        />
                      </div>
                      <For each={props.initialData.groups}>
                        {(group: Group) => {
                          return (
                            <Content
                              group={group.normalized_name}
                              initialSelectedGroup={selectedGroup()}
                              data={{ ...groupsData() }[group.normalized_name]}
                              cardData={!isUndefined(cardData()) ? cardData()![group.normalized_name] : undefined}
                              menu={!isUndefined(cardMenu()) ? cardMenu()![group.normalized_name] : undefined}
                              categories_overridden={props.initialData.categories_overridden}
                              classified={classified()}
                              sorted={sorted()}
                              direction={sortDirection()}
                              updateHash={updateHash}
                              finishLoading={finishLoading}
                            />
                          );
                        }}
                      </For>
                    </Show>

                    {/* <Show when={fullDataApplied()}>
                      <div class={viewMode() === ViewMode.Card ? 'd-block' : 'd-none'}>
                        <CardCategory
                          initialIsVisible={viewMode() === ViewMode.Card}
                          data={cardData}
                          menu={cardMenu()}
                          group={selectedGroup() || ALL_OPTION}
                          classified={classified()}
                          sorted={sorted()}
                          direction={sortDirection()}
                          updateHash={updateHash}
                          finishLoading={finishLoading}
                        />
                      </div>
                    </Show> */}
                  </Show>
                </div>
              </div>
            </Match>
          </Switch>
        </Show>
      </main>
      <Footer />
    </Show>
  );
};

export default Explore;

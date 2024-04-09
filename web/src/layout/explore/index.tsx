import { useLocation, useNavigate, useSearchParams } from '@solidjs/router';
import compact from 'lodash/compact';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import throttle from 'lodash/throttle';
import uniq from 'lodash/uniq';
import { batch, createEffect, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';

import {
  ALL_OPTION,
  BASE_PATH,
  CLASSIFY_PARAM,
  DEFAULT_CLASSIFY,
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
  ClassifyOption,
  FilterCategory,
  Group,
  Item,
  SortDirection,
  SortOption,
  StateContent,
  SVGIconKind,
  ViewMode,
} from '../../types';
import getClassifyAndSortOptions, { ClassifyAndSortOptions } from '../../utils/getClassifyAndSortOptions';
import getFoundationNameLabel from '../../utils/getFoundationNameLabel';
import getNormalizedName from '../../utils/getNormalizedName';
import itemsDataGetter, { GroupData } from '../../utils/itemsDataGetter';
import scrollToTop from '../../utils/scrollToTop';
import ActiveFiltersList from '../common/ActiveFiltersList';
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

const TITLE_GAP = 40;
const CONTROLS_WIDTH = 102 + 49 + 160 + 101 + 24; // Filters + Group legend + View Mode + Zoom + Right margin
const CONTROLS_CARD_WIDTH = CONTROLS_WIDTH + 0 + 435 - 101; // + Classify/Sort - Zoom
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
  const [fullDataApplied, setFullDataApplied] = createSignal<boolean>(false);
  const [openMenuStatus, setOpenMenuStatus] = createSignal<boolean>(false);
  const [visibleSelectForGroups, setVisibleSelectForGroups] = createSignal<boolean>(false);
  const [classify, setClassify] = createSignal<ClassifyOption>(
    searchParams[CLASSIFY_PARAM] ? (searchParams[CLASSIFY_PARAM] as ClassifyOption) : DEFAULT_CLASSIFY
  );
  const [sorted, setSorted] = createSignal<SortOption>(
    searchParams[SORT_BY_PARAM] ? (searchParams[SORT_BY_PARAM] as SortOption) : DEFAULT_SORT
  );
  const [sortDirection, setSortDirection] = createSignal<SortDirection>(
    searchParams[SORT_DIRECTION_PARAM] ? (searchParams[SORT_DIRECTION_PARAM] as SortDirection) : DEFAULT_SORT_DIRECTION
  );
  const openMenuTOCFromHeader = useMobileTOCStatus();
  const setMenuTOCFromHeader = useSetMobileTOCStatus();
  const [classifyAndSortOptions, setClassifyAndSortOptions] = createSignal<{
    [key: string]: ClassifyAndSortOptions;
  }>({});
  const [classifyOptions, setClassifyOptions] = createSignal<ClassifyOption[]>(Object.values(ClassifyOption));
  const [sortOptions, setSortOptions] = createSignal<SortOption[]>(Object.values(SortOption));
  const [numItems, setNumItems] = createSignal<{ [key: string]: number }>({});

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

  const checkVisibleItemsNumber = (numItemsPerGroup: { [key: string]: number }) => {
    setNumItems(numItemsPerGroup);
    setNumVisibleItems(numItemsPerGroup[selectedGroup() || ALL_OPTION]);
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

    batch(() => {
      const data = itemsDataGetter.queryItems(currentFilters, selectedGroup() || ALL_OPTION, classify()!);
      checkVisibleItemsNumber(data.numItems);
      setGroupsData(data.grid);
      setCardData(data.card);
      setCardMenu(data.menu);
    });

    return currentFilters;
  };

  // eslint-disable-next-line solid/reactivity
  const [activeFilters, setActiveFilters] = createSignal<ActiveFilters>(getActiveFiltersFromUrl());

  const getHash = (): string | undefined => {
    let hash: string = '';
    if (viewMode() === ViewMode.Card && !isUndefined(cardMenu()) && !isEmpty(cardMenu())) {
      const selectedGroupMenu = cardMenu()![selectedGroup() || ALL_OPTION];
      if (selectedGroupMenu && !isEmpty(selectedGroupMenu)) {
        const title = Object.keys(selectedGroupMenu)[0];
        if (title) {
          const subtitle = selectedGroupMenu[title][0];
          hash = `#${getNormalizedName({ title: title, subtitle: subtitle, grouped: true })}`;
        }
      }
    }
    return hash;
  };

  const checkIfAvaibleClassificationInGroup = (group: string): boolean => {
    return classifyAndSortOptions()[group].classify.includes(classify());
  };

  const checkIfAvaibleSortOptionInGroup = (group: string): boolean => {
    return classifyAndSortOptions()[group].sort.includes(sorted());
  };

  const closeMenuStatus = () => {
    setOpenMenuStatus(false);
    setMenuTOCFromHeader(false);
  };

  const updateQueryString = (param: string, value: string) => {
    const updatedSearchParams = new URLSearchParams(location.search);
    const currentGroup = param === GROUP_PARAM ? value : selectedGroup() || ALL_OPTION;
    const classifyOption = checkIfAvaibleClassificationInGroup(currentGroup) ? classify() : DEFAULT_CLASSIFY;
    const sortOption = checkIfAvaibleSortOptionInGroup(currentGroup) ? sorted() : DEFAULT_SORT;
    const sortDirectionOpt = checkIfAvaibleSortOptionInGroup(currentGroup) ? sortDirection() : DEFAULT_SORT_DIRECTION;

    // Reset classify and sort when view mode or group changes
    if ([VIEW_MODE_PARAM, GROUP_PARAM].includes(param)) {
      // Remove all filters from current searchparams
      Object.values(FilterCategory).forEach((f: string) => {
        updatedSearchParams.delete(f);
      });
      EXTRA_FILTERS.forEach((f: string) => {
        updatedSearchParams.delete(f);
      });

      batch(() => {
        setClassify(classifyOption);
        setSorted(sortOption);
        setSortDirection(sortDirectionOpt);

        if (param === GROUP_PARAM) {
          setClassifyOptions(classifyAndSortOptions()[value].classify);
          setSortOptions(classifyAndSortOptions()[value].sort);
          // Reset filters when group changes
          resetFilters();
          scrollToTop(false);
        }
      });
    }

    if (param === 'sort') {
      const sortOpt = value.split('_');
      updatedSearchParams.set(SORT_BY_PARAM, sortOpt[0]);
      updatedSearchParams.set(SORT_DIRECTION_PARAM, sortOpt[1]);
    } else {
      updatedSearchParams.set(param, value);
    }
    if (param === GROUP_PARAM && viewMode() === ViewMode.Card) {
      updatedSearchParams.set(CLASSIFY_PARAM, classifyOption);
      updatedSearchParams.set(SORT_BY_PARAM, sortOption);
      updatedSearchParams.set(SORT_DIRECTION_PARAM, sortDirectionOpt);

      if (location.search === '') {
        updatedSearchParams.set(VIEW_MODE_PARAM, viewMode());
      }
    }
    if (param === VIEW_MODE_PARAM) {
      if (value === ViewMode.Grid) {
        updatedSearchParams.delete(CLASSIFY_PARAM);
        updatedSearchParams.delete(SORT_BY_PARAM);
        updatedSearchParams.delete(SORT_DIRECTION_PARAM);
        if (selectedGroup() === ALL_OPTION && !isUndefined(window.baseDS.groups)) {
          const firstGroup = props.initialData.groups![0].normalized_name;
          updatedSearchParams.set(GROUP_PARAM, firstGroup);
          setSelectedGroup(firstGroup);
        }
      } else {
        updatedSearchParams.set(CLASSIFY_PARAM, classifyOption);
        updatedSearchParams.set(SORT_BY_PARAM, sortOption);
        updatedSearchParams.set(SORT_DIRECTION_PARAM, DEFAULT_SORT_DIRECTION);
      }
    }

    navigate(`${BASE_PATH}/?${updatedSearchParams.toString()}${getHash()}`, {
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
    // Remove all filters from current searchparams
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
        params.set(CLASSIFY_PARAM, classify());
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

    navigate(`${BASE_PATH}/${query === '' ? '' : `?${query}`}${getHash()}`, {
      state: location.state,
      replace: true,
      scroll: true, // default
    });
  };

  async function fetchItems() {
    try {
      const fullData = await itemsDataGetter.getAll();
      setLandscapeData(fullData);
      const options = getClassifyAndSortOptions();
      setClassifyAndSortOptions(options);
      setClassifyOptions(options[selectedGroup() || ALL_OPTION].classify);
      setSortOptions(options[selectedGroup() || ALL_OPTION].sort);
      // Full data is only applied when card view is active or filters are not empty to avoid re-render grid
      // After this when filters are applied or view mode changes, we use fullData if available
      if (viewMode() === ViewMode.Card || checkIfFullDataRequired()) {
        batch(() => {
          const data = itemsDataGetter.queryItems(activeFilters(), selectedGroup() || ALL_OPTION, classify()!);
          checkVisibleItemsNumber(data.numItems);
          setGroupsData(data.grid);
          setCardData(data.card);
          setCardMenu(data.menu);

          setFullDataApplied(true);
          setReadyData(true);
        });

        if (viewMode() === ViewMode.Card) {
          navigate(`${BASE_PATH}/${location.search}${location.hash !== '' ? location.hash : getHash()}`, {
            state: location.state,
            replace: true,
            scroll: true, // default
          });
        }
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
        setNumVisibleItems(numItems()[selectedGroup() || ALL_OPTION]);
      }
    })
  );

  createEffect(
    on(classify, () => {
      batch(() => {
        const data = itemsDataGetter.queryItems(activeFilters(), selectedGroup() || ALL_OPTION, classify()!);
        setCardData(data.card);
        setCardMenu(data.menu);
      });
    })
  );

  createEffect(
    on(viewMode, () => {
      if (viewMode() === ViewMode.Card && !fullDataApplied() && !isUndefined(landscapeData())) {
        if (!isEmpty(activeFilters())) {
          applyFilters(activeFilters());
        } else {
          batch(() => {
            const data = itemsDataGetter.queryItems({}, selectedGroup() || ALL_OPTION, classify()!);
            checkVisibleItemsNumber(data.numItems);
            setGroupsData(data.grid);
            setCardData(data.card);
            setCardMenu(data.menu);
          });
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
    batch(() => {
      setActiveFilters(newFilters);
      const data = itemsDataGetter.queryItems(newFilters, selectedGroup() || ALL_OPTION, classify()!);
      checkVisibleItemsNumber(data.numItems);
      setGroupsData(data.grid);
      setCardData(data.card);
      setCardMenu(data.menu);
    });

    updateFiltersQueryString(newFilters);

    if (!isUndefined(landscapeData())) {
      setFullDataApplied(true);
    }
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
              classify={classify()}
              sorted={sorted()}
              sortDirection={sortDirection()}
              updateQueryString={updateQueryString}
              setClassify={setClassify}
              setSorted={setSorted}
              setSortDirection={setSortDirection}
              classifyOptions={classifyOptions()}
              sortOptions={sortOptions()}
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
                              setSelectedGroup(group.normalized_name);
                              updateQueryString(GROUP_PARAM, group.normalized_name);
                            }}
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
                          [`active text-white ${styles.active}`]:
                            !isUndefined(selectedGroup()) && ALL_OPTION === selectedGroup(),
                        }}
                        onClick={() => {
                          setSelectedGroup(ALL_OPTION);
                          updateQueryString(GROUP_PARAM, ALL_OPTION);
                        }}
                      >
                        All
                      </button>
                    </Show>
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
                      setSelectedGroup(group);
                      updateQueryString(GROUP_PARAM, group);
                    }}
                  >
                    <For each={props.initialData.groups}>
                      {(group: Group) => {
                        return <option value={group.normalized_name}>{group.name}</option>;
                      }}
                    </For>
                    <Show when={viewMode() === ViewMode.Card}>
                      <option value={ALL_OPTION}>All</option>
                    </Show>
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
                          setViewMode(value);
                          updateQueryString(VIEW_MODE_PARAM, value);
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
                    <small class="text-muted text-uppercase me-2">Classify:</small>
                  </div>
                  <select
                    id="classify"
                    class={`form-select form-select-sm border-primary text-primary rounded-0 me-4 ${styles.desktopSelect} ${styles.miniSelect}`}
                    value={classify()}
                    aria-label="Classify"
                    onChange={(e) => {
                      const classifyOpt = e.currentTarget.value as ClassifyOption;
                      setClassify(classifyOpt);
                      updateQueryString(CLASSIFY_PARAM, classifyOpt);
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
                    aria-label="Sort"
                    onChange={(e) => {
                      const sortValue = e.currentTarget.value;
                      const sortOpt = sortValue.split('_');

                      batch(() => {
                        setSorted(sortOpt[0] as SortOption);
                        setSortDirection(sortOpt[1] as SortDirection);
                      });
                      updateQueryString('sort', sortValue);
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
                  setSelectedGroup(group);
                  updateQueryString(GROUP_PARAM, group);
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
                    classify={classify()}
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
                >
                  <Show when={readyData()}>
                    <Show
                      when={!isUndefined(props.initialData.groups)}
                      fallback={
                        <Content
                          data={{ ...groupsData() }[ALL_OPTION]}
                          cardData={!isUndefined(cardData()) ? cardData()![ALL_OPTION] : undefined}
                          menu={!isUndefined(cardMenu()) ? cardMenu()![ALL_OPTION] : undefined}
                          categories_overridden={props.initialData.categories_overridden}
                          classify={classify()}
                          sorted={sorted()}
                          direction={sortDirection()}
                        />
                      }
                    >
                      <div
                        class={viewMode() === ViewMode.Card && selectedGroup() === ALL_OPTION ? 'd-block' : 'd-none'}
                      >
                        <CardCategory
                          initialIsVisible={viewMode() === ViewMode.Card && selectedGroup() === ALL_OPTION}
                          data={!isUndefined(cardData()) ? cardData()![ALL_OPTION] : undefined}
                          menu={!isUndefined(cardMenu()) ? cardMenu()![ALL_OPTION] : undefined}
                          group={ALL_OPTION}
                          classify={classify()}
                          sorted={sorted()}
                          direction={sortDirection()}
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
        </Show>
      </main>
      <Footer />
    </Show>
  );
};

export default Explore;

import { useLocation, useNavigate, useSearchParams } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import throttle from 'lodash/throttle';
import { createEffect, createMemo, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js';

import { GROUP_PARAM, SMALL_DEVICES_BREAKPOINTS, VIEW_MODE_PARAM, ZOOM_LEVELS } from '../../data';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import {
  ActiveFilters,
  BaseData,
  BaseItem,
  FilterCategory,
  Group,
  Item,
  StateContent,
  SVGIconKind,
  ViewMode,
} from '../../types';
import countVisibleItems from '../../utils/countVisibleItems';
import filterData from '../../utils/filterData';
import itemsDataGetter from '../../utils/itemsDataGetter';
import prepareData, { GroupData } from '../../utils/prepareData';
import scrollToTop from '../../utils/scrollToTop';
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
import Content from './Content';
import styles from './Explore.module.css';
import Filters from './filters';
import ActiveFiltersList from './filters/ActiveFiltersList';
import ExploreMobileIndex from './mobile/ExploreMobileIndex';

interface Props {
  initialData: BaseData;
}

export type LoadedContent = {
  [key in ViewMode]: string[];
};

const TITLE_GAP = 40;

const Explore = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { point } = useBreakpointDetect();
  const state = createMemo(() => location.state || {});
  const from = () => (state() as StateContent).from || undefined;

  const fullDataReady = useFullDataReady();
  const zoom = useZoomLevel();
  const updateZoom = useSetZoomLevel();
  const viewMode = useViewMode();
  const setViewMode = useSetViewMode();
  const selectedGroup = useGroupActive();
  const setSelectedGroup = useSetGroupActive();
  const updateContainerGridWidth = useSetGridWidth();

  const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
  const [landscapeData, setLandscapeData] = createSignal<Item[]>();
  const [visibleItems, setVisibleItems] = createSignal<(BaseItem | Item)[]>(props.initialData.items);
  const [activeFilters, setActiveFilters] = createSignal<ActiveFilters>({});
  const [groupsData, setGroupsData] = createSignal<GroupData>(prepareData(props.initialData, props.initialData.items));
  const [numVisibleItems, setNumVisibleItems] = createSignal<number>();
  const [visibleLoading, setVisibleLoading] = createSignal<boolean>(false);
  const [fullDataApplied, setFullDataApplied] = createSignal<boolean>(false);
  const [openMenuStatus, setOpenMenuStatus] = createSignal<boolean>(false);
  const [loaded, setLoaded] = createSignal<LoadedContent>({ grid: [], card: [] });
  const openMenuTOCFromHeader = useMobileTOCStatus();
  const setMenuTOCFromHeader = useSetMobileTOCStatus();
  const onSmallDevice = !isUndefined(point()) && SMALL_DEVICES_BREAKPOINTS.includes(point()!);

  const checkIfVisibleLoading = (viewMode?: ViewMode, groupName?: string) => {
    // Not for small devices
    if (!onSmallDevice) {
      if (viewMode) {
        const group = groupName || selectedGroup() || 'default';
        if (!loaded()[viewMode].includes(groupName || 'default')) {
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

  const finishLoading = () => {
    setVisibleLoading(false);
  };

  const closeMenuStatus = () => {
    setOpenMenuStatus(false);
    setMenuTOCFromHeader(false);
  };

  const updateQueryString = (param: string, value: string) => {
    const updatedSearchParams = new URLSearchParams(searchParams);
    updatedSearchParams.delete(param);
    updatedSearchParams.set(param, value);

    navigate(`${location.pathname}?${updatedSearchParams.toString()}`, {
      state: location.state,
      replace: true,
      scroll: true, // default
    });
  };

  const updateHash = (hash?: string) => {
    const updatedSearchParams = new URLSearchParams();
    updatedSearchParams.set(VIEW_MODE_PARAM, ViewMode.Card);
    updatedSearchParams.set(GROUP_PARAM, selectedGroup() || 'default');

    navigate(`${location.pathname}?${updatedSearchParams.toString()}${!isUndefined(hash) ? `#${hash}` : ''}`, {
      replace: true,
      scroll: false,
    });
  };

  async function fetchItems() {
    try {
      const fullData = await itemsDataGetter.getAll();
      setLandscapeData(fullData);
      // Full data is only applied when card view is active to avoid re-render grid
      // When filters are applied or view mode changes, we use fullData if available
      if (viewMode() === ViewMode.Card) {
        setVisibleItems(fullData);
        setFullDataApplied(true);
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
    on(visibleItems, () => {
      const newData = prepareData(props.initialData, visibleItems());

      const currentNumber = countVisibleItems(newData[selectedGroup() || 'default']);
      if (currentNumber === 0) {
        finishLoading();
      }
      setNumVisibleItems(currentNumber);
      setGroupsData(newData);
    })
  );

  createEffect(
    on(selectedGroup, () => {
      const currentNumber = countVisibleItems(groupsData()[selectedGroup() || 'default']);
      if (currentNumber === 0) {
        finishLoading();
      }
      setNumVisibleItems(currentNumber);
    })
  );

  createEffect(
    on(viewMode, () => {
      if (viewMode() === ViewMode.Card && !fullDataApplied() && !isUndefined(landscapeData())) {
        if (!isEmpty(activeFilters())) {
          applyFilters(activeFilters());
        } else {
          setVisibleItems(landscapeData()!);
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

  const applyFilters = (newFilters: ActiveFilters) => {
    setActiveFilters(newFilters);
    setVisibleItems(filterData(landscapeData() || props.initialData.items, newFilters));
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
    }
  };

  onMount(() => {
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
            />

            <div class="d-none d-lg-flex align-items-center">
              <Show when={!isUndefined(props.initialData.groups)}>
                <div class={styles.btnGroupLegend}>
                  <small class="text-muted me-2">GROUPS:</small>
                </div>
                <div class={`btn-group btn-group-sm me-4 ${styles.btnGroup}`}>
                  <For each={props.initialData.groups}>
                    {(group: Group) => {
                      return (
                        <button
                          title={`Group: ${group.name}`}
                          class={`btn btn-outline-primary btn-sm rounded-0 fw-semibold ${styles.navLink}`}
                          classList={{
                            [`active text-white ${styles.active}`]:
                              !isUndefined(selectedGroup()) && group.name === selectedGroup(),
                          }}
                          onClick={() => {
                            checkIfVisibleLoading(viewMode(), group.name);
                            updateQueryString(GROUP_PARAM, group.name);
                            setSelectedGroup(group.name);
                          }}
                        >
                          {group.name}
                        </button>
                      );
                    }}
                  </For>
                </div>
              </Show>
            </div>
            <div class={`d-none d-md-block ms-0 ms-md-auto ms-lg-0 ${styles.btnGroupLegend}`}>
              <small class="text-muted me-2">VIEW MODE:</small>
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
              <Show when={viewMode() === ViewMode.Grid}>
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
              </Show>
            </div>
          </div>
          <Show when={!isUndefined(props.initialData.groups)}>
            <div class="d-flex d-lg-none align-items-center mt-3 mt-md-4 mt-lg-0 mb-2 mb-md-3 mb-lg-0">
              <div class={`d-none d-md-block ${styles.btnGroupLegend}`}>
                <small class="text-muted me-2">GROUPS:</small>
              </div>
              <select
                class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                value={selectedGroup() || props.initialData.groups![0].name}
                aria-label="Group"
                onChange={(e) => {
                  const group = e.currentTarget.value;
                  updateQueryString(GROUP_PARAM, group);
                  setSelectedGroup(group);
                }}
              >
                <For each={props.initialData.groups}>
                  {(group: Group) => {
                    return <option value={group.name}>{group.name}</option>;
                  }}
                </For>
              </select>
            </div>
          </Show>
        </div>

        <div class="d-none d-lg-block">
          <ActiveFiltersList activeFilters={activeFilters()} resetFilters={resetFilters} removeFilter={removeFilter} />
        </div>

        <Show when={numVisibleItems() === 0}>
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
              <div ref={setContainerRef}>
                <ExploreMobileIndex
                  openMenuStatus={openMenuStatus()}
                  closeMenuStatus={closeMenuStatus}
                  data={{ ...groupsData() }[selectedGroup() || 'default']}
                  categories_overridden={props.initialData.categories_overridden}
                  finishLoading={finishLoading}
                />
              </div>
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
                  {visibleLoading() && <Loading spinnerClass="position-fixed top-50 start-50" transparentBg />}

                  <Show
                    when={!isUndefined(props.initialData.groups)}
                    fallback={
                      <Content
                        data={{ ...groupsData() }.default}
                        categories_overridden={props.initialData.categories_overridden}
                        updateHash={updateHash}
                        finishLoading={finishLoading}
                      />
                    }
                  >
                    <For each={props.initialData.groups}>
                      {(group: Group) => {
                        return (
                          <Content
                            group={group.name}
                            initialSelectedGroup={selectedGroup()}
                            data={{ ...groupsData() }[group.name]}
                            categories_overridden={props.initialData.categories_overridden}
                            updateHash={updateHash}
                            finishLoading={finishLoading}
                          />
                        );
                      }}
                    </For>
                  </Show>
                </div>
              </div>
            </Match>
          </Switch>
        </Show>
      </main>
      <Footer logo={window.baseDS.images.footer_logo} />
    </Show>
  );
};

export default Explore;

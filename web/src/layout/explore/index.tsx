import { useLocation, useNavigate, useSearchParams } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import throttle from 'lodash/throttle';
import { createEffect, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js';

import { GROUP_PARAM, VIEW_MODE_PARAM, ZOOM_LEVELS } from '../../data';
import { ActiveFilters, BaseData, BaseItem, FilterCategory, Group, Item, ViewMode } from '../../types';
import countVisibleItems from '../../utils/countVisibleItems';
import filterData from '../../utils/filterData';
import itemsDataGetter from '../../utils/itemsDataGetter';
import prepareData, { GroupData } from '../../utils/prepareData';
import { Loading } from '../common/Loading';
import NoData from '../common/NoData';
import Footer from '../navigation/Footer';
import { useFullDataReady } from '../stores/fullData';
import { useSetGridWidth } from '../stores/gridWidth';
import { useGroupActive, useSetGroupActive } from '../stores/groupActive';
import { useSetViewMode, useViewMode } from '../stores/viewMode';
import { useSetZoomLevel, useZoomLevel } from '../stores/zoom';
import Content from './Content';
import styles from './Explore.module.css';
import Filters from './filters';
import ActiveFiltersList from './filters/ActiveFiltersList';

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
  const [loaded, setLoaded] = createSignal<LoadedContent>({ grid: [], card: [] });

  const checkIfVisibleLoading = (viewMode?: ViewMode, groupName?: string) => {
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
  };

  const finishLoading = () => {
    setTimeout(() => {
      setVisibleLoading(false);
    }, 200);
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

  const removeFilter = (name: FilterCategory, value: string) => {
    const tmpActiveFilters: string[] = ({ ...activeFilters() }[name] || []).filter((f: string) => f !== value);
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
      const width = containerRef()!.offsetWidth - TITLE_GAP;
      if (width > 0) {
        updateContainerGridWidth(containerRef()!.offsetWidth - TITLE_GAP);
      }
    }
  };

  onMount(() => {
    window.addEventListener(
      'resize',
      // eslint-disable-next-line solid/reactivity
      throttle(() => handler(), 400)
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
      <main class="flex-grow-1 container-fluid d-none d-lg-block px-4">
        <div class="d-flex flex-row align-items-center justify-content-between my-3 py-1">
          <div class="d-flex flex-row align-items-center">
            <Filters
              data={props.initialData}
              initialLandscapeData={landscapeData}
              initialSelectedGroup={selectedGroup}
              initialActiveFilters={activeFilters}
              applyFilters={applyFilters}
            />
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
                          // Allow display loading before starting to update the rest of things
                          setTimeout(() => {
                            updateQueryString(GROUP_PARAM, group.name);
                            setSelectedGroup(group.name);
                          }, 5);
                        }}
                      >
                        {group.name}
                      </button>
                    );
                  }}
                </For>
              </div>
            </Show>
            <div class={styles.btnGroupLegend}>
              <small class="text-muted me-2">VIEW MODE:</small>
            </div>
            <div class={`btn-group btn-group-sm me-4 ${styles.btnGroup}`} role="group" aria-label="View mode options">
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
                          // Allow display loading before starting to update the rest of things
                          setTimeout(() => {
                            updateQueryString(VIEW_MODE_PARAM, value);
                            setViewMode(value);
                          }, 5);
                        }
                      }}
                    >
                      {mode}
                    </button>
                  );
                }}
              </For>
            </div>
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

        <ActiveFiltersList activeFilters={activeFilters()} resetFilters={resetFilters} removeFilter={removeFilter} />

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
                      finishLoading={finishLoading}
                    />
                  );
                }}
              </For>
            </Show>
          </div>
        </div>
      </main>
      <Footer logo={window.baseDS.images.footer_logo} />
    </Show>
  );
};

export default Explore;

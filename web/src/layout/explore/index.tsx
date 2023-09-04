import classNames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import throttle from 'lodash/throttle';
import { Fragment, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { GROUP_PARAM, VIEW_MODE_PARAM } from '../../data';
import { useBodyScroll } from '../../hooks/useBodyScroll';
import { ActiveFilters, BaseData, BaseItem, FilterCategory, Group, Item, SVGIconKind, ViewMode } from '../../types';
import countVisibleItems from '../../utils/countVisibleItems';
import filterData from '../../utils/filterData';
import itemsDataGetter from '../../utils/itemsDataGetter';
import prepareData, { GroupData } from '../../utils/prepareData';
import { Loading } from '../common/Loading';
import NoData from '../common/NoData';
import SVGIcon from '../common/SVGIcon';
import {
  ActionsContext,
  AppActionsContext,
  FullDataContext,
  FullDataProps,
  ViewModeContext,
  ViewModeProps,
  ZoomLevelContext,
  ZoomLevelProps,
} from '../context/AppContext';
import Content from './Content';
import styles from './Explore.module.css';
import Filters from './filters';
import ActiveFiltersList from './filters/ActiveFiltersList';

interface Props {
  data: BaseData;
}

export type LoadedContent = {
  [key in ViewMode]: string[];
};

const TITLE_GAP = 40;

const Landscape = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fullDataReady } = useContext(FullDataContext) as FullDataProps;
  const { selectedViewMode } = useContext(ViewModeContext) as ViewModeProps;
  const { zoomLevel } = useContext(ZoomLevelContext) as ZoomLevelProps;
  const { updateViewMode, updateZoomLevel } = useContext(AppActionsContext) as ActionsContext;
  const [searchParams] = useSearchParams();
  const container = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [landscapeData, setLandscapeData] = useState<Item[] | undefined>();
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(
    props.data.groups ? searchParams.get(GROUP_PARAM) || props.data.groups[0].name : undefined
  );
  const [visibleItems, setVisibleItems] = useState<(BaseItem | Item)[]>(props.data.items);
  const [visibleFiltersModal, setVisibleFiltersModal] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [groupsData, setGroupsData] = useState<GroupData | undefined>(prepareData(props.data, visibleItems));
  const [numVisibleItems, setNumVisibleItems] = useState<number | undefined>();
  const [visibleLoading, setVisibleLoading] = useState<boolean>(true);

  const getLoadedData = (): LoadedContent => {
    const data: LoadedContent = { [ViewMode.Card]: [], [ViewMode.Grid]: [] };

    if (selectedViewMode) {
      data[selectedViewMode] = [selectedGroup || 'default'];
    }

    return data;
  };

  const [loaded, setLoaded] = useState<LoadedContent>(getLoadedData());

  useBodyScroll(visibleLoading, 'loading');

  const checkIfVisibleLoading = (viewMode?: ViewMode, groupName?: string) => {
    if (viewMode) {
      const group = groupName || selectedGroup || 'default';
      if (!loaded[viewMode].includes(groupName || 'default')) {
        setVisibleLoading(true);
        setLoaded({
          ...loaded,
          [viewMode]: [...loaded[viewMode], group],
        });
      } else {
        setVisibleLoading(false);
      }
    } else {
      setVisibleLoading(false);
    }
  };

  const finishLoading = useCallback(() => {
    setVisibleLoading(false);
  }, []);

  const updateQueryString = (param: string, value: string) => {
    const updatedSearchParams = new URLSearchParams(searchParams);
    updatedSearchParams.delete(param);
    updatedSearchParams.set(param, value);

    navigate(
      { ...location, search: updatedSearchParams.toString(), hash: undefined },
      {
        replace: true,
      }
    );
  };

  useEffect(() => {
    async function fetchItems() {
      try {
        setLandscapeData(await itemsDataGetter.getAll());
      } catch {
        setLandscapeData(undefined);
      }
    }

    if (fullDataReady) {
      fetchItems();
    }
  }, [fullDataReady]);

  useEffect(() => {
    if (landscapeData) {
      setVisibleItems(landscapeData);
    }
  }, [landscapeData]);

  const removeFilter = useCallback(
    (name: FilterCategory, value: string) => {
      const tmpActiveFilters: string[] = (activeFilters[name] || []).filter((f: string) => f !== value);
      updateActiveFilters(name, tmpActiveFilters);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeFilters]
  );

  const updateActiveFilters = (value: FilterCategory, options: string[]) => {
    const tmpActiveFilters: ActiveFilters = { ...activeFilters };
    if (options.length === 0) {
      delete tmpActiveFilters[value];
    } else {
      tmpActiveFilters[value] = options;
    }
    setActiveFilters(tmpActiveFilters);
  };

  const resetFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  const applyFilters = useCallback((newFilters: ActiveFilters) => {
    setActiveFilters(newFilters);
  }, []);

  const onCloseFiltersModal = useCallback(() => {
    setVisibleFiltersModal(false);
  }, []);

  useEffect(() => {
    setVisibleItems(filterData(landscapeData || props.data.items, activeFilters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters]);

  useEffect(() => {
    const newData = prepareData(props.data, visibleItems);
    setGroupsData(newData);
    setNumVisibleItems(countVisibleItems(newData[selectedGroup || 'default']));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleItems, selectedGroup]);

  useEffect(() => {
    const checkContainerWidth = throttle(() => {
      if (container && container.current) {
        setContainerWidth(container.current.offsetWidth - TITLE_GAP);
      }
    }, 400);
    window.addEventListener('resize', checkContainerWidth);

    if (container && container.current) {
      setContainerWidth(container.current.offsetWidth - TITLE_GAP);
    }

    return () => window.removeEventListener('resize', checkContainerWidth);
  }, []);

  if (isUndefined(groupsData)) return null;

  return (
    <>
      <div className="d-flex flex-row align-items-center justify-content-between my-3 py-1">
        <div className="d-flex flex-row align-items-center">
          <div>
            <button
              title="Filters"
              className={`position-relative btn btn-sm btn-secondary text-white btn-sm rounded-0 py-0 me-4 ${styles.filterBtn}`}
              onClick={() => setVisibleFiltersModal(true)}
            >
              <div className="d-flex flex-row align-items-center">
                <SVGIcon kind={SVGIconKind.Filters} />
                <div className="fw-semibold ps-2">Filters</div>
              </div>
            </button>
          </div>
          {props.data.groups && (
            <>
              <div className={styles.btnGroupLegend}>
                <small className="text-muted me-2">GROUPS:</small>
              </div>
              <div className={`btn-group btn-group-sm me-4 ${styles.btnGroup}`}>
                {props.data.groups.map((group: Group) => {
                  return (
                    <button
                      key={`group_${group.name}`}
                      title={`Group: ${group.name}`}
                      className={classNames('btn btn-outline-primary btn-sm rounded-0 fw-semibold', styles.navLink, {
                        [`active text-white ${styles.active}`]:
                          !isUndefined(selectedGroup) && group.name === selectedGroup,
                      })}
                      onClick={() => {
                        checkIfVisibleLoading(selectedViewMode, group.name);
                        setSelectedGroup(group.name);
                        updateQueryString(GROUP_PARAM, group.name);
                      }}
                    >
                      {group.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <div className={styles.btnGroupLegend}>
            <small className="text-muted me-2">VIEW MODE:</small>
          </div>
          <div className={`btn-group btn-group-sm me-4 ${styles.btnGroup}`} role="group" aria-label="View mode options">
            {Object.keys(ViewMode).map((mode) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const value = (ViewMode as any)[mode];
              const isActive = value === selectedViewMode;

              return (
                <Fragment key={`view_mode_${value}`}>
                  <button
                    title={`View mode: ${mode}`}
                    type="button"
                    className={classNames('btn btn-outline-primary rounded-0 fw-semibold', {
                      'active text-white': isActive,
                    })}
                    onClick={() => {
                      if (!isActive) {
                        checkIfVisibleLoading(value, selectedGroup);
                        updateViewMode(value);
                        updateQueryString(VIEW_MODE_PARAM, value);
                      }
                    }}
                  >
                    {mode}
                  </button>
                </Fragment>
              );
            })}
          </div>
          {selectedViewMode === ViewMode.Grid && (
            <>
              <div className={styles.btnGroupLegend}>
                <small className="text-muted me-2">ZOOM:</small>
              </div>
              <div className="d-flex flex-row">
                <div className={`btn-group btn-group-sm ${styles.btnGroup}`}>
                  <button
                    title="Increase zoom level"
                    className="btn btn-outline-primary rounded-0 fw-semibold"
                    disabled={zoomLevel === 0}
                    onClick={() => {
                      updateZoomLevel(zoomLevel - 1);
                    }}
                  >
                    <div className={styles.btnSymbol}>-</div>
                  </button>
                  <button
                    title="Decrease zoom level"
                    className="btn btn-outline-primary rounded-0 fw-semibold"
                    disabled={zoomLevel === 10}
                    onClick={() => {
                      updateZoomLevel(zoomLevel + 1);
                    }}
                  >
                    <div className={styles.btnSymbol}>+</div>
                  </button>
                </div>
              </div>
            </>
          )}{' '}
        </div>
      </div>

      <ActiveFiltersList activeFilters={activeFilters} resetFilters={resetFilters} removeFilter={removeFilter} />

      {numVisibleItems === 0 && (
        <div className="pt-5">
          <NoData>
            <>
              <div className="fs-4">We couldn't find any items that match the criteria selected.</div>
              <p className="h6 my-4 lh-base">
                You can update them and try again or{' '}
                <button
                  type="button"
                  className="btn btn-link lh-1 p-0 text-reset align-baseline"
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
      )}

      <div className="position-relative d-flex w-100 pt-1">
        <div
          ref={container}
          className={classNames('d-flex flex-column flex-grow-1 w-100', styles.container, `zoom-${zoomLevel}`, {
            [styles.loadingContent]: visibleLoading,
          })}
        >
          {visibleLoading && <Loading spinnerClassName="position-fixed top-50 start-50" />}

          {props.data.groups ? (
            <>
              {props.data.groups.map((group: Group) => {
                const isSelected = selectedGroup === group.name;
                return (
                  <div
                    key={group.name}
                    style={isSelected ? { height: 'initial' } : { height: '0px', overflow: 'hidden' }}
                  >
                    <Content
                      isSelected={isSelected}
                      containerWidth={containerWidth}
                      data={groupsData[group.name]}
                      categories_overridden={props.data.categories_overridden}
                      finishLoading={finishLoading}
                    />
                  </div>
                );
              })}
            </>
          ) : (
            <Content
              isSelected
              containerWidth={containerWidth}
              data={groupsData.default}
              categories_overridden={props.data.categories_overridden}
              finishLoading={finishLoading}
            />
          )}
        </div>
      </div>

      <Filters
        data={props.data}
        landscapeData={landscapeData}
        selectedGroup={selectedGroup}
        visibleFilters={visibleFiltersModal}
        onClose={onCloseFiltersModal}
        activeFilters={activeFilters}
        applyFilters={applyFilters}
      />
    </>
  );
};

export default Landscape;

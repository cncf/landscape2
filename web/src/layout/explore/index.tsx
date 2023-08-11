import classNames from 'classnames';
import { isUndefined, throttle } from 'lodash';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { DEFAULT_VIEW_MODE, DEFAULT_ZOOM_LEVELS, GROUP_PARAM, VIEW_MODE_PARAM, ZOOM_LEVELS } from '../../data';
import { useBreakpointDetect } from '../../hooks/useBreakpointDetect';
import {
  ActiveFilters,
  BaseData,
  BaseItem,
  Breakpoint,
  FilterCategory,
  Group,
  Item,
  SVGIconKind,
  ViewMode,
} from '../../types';
import countVisibleItems from '../../utils/countVisibleItems';
import filterData from '../../utils/filterData';
import itemsDataGetter from '../../utils/itemsDataGetter';
import prepareData, { GroupData } from '../../utils/prepareData';
import NoData from '../common/NoData';
import SVGIcon from '../common/SVGIcon';
import Content from './Content';
import Filters from './filters';
import ActiveFiltersList from './filters/ActiveFiltersList';
import styles from './Landscape.module.css';

interface Props {
  data: BaseData;
}

const TITLE_GAP = 40;

const Landscape = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const point = useBreakpointDetect();
  const [searchParams] = useSearchParams();
  const container = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [landscapeData, setLandscapeData] = useState<Item[] | undefined>();
  const [levelZoom, setLevelZoom] = useState<number>(
    point ? DEFAULT_ZOOM_LEVELS[point] : DEFAULT_ZOOM_LEVELS[Breakpoint.XL]
  );
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(
    props.data.groups ? searchParams.get(GROUP_PARAM) || props.data.groups[0].name : undefined
  );
  const [selectedViewMode, setSelectedViewMode] = useState<ViewMode>(
    (searchParams.get(VIEW_MODE_PARAM) as ViewMode) || DEFAULT_VIEW_MODE
  );
  const [visibleItems, setVisibleItems] = useState<(BaseItem | Item)[]>(props.data.items);
  const [visibleFiltersModal, setVisibleFiltersModal] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [groupsData, setGroupsData] = useState<GroupData | undefined>(prepareData(props.data, visibleItems));
  const [numVisibleItems, setNumVisibleItems] = useState<number | undefined>();

  itemsDataGetter.subscribe({
    updateLandscapeData: (items: Item[]) => {
      setLandscapeData(items);
    },
  });

  const updateQueryString = (param: string, value: string) => {
    const updatedSearchParams = new URLSearchParams(searchParams);
    updatedSearchParams.delete(param);
    updatedSearchParams.set(param, value);

    navigate(
      { ...location, search: updatedSearchParams.toString(), hash: '' },
      {
        replace: true,
      }
    );
  };

  useEffect(() => {
    if (landscapeData) {
      setVisibleItems(landscapeData);
    }
  }, [landscapeData]);

  // Update card-size variable depending on zoom level
  useEffect(() => {
    const bodyStyles = document.body.style;
    bodyStyles.setProperty('--card-size-width', `${ZOOM_LEVELS[levelZoom][0]}px`);
    bodyStyles.setProperty('--card-size-height', `${ZOOM_LEVELS[levelZoom][1]}px`);
  }, [levelZoom]);

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
    if (point) {
      setLevelZoom(DEFAULT_ZOOM_LEVELS[point]);
    }
  }, [point]);

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
                        setSelectedViewMode(value);
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
                    disabled={levelZoom === 0}
                    onClick={() => {
                      const newZoomLevel = levelZoom - 1;
                      setLevelZoom(newZoomLevel);
                    }}
                  >
                    <div className={styles.btnSymbol}>-</div>
                  </button>
                  <button
                    title="Decrease zoom level"
                    className="btn btn-outline-primary rounded-0 fw-semibold"
                    disabled={levelZoom === 10}
                    onClick={() => {
                      const newZoomLevel = levelZoom + 1;
                      setLevelZoom(newZoomLevel);
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

      <div className="d-flex w-100 pt-1">
        <div ref={container} className={`d-flex flex-column flex-grow-1 w-100 zoom-${levelZoom}`}>
          {props.data.groups ? (
            <>
              {props.data.groups.map((group: Group) => {
                const isSelected = selectedGroup === group.name;
                return (
                  <div key={group.name} className={classNames({ 'd-none': !isSelected }, { 'd-block': isSelected })}>
                    <Content
                      isSelected={isSelected}
                      containerWidth={containerWidth}
                      fullDataReady={!isUndefined(landscapeData)}
                      data={groupsData[group.name]}
                      cardWidth={ZOOM_LEVELS[levelZoom][0]}
                      selectedViewMode={selectedViewMode}
                      categories_overridden={props.data.categories_overridden}
                    />
                  </div>
                );
              })}
            </>
          ) : (
            <Content
              isSelected
              containerWidth={containerWidth}
              fullDataReady={!isUndefined(landscapeData)}
              data={groupsData.default}
              cardWidth={ZOOM_LEVELS[levelZoom][0]}
              selectedViewMode={selectedViewMode}
              categories_overridden={props.data.categories_overridden}
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

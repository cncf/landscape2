import classNames from 'classnames';
import { ActiveFilters, FilterCategory, BaseItem, Group, ViewMode, Breakpoint, BaseData, Item } from '../../types';
import { DEFAULT_VIEW_MODE, DEFAULT_ZOOM_LEVELS, GROUP_PARAM, VIEW_MODE_PARAM, ZOOM_LEVELS } from '../../data';
import styles from './Landscape.module.css';
import { Fragment, useEffect, useRef, useState } from 'react';
import Content from './Content';
import Filters from './filters';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import prepareData, { GroupData } from '../../utils/prepareData';
import { useBreakpointDetect } from '../../hooks/useBreakpointDetect';
import itemsDataGetter from '../../utils/itemsDataGetter';
import filterData from '../../utils/filterData';
import NoData from '../common/NoData';
import throttle from '../../utils/throttle';
import ActiveFiltersList from './filters/ActiveFiltersList';
import countVisibleItems from '../../utils/countVisibleItems';

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
  const [visibleFilters, setVisibleFilters] = useState<boolean>(false);
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
      { pathname: location.pathname, search: updatedSearchParams.toString() },
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

  const removeFilter = (name: FilterCategory, value: string) => {
    const tmpActiveFilters: string[] = (activeFilters[name] || []).filter((f: string) => f !== value);
    updateActiveFilters(name, tmpActiveFilters);
  };

  const updateActiveFilters = (value: FilterCategory, options: string[]) => {
    const tmpActiveFilters: ActiveFilters = { ...activeFilters };
    if (options.length === 0) {
      delete tmpActiveFilters[value];
    } else {
      tmpActiveFilters[value] = options;
    }
    setActiveFilters(tmpActiveFilters);
  };

  const resetFilters = () => {
    setActiveFilters({});
  };

  const applyFilters = (newFilters: ActiveFilters) => {
    setActiveFilters(newFilters);
  };

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
    if (container && container.current) {
      setContainerWidth(container.current.offsetWidth - TITLE_GAP);
    }
  }, []);

  useEffect(() => {
    const checkContainerWidth = throttle(() => {
      if (container && container.current) {
        setContainerWidth(container.current.offsetWidth - TITLE_GAP);
      }
    }, 400);
    window.addEventListener('resize', checkContainerWidth);

    return () => window.removeEventListener('resize', checkContainerWidth);
  }, []);

  if (groupsData === undefined) return null;

  return (
    <>
      <div className="d-flex flex-row align-items-center justify-content-between my-3 py-1">
        <div className="d-flex flex-row align-items-center">
          <div>
            <button
              title="Filters"
              className={`position-relative btn btn-sm btn-secondary text-white btn-sm rounded-0 py-0 me-4 ${styles.filterBtn}`}
              onClick={() => setVisibleFilters(true)}
            >
              <div className="d-flex flex-row align-items-center">
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 512 512"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M487.976 0H24.028C2.71 0-8.047 25.866 7.058 40.971L192 225.941V432c0 7.831 3.821 15.17 10.237 19.662l80 55.98C298.02 518.69 320 507.493 320 487.98V225.941l184.947-184.97C520.021 25.896 509.338 0 487.976 0z"></path>
                </svg>
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
                          selectedGroup !== undefined && group.name === selectedGroup,
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
                      containerWidth={containerWidth}
                      fullDataReady={landscapeData !== undefined}
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
              containerWidth={containerWidth}
              fullDataReady={landscapeData !== undefined}
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
        visibleFilters={visibleFilters}
        onClose={() => setVisibleFilters(false)}
        activeFilters={activeFilters}
        applyFilters={applyFilters}
      />
    </>
  );
};

export default Landscape;

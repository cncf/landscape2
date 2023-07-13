import classNames from 'classnames';
import {
  ActiveFilters,
  FilterCategory,
  BaseItem,
  OutletContext,
  Group,
  ViewMode,
  Breakpoint,
  BaseData,
  Item,
  FilterSection,
} from '../../types';
import { DEFAULT_VIEW_MODE, DEFAULT_ZOOM_LEVELS, GROUP_PARAM, VIEW_MODE_PARAM, ZOOM_LEVELS } from '../../data';
import styles from './Landscape.module.css';
import { Fragment, useEffect, useState } from 'react';
import Content from './Content';
import Filters from './filters';
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import prepareData, { CategoriesData } from '../../utils/prepareData';
import { useBreakpointDetect } from '../../hooks/useBreakpointDetect';
import itemsDataGetter from '../../utils/itemsDataGetter';
import filterData from '../../utils/filterData';
import prepareFilters from '../../utils/prepareFilters';
import NoData from '../common/NoData';

interface Props {
  data: BaseData;
}

const Landscape = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const point = useBreakpointDetect();
  const [searchParams] = useSearchParams();
  const { setActiveItemId } = useOutletContext() as OutletContext;
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
  const [categoriesData, setCategoriesData] = useState<CategoriesData | undefined>(
    prepareData(props.data, visibleItems, selectedGroup)
  );
  const [filtersFromData, setFiltersFromData] = useState<FilterSection[]>([]);
  const [filtersApplied, setFiltersApplied] = useState<boolean>(Object.keys(activeFilters).length > 0);

  itemsDataGetter.subscribe({
    updateLandscapeData: (items: Item[]) => {
      setLandscapeData(items);
      setFiltersFromData(prepareFilters(items));
    },
  });

  const onClickItem = (itemId: string) => {
    setActiveItemId(itemId);
  };

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
    setFiltersApplied(Object.keys(tmpActiveFilters).length > 0);
  };

  const resetFilters = () => {
    setActiveFilters({});
    setFiltersApplied(false);
  };

  useEffect(() => {
    setVisibleItems(filterData(landscapeData || props.data.items, activeFilters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters]);

  useEffect(() => {
    setCategoriesData(prepareData(props.data, visibleItems, selectedGroup));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleItems, selectedGroup]);

  useEffect(() => {
    if (point) {
      setLevelZoom(DEFAULT_ZOOM_LEVELS[point]);
    }
  }, [point]);

  if (categoriesData === undefined) return null;

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
              {filtersApplied && (
                <div
                  className={`position-absolute border bg-primary border-3 border-white rounded-circle ${styles.dot}`}
                ></div>
              )}
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

      {Object.keys(activeFilters).length > 0 && (
        <div className="d-flex flex-row align-items-baseline mb-3">
          <div className="text-muted text-uppercase me-3">
            <small>Filters:</small>
          </div>
          {Object.keys(activeFilters).map((f: string) => {
            if (activeFilters[f as FilterCategory] === undefined) return null;
            return (
              <div className="d-flex flex-row" key={`active_${f}`} role="list">
                {activeFilters[f as FilterCategory]?.map((c: string) => {
                  return (
                    <span
                      role="listitem"
                      key={`active_${f}_${c}`}
                      className="badge badge-sm bg-primary rounded-0 text-light me-3 my-1 d-flex flex-row align-items-center"
                    >
                      <div className="d-flex flex-row align-items-baseline">
                        <div>
                          <small className="text-uppercase fw-normal me-2">{f}:</small>
                          <span
                            className={
                              [FilterCategory.Project, FilterCategory.CompanyType].includes(f as FilterCategory)
                                ? 'text-uppercase'
                                : ''
                            }
                          >
                            {c}
                          </span>
                        </div>
                        <button
                          className="btn btn-link text-white btn-sm lh-1 p-0 ps-2"
                          onClick={() => removeFilter(f as FilterCategory, c)}
                          aria-label={`Remove ${c} filter`}
                          title={`Remove ${c} filter`}
                        >
                          <svg
                            stroke="currentColor"
                            fill="currentColor"
                            strokeWidth="0"
                            viewBox="0 0 512 512"
                            height="1em"
                            width="1em"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M256 90c44.3 0 86 17.3 117.4 48.6C404.7 170 422 211.7 422 256s-17.3 86-48.6 117.4C342 404.7 300.3 422 256 422s-86-17.3-117.4-48.6C107.3 342 90 300.3 90 256s17.3-86 48.6-117.4C170 107.3 211.7 90 256 90m0-42C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48z"></path>
                            <path d="M360 330.9L330.9 360 256 285.1 181.1 360 152 330.9l74.9-74.9-74.9-74.9 29.1-29.1 74.9 74.9 74.9-74.9 29.1 29.1-74.9 74.9z"></path>
                          </svg>
                        </button>
                      </div>
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {visibleItems.length === 0 && (
        <NoData>
          <>
            <div className="fs-4">Not items available</div>

            {filtersApplied && (
              <>
                <p className="h6 my-4 lh-base">You can reset the filters:</p>

                <button
                  type="button"
                  className="btn btn-sm btn-secondary rounded-0 text-white text-uppercase fw-semibold"
                  onClick={resetFilters}
                  aria-label="Reset filters"
                  title="Reset filters"
                >
                  Reset filters
                </button>
              </>
            )}
          </>
        </NoData>
      )}

      <div className="d-flex w-100 pt-1">
        <div className={`d-flex flex-column flex-grow-1 w-100 zoom-${levelZoom}`}>
          <Content
            fullDataReady={landscapeData !== undefined}
            data={categoriesData}
            cardWidth={ZOOM_LEVELS[levelZoom][0]}
            selectedViewMode={selectedViewMode}
            categories_overridden={props.data.categories_overridden}
            onClickItem={onClickItem}
          />
        </div>
      </div>

      <Filters
        fullDataReady={landscapeData !== undefined}
        filtersFromData={filtersFromData}
        visibleFilters={visibleFilters}
        onClose={() => setVisibleFilters(false)}
        resetFilters={resetFilters}
        activeFilters={activeFilters}
        updateActiveFilters={updateActiveFilters}
      />
    </>
  );
};

export default Landscape;

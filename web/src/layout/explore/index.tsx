import classNames from 'classnames';
import {
  ActiveFilters,
  FilterCategory,
  BaseItem,
  BaseData as LandscapeData,
  OutletContext,
  Group,
  ViewMode,
  Breakpoint,
} from '../../types';
import { DEFAULT_VIEW_MODE, DEFAULT_ZOOM_LEVELS, GROUP_PARAM, VIEW_MODE_PARAM, ZOOM_LEVELS } from '../../data';
import styles from './Landscape.module.css';
import { Fragment, useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Content from './Content';
import Filters from './filters';
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import prepareBaseData, { CategoriesData } from '../../utils/prepareBaseData';
import { useBreakpointDetect } from '../../hooks/useBreakpointDetect';

interface Props {
  data: LandscapeData;
}

const Landscape = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const point = useBreakpointDetect();
  const [searchParams] = useSearchParams();
  const { setActiveItem } = useOutletContext() as OutletContext;
  const [levelZoom, setLevelZoom] = useState<number>(
    point ? DEFAULT_ZOOM_LEVELS[point] : DEFAULT_ZOOM_LEVELS[Breakpoint.XL]
  );
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(
    props.data.groups ? searchParams.get(GROUP_PARAM) || props.data.groups[0].name : undefined
  );
  const [selectedViewMode, setSelectedViewMode] = useState<ViewMode>(
    (searchParams.get(VIEW_MODE_PARAM) as ViewMode) || DEFAULT_VIEW_MODE
  );
  const [visibleItems, setVisibleItems] = useState<BaseItem[]>(props.data.items);
  const [visibleFilters, setVisibleFilters] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [categoriesData, setCategoriesData] = useState<CategoriesData | undefined>(
    prepareBaseData(props.data, visibleItems, selectedGroup)
  );

  const onClickItem = (item: BaseItem) => {
    setActiveItem(item);
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

  // Update card-size variable depending on zoom level
  useEffect(() => {
    const bodyStyles = document.body.style;
    bodyStyles.setProperty('--card-size-width', `${ZOOM_LEVELS[levelZoom][0]}px`);
    bodyStyles.setProperty('--card-size-height', `${ZOOM_LEVELS[levelZoom][1]}px`);
  }, [levelZoom]);

  const updateActiveFilters = (value: FilterCategory, options: string[]) => {
    const tmpActiveFilters: ActiveFilters = { ...activeFilters };
    if (options.length === 0) {
      delete tmpActiveFilters[value];
    } else {
      tmpActiveFilters[value] = options;
    }
    setActiveFilters(tmpActiveFilters);
  };

  useEffect(() => {
    if (Object.keys(activeFilters).length > 0) {
      let filteredItems: BaseItem[] = [];
      Object.keys(activeFilters).forEach((f: string) => {
        if (f === FilterCategory.Project) {
          const includedUndefined = activeFilters[FilterCategory.Project]?.includes('non-cncf');
          filteredItems = props.data.items.filter((item: BaseItem) => {
            if (includedUndefined && item.project === undefined) {
              return item;
            } else if (item.project !== undefined && activeFilters[FilterCategory.Project]?.includes(item.project)) {
              return item;
            }
          });
        }
      });
      setVisibleItems(filteredItems);
    } else {
      setVisibleItems(props.data.items);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters]);

  useEffect(() => {
    setCategoriesData(prepareBaseData(props.data, visibleItems, selectedGroup));
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
              {Object.keys(activeFilters).length > 0 && (
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

      <div className="d-flex w-100 pt-1">
        <div className={`d-flex flex-column flex-grow-1 w-100 zoom-${levelZoom}`}>
          <Content
            data={categoriesData}
            cardWidth={ZOOM_LEVELS[levelZoom][0]}
            selectedViewMode={selectedViewMode}
            categories_overridden={props.data.categories_overridden}
            onClickItem={onClickItem}
          />
        </div>
      </div>

      {visibleFilters && (
        <Modal header="Filters" open onClose={() => setVisibleFilters(false)}>
          <div>
            <Filters activeFilters={activeFilters} updateActiveFilters={updateActiveFilters} />
          </div>
        </Modal>
      )}
    </>
  );
};

export default Landscape;

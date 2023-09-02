import classNames from 'classnames';
import { isUndefined } from 'lodash';
import { Fragment, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { GROUP_PARAM, VIEW_MODE_PARAM } from '../../data';
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
import Filters from './filters';
import ActiveFiltersList from './filters/ActiveFiltersList';
import styles from './Landscape.module.css';

interface Props {
  data: BaseData;
}

const Landscape = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fullDataReady } = useContext(FullDataContext) as FullDataProps;
  const { selectedViewMode } = useContext(ViewModeContext) as ViewModeProps;
  const { zoomLevel } = useContext(ZoomLevelContext) as ZoomLevelProps;
  const { updateViewMode, updateZoomLevel } = useContext(AppActionsContext) as ActionsContext;
  const [searchParams] = useSearchParams();
  const [landscapeData, setLandscapeData] = useState<Item[] | undefined>();
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>(
    props.data.groups ? searchParams.get(GROUP_PARAM) || props.data.groups[0].name : undefined
  );
  const [visibleItems, setVisibleItems] = useState<(BaseItem | Item)[]>(props.data.items);
  const [visibleFiltersModal, setVisibleFiltersModal] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [groupsData, setGroupsData] = useState<GroupData | undefined>(prepareData(props.data, visibleItems));
  const [numVisibleItems, setNumVisibleItems] = useState<number | undefined>();
  const [visibleLoading, setVisibleLoading] = useState<boolean>(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  const hideLoading = useCallback(() => {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
    setVisibleLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showLoading = () => {
    console.log('show');
    setVisibleLoading(true);
    setLoadingTimeout(
      setTimeout(() => {
        console.log('hide');
        setVisibleLoading(false);
      }, 500)
    );
  };

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
    showLoading();
    setVisibleItems(filterData(landscapeData || props.data.items, activeFilters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters]);

  useEffect(() => {
    const newData = prepareData(props.data, visibleItems);
    setGroupsData(newData);
    setNumVisibleItems(countVisibleItems(newData[selectedGroup || 'default']));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleItems, selectedGroup]);

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
                        showLoading();
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
                        showLoading();
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

      <div className={classNames('position-relative d-flex w-100 pt-1', { [styles.contentLoading]: visibleLoading })}>
        <div className={`d-flex flex-column flex-grow-1 w-100 zoom-${zoomLevel}`}>
          {visibleLoading && <Loading position="fixed" className={styles.loading} />}
          <Content
            data={groupsData[selectedGroup || 'default']}
            categories_overridden={props.data.categories_overridden}
            hideLoading={hideLoading}
          />
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

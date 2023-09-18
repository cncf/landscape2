import isUndefined from 'lodash/isUndefined';
import { memo, MouseEvent, useCallback, useEffect, useState } from 'react';

import { FILTERS } from '../../../data';
import { ActiveFilters, BaseData, FilterCategory, FilterSection, Item } from '../../../types';
import prepareData from '../../../utils/prepareData';
import getFiltersPerGroup, { FiltersPerGroup } from '../../../utils/prepareFilters';
import { Loading } from '../../common/Loading';
import Modal from '../../common/Modal';
import styles from './Filters.module.css';
import SearchbarSection from './SearchbarSection';
import Section from './Section';

interface Props {
  data: BaseData;
  landscapeData?: Item[];
  selectedGroup?: string;
  visibleFilters: boolean;
  onClose: () => void;
  applyFilters: (newFilters: ActiveFilters) => void;
  activeFilters: ActiveFilters;
}

const Filters = memo(function Filters(props: Props) {
  const [tmpActiveFilters, setTmpActiveFilters] = useState<ActiveFilters>(props.activeFilters);
  const [filtersFromData, setFiltersFromData] = useState<FiltersPerGroup | undefined>();
  const [filters, setFilters] = useState<FilterSection[]>([]);

  useEffect(() => {
    setTmpActiveFilters(props.activeFilters);
  }, [props.activeFilters, props.visibleFilters]);

  useEffect(() => {
    if (props.landscapeData) {
      setFiltersFromData(getFiltersPerGroup(prepareData(props.data, props.landscapeData)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.landscapeData]);

  useEffect(() => {
    if (filtersFromData) {
      setFilters(filtersFromData[props.selectedGroup || 'default']);
    }
  }, [filtersFromData, props.selectedGroup]);

  const getSection = (id: FilterCategory): FilterSection | undefined => {
    const section = filters.find((sec: FilterSection) => sec.value === id);
    if (section) {
      return section;
    }
    return;
  };

  const getSectionInPredefinedFilters = useCallback((id: FilterCategory): FilterSection | undefined => {
    const section = FILTERS.find((sec: FilterSection) => sec.value === id);
    if (section) {
      return section;
    }
    return;
  }, []);

  const updateActiveFilters = useCallback(
    (value: FilterCategory, options: string[]) => {
      const f: ActiveFilters = { ...tmpActiveFilters };
      if (options.length === 0) {
        delete f[value];
      } else {
        f[value] = options;
      }
      setTmpActiveFilters(f);
    },
    [tmpActiveFilters]
  );

  const resetFilter = useCallback(
    (name: FilterCategory) => {
      updateActiveFilters(name, []);
    },
    [updateActiveFilters]
  );

  const resetFilters = useCallback(() => {
    setTmpActiveFilters({});
  }, []);

  if (!props.visibleFilters) return null;

  const countryFilter = getSection(FilterCategory.Country);
  const orgFilter = getSection(FilterCategory.Organization);
  const licenseFilter = getSection(FilterCategory.License);
  const industryFilter = getSection(FilterCategory.Industry);
  const companyTypeFilter = getSection(FilterCategory.CompanyType);
  const maturityFilter = getSection(FilterCategory.Maturity);

  return (
    <Modal
      modalDialogClassName={styles.modal}
      header={
        <div className="d-flex flex-row align-items-baseline">
          <div>Filters</div>
          <button
            type="button"
            title="Reset filters"
            className="btn btn-sm btn-link text-muted"
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              resetFilters();
              props.onClose();
            }}
            aria-label="Reset filters"
          >
            (reset all)
          </button>
        </div>
      }
      footer={
        <div className="d-flex flex-row justify-content-between w-100">
          <div>
            <small className="d-none fst-italic text-muted">x items found</small>
          </div>
          <div>
            <button
              type="button"
              title="Apply filters"
              className="btn btn-sm btn-secondary text-uppercase fw-semibold text-white rounded-0"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                props.applyFilters(tmpActiveFilters);
                props.onClose();
              }}
              aria-label="Apply filters"
            >
              Apply
            </button>
          </div>
        </div>
      }
      open
      size="xl"
      onClose={props.onClose}
    >
      <div className="p-3">
        {!isUndefined(filtersFromData) ? (
          <>
            <div className="row g-5">
              {maturityFilter && (
                <div className="col-4">
                  <Section
                    title="Project status"
                    section={getSectionInPredefinedFilters(FilterCategory.Maturity)}
                    extraMaturity={maturityFilter}
                    activeFilters={tmpActiveFilters[FilterCategory.Maturity]}
                    updateActiveFilters={updateActiveFilters}
                    resetFilter={resetFilter}
                  />
                </div>
              )}

              {licenseFilter && (
                <div className="col-4">
                  <SearchbarSection
                    title="License"
                    placeholder="Search license"
                    section={licenseFilter}
                    activeFilters={tmpActiveFilters[FilterCategory.License]}
                    updateActiveFilters={updateActiveFilters}
                    resetFilter={resetFilter}
                  />
                </div>
              )}

              {industryFilter && (
                <div className="col-4">
                  <SearchbarSection
                    section={industryFilter}
                    placeholder="Search industry"
                    activeFilters={tmpActiveFilters[FilterCategory.Industry]}
                    updateActiveFilters={updateActiveFilters}
                    resetFilter={resetFilter}
                  />
                </div>
              )}

              {orgFilter && (
                <div className="col-4">
                  <SearchbarSection
                    placeholder="Search organization"
                    section={orgFilter}
                    activeFilters={tmpActiveFilters[FilterCategory.Organization]}
                    updateActiveFilters={updateActiveFilters}
                    resetFilter={resetFilter}
                  />
                </div>
              )}

              {companyTypeFilter && (
                <div className="col-4">
                  <Section
                    title="Organization type"
                    section={getSectionInPredefinedFilters(FilterCategory.CompanyType)}
                    activeFilters={tmpActiveFilters[FilterCategory.CompanyType]}
                    updateActiveFilters={updateActiveFilters}
                    resetFilter={resetFilter}
                  />
                </div>
              )}

              {countryFilter && (
                <div className="col-4">
                  <SearchbarSection
                    title="Location"
                    placeholder="Search country"
                    section={countryFilter}
                    activeFilters={tmpActiveFilters[FilterCategory.Country]}
                    updateActiveFilters={updateActiveFilters}
                    resetFilter={resetFilter}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-5">
            <Loading />
          </div>
        )}
      </div>
    </Modal>
  );
});

export default Filters;

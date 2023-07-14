import { FILTERS } from '../../../data';
import { ActiveFilters, FilterCategory, FilterSection } from '../../../types';
import Section from './Section';
import Modal from '../../common/Modal';
import SearchbarSection from './SearchbarSection';
import styles from './Filters.module.css';
import { MouseEvent, useEffect, useState } from 'react';

interface Props {
  fullDataReady: boolean;
  filtersFromData: FilterSection[];
  visibleFilters: boolean;
  onClose: () => void;
  applyFilters: (newFilters: ActiveFilters) => void;
  activeFilters: ActiveFilters;
}

const Filters = (props: Props) => {
  const [tmpActiveFilters, setTmpActiveFilters] = useState<ActiveFilters>(props.activeFilters);

  useEffect(() => {
    setTmpActiveFilters(props.activeFilters);
  }, [props.activeFilters, props.visibleFilters]);

  if (!props.visibleFilters) return null;

  const getSection = (id: FilterCategory): FilterSection | undefined => {
    const section = props.filtersFromData.find((sec: FilterSection) => sec.value === id);
    if (section) {
      return section;
    }
    return;
  };

  const getSectionInPredefinedFilters = (id: FilterCategory): FilterSection | undefined => {
    const section = FILTERS.find((sec: FilterSection) => sec.value === id);
    if (section) {
      return section;
    }
    return;
  };

  const resetFilter = (name: FilterCategory) => {
    updateActiveFilters(name, []);
  };

  const updateActiveFilters = (value: FilterCategory, options: string[]) => {
    const filters: ActiveFilters = { ...tmpActiveFilters };
    if (options.length === 0) {
      delete filters[value];
    } else {
      filters[value] = options;
    }
    setTmpActiveFilters(filters);
  };

  const resetFilters = () => {
    setTmpActiveFilters({});
  };

  const countryFilter = getSection(FilterCategory.Country);
  const orgFilter = getSection(FilterCategory.Organization);
  const licenseFilter = getSection(FilterCategory.License);
  const industryFilter = getSection(FilterCategory.Industry);

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
          <small className="fst-italic text-muted">x items found</small>
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
        {props.fullDataReady ? (
          <>
            <div className="row g-5">
              <div className="col-4">
                <Section
                  title="Project status"
                  section={getSectionInPredefinedFilters(FilterCategory.Project)}
                  activeFilters={tmpActiveFilters[FilterCategory.Project]}
                  updateActiveFilters={updateActiveFilters}
                  resetFilter={resetFilter}
                />
              </div>

              <div className="col-4">
                <SearchbarSection
                  title="License"
                  section={licenseFilter}
                  activeFilters={tmpActiveFilters[FilterCategory.License]}
                  updateActiveFilters={updateActiveFilters}
                  resetFilter={resetFilter}
                />
              </div>

              <div className="col-4">
                <SearchbarSection
                  section={industryFilter}
                  activeFilters={tmpActiveFilters[FilterCategory.Industry]}
                  updateActiveFilters={updateActiveFilters}
                  resetFilter={resetFilter}
                />
              </div>

              <div className="col-4">
                <SearchbarSection
                  title="Organization"
                  section={orgFilter}
                  activeFilters={tmpActiveFilters[FilterCategory.Organization]}
                  updateActiveFilters={updateActiveFilters}
                  resetFilter={resetFilter}
                />
              </div>

              <div className="col-4">
                <Section
                  title="Organization type"
                  section={getSectionInPredefinedFilters(FilterCategory.CompanyType)}
                  activeFilters={tmpActiveFilters[FilterCategory.CompanyType]}
                  updateActiveFilters={updateActiveFilters}
                  resetFilter={resetFilter}
                />
              </div>

              <div className="col-4">
                <SearchbarSection
                  title="Location"
                  section={countryFilter}
                  activeFilters={tmpActiveFilters[FilterCategory.Country]}
                  updateActiveFilters={updateActiveFilters}
                  resetFilter={resetFilter}
                />
              </div>
            </div>
          </>
        ) : (
          <>Loading</>
        )}
      </div>
    </Modal>
  );
};

export default Filters;

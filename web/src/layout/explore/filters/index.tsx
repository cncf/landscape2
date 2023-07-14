import { FILTERS } from '../../../data';
import { ActiveFilters, FilterCategory, FilterSection } from '../../../types';
import Section from './Section';
import Modal from '../../common/Modal';
import SearchbarSection from './SearchbarSection';
import styles from './Filters.module.css';
import { MouseEvent } from 'react';

interface Props {
  fullDataReady: boolean;
  filtersFromData: FilterSection[];
  visibleFilters: boolean;
  onClose: () => void;
  resetFilters: () => void;
  activeFilters: ActiveFilters;
  resetFilter: (value: FilterCategory) => void;
  updateActiveFilters: (value: FilterCategory, options: string[]) => void;
}

const Filters = (props: Props) => {
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
              props.resetFilters();
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
                // TODO - apply
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
                  activeFilters={props.activeFilters[FilterCategory.Project]}
                  updateActiveFilters={props.updateActiveFilters}
                  resetFilter={props.resetFilter}
                />
              </div>

              <div className="col-4">
                <SearchbarSection
                  title="License"
                  section={licenseFilter}
                  activeFilters={props.activeFilters[FilterCategory.License]}
                  updateActiveFilters={props.updateActiveFilters}
                  resetFilter={props.resetFilter}
                />
              </div>

              <div className="col-4">
                <SearchbarSection
                  section={industryFilter}
                  activeFilters={props.activeFilters[FilterCategory.Industry]}
                  updateActiveFilters={props.updateActiveFilters}
                  resetFilter={props.resetFilter}
                />
              </div>

              <div className="col-4">
                <SearchbarSection
                  title="Organization"
                  section={orgFilter}
                  activeFilters={props.activeFilters[FilterCategory.Organization]}
                  updateActiveFilters={props.updateActiveFilters}
                  resetFilter={props.resetFilter}
                />
              </div>

              <div className="col-4">
                <Section
                  title="Organization type"
                  section={getSectionInPredefinedFilters(FilterCategory.CompanyType)}
                  activeFilters={props.activeFilters[FilterCategory.CompanyType]}
                  updateActiveFilters={props.updateActiveFilters}
                  resetFilter={props.resetFilter}
                />
              </div>

              <div className="col-4">
                <SearchbarSection
                  title="Location"
                  section={countryFilter}
                  activeFilters={props.activeFilters[FilterCategory.Country]}
                  updateActiveFilters={props.updateActiveFilters}
                  resetFilter={props.resetFilter}
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

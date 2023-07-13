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
            className="btn btn-sm btn-link text-reset text-decoration-none"
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              props.resetFilters();
              props.onClose();
            }}
            aria-label="Reset filters"
          >
            (reset filters)
          </button>
        </div>
      }
      open
      size="xl"
      onClose={props.onClose}
    >
      <div>
        {props.fullDataReady ? (
          <>
            <div className={`position-relative my-4 border ${styles.fieldset}`}>
              <div className={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Organization</div>
              <div className="row g-4">
                <div className="col-4">
                  <SearchbarSection
                    title="Name"
                    section={orgFilter}
                    activeFilters={props.activeFilters[FilterCategory.Organization]}
                    updateActiveFilters={props.updateActiveFilters}
                  />
                </div>
                <div className="col-4">
                  <SearchbarSection
                    section={industryFilter}
                    activeFilters={props.activeFilters[FilterCategory.Industry]}
                    updateActiveFilters={props.updateActiveFilters}
                  />
                </div>
                <div className="col-4">
                  <Section
                    section={getSectionInPredefinedFilters(FilterCategory.CompanyType)}
                    activeFilters={props.activeFilters[FilterCategory.CompanyType]}
                    updateActiveFilters={props.updateActiveFilters}
                    withTitle
                    inLine
                  />
                </div>
              </div>
            </div>

            <div className={`position-relative my-4 border ${styles.fieldset}`}>
              <div className={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Repository</div>
              <div className="row g-4">
                <div className="col-6">
                  <SearchbarSection
                    title="License"
                    section={licenseFilter}
                    activeFilters={props.activeFilters[FilterCategory.License]}
                    updateActiveFilters={props.updateActiveFilters}
                  />
                </div>
              </div>
            </div>

            <div className={`position-relative my-4 border ${styles.fieldset}`}>
              <div className={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Location</div>
              <div className="row g-0">
                <div className="col-6">
                  <SearchbarSection
                    section={countryFilter}
                    activeFilters={props.activeFilters[FilterCategory.Country]}
                    updateActiveFilters={props.updateActiveFilters}
                  />
                </div>
              </div>
            </div>

            <div className={`position-relative my-4 border ${styles.fieldset}`}>
              <div className={`position-absolute px-2 bg-white fw-semibold ${styles.fieldsetTitle}`}>Project</div>
              <div className="row g-4">
                <div className="col-6">
                  <Section
                    section={getSectionInPredefinedFilters(FilterCategory.Project)}
                    activeFilters={props.activeFilters[FilterCategory.Project]}
                    updateActiveFilters={props.updateActiveFilters}
                  />
                </div>
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

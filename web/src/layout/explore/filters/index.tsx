import { intersection } from 'lodash';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import some from 'lodash/some';
import { Accessor, createEffect, createSignal, on, Show } from 'solid-js';

import { FILTER_CATEGORIES_PER_TITLE, FILTERS } from '../../../data';
import {
  ActiveFilters,
  BaseData,
  FilterCategory,
  FilterOption,
  FilterSection,
  FilterTitle,
  Item,
  SVGIconKind,
} from '../../../types';
import getFoundationNameLabel from '../../../utils/getFoundationNameLabel';
import prepareData from '../../../utils/prepareData';
import getFiltersPerGroup, { FiltersPerGroup } from '../../../utils/prepareFilters';
import Loading from '../../common/Loading';
import Modal from '../../common/Modal';
import Section from '../../common/Section';
import SVGIcon from '../../common/SVGIcon';
import styles from './Filters.module.css';
import SearchbarSection from './SearchbarSection';

interface Props {
  data: BaseData;
  initialLandscapeData: Accessor<Item[] | undefined>;
  initialSelectedGroup: Accessor<string | undefined>;
  applyFilters: (newFilters: ActiveFilters) => void;
  initialActiveFilters: Accessor<ActiveFilters>;
}

const Filters = (props: Props) => {
  const [disabledBtn, setDisabledBtn] = createSignal<boolean>(true);
  const [visibleFiltersModal, setVisibleFiltersModal] = createSignal<boolean>(false);
  const [tmpActiveFilters, setTmpActiveFilters] = createSignal<ActiveFilters>(props.initialActiveFilters());
  const [filtersFromData, setFiltersFromData] = createSignal<FiltersPerGroup | undefined>();
  const [filters, setFilters] = createSignal<FilterSection[]>([]);
  const [visibleTitles, setVisibleTitles] = createSignal<FilterTitle[]>([]);

  // Keep only available filters in selected group filters
  const cleanInitialActiveFilters = (): ActiveFilters => {
    const cleanFilters: ActiveFilters = {};
    Object.keys(props.initialActiveFilters()).forEach((f: string) => {
      const filter: FilterCategory = f as FilterCategory;
      const currentFilter = filters().find((section: FilterSection) => section.value === filter);
      if (currentFilter) {
        const opts = currentFilter.options.map((opt: FilterOption) => opt.value);
        // Add non-foundation label
        if (filter === FilterCategory.Maturity) {
          opts.push(`non-${getFoundationNameLabel()}`);
        }
        cleanFilters[filter] = intersection(opts, props.initialActiveFilters()[filter]);
      }
    });
    return cleanFilters;
  };

  createEffect(
    on(visibleFiltersModal, () => {
      if (visibleFiltersModal()) {
        if (filters().length === 0) {
          const f = getFiltersPerGroup(prepareData(props.data, props.initialLandscapeData()!));
          if (!isEmpty(f)) {
            setFiltersFromData(f);
            setFilters(f[props.initialSelectedGroup() || 'default']);
          }
        }
        setTmpActiveFilters(cleanInitialActiveFilters());
      }
    })
  );

  createEffect(
    on(props.initialLandscapeData, () => {
      if (!isUndefined(props.initialLandscapeData())) {
        setDisabledBtn(false);
      }
    })
  );

  createEffect(
    on(props.initialSelectedGroup, () => {
      if (!isUndefined(filtersFromData())) {
        setFilters(filtersFromData()![props.initialSelectedGroup() || 'default']);
      }
    })
  );

  createEffect(
    on(props.initialActiveFilters, () => {
      setTmpActiveFilters(props.initialActiveFilters());
    })
  );

  createEffect(
    on(filters, () => {
      const tmpVisibleTitles = [];
      const visibleProjectTitle = some(filters(), (f: FilterSection) => {
        return FILTER_CATEGORIES_PER_TITLE[FilterTitle.Project].includes(f.value);
      });
      if (visibleProjectTitle) {
        tmpVisibleTitles.push(FilterTitle.Project);
      }
      const visibleOrganizationTitle = some(filters(), (f: FilterSection) => {
        return FILTER_CATEGORIES_PER_TITLE[FilterTitle.Organization].includes(f.value);
      });
      if (visibleOrganizationTitle) {
        tmpVisibleTitles.push(FilterTitle.Organization);
      }
      setVisibleTitles(tmpVisibleTitles);
    })
  );

  const getSection = (id: FilterCategory): FilterSection | undefined => {
    const section = filters().find((sec: FilterSection) => sec.value === id);
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

  const updateActiveFilters = (value: FilterCategory, options: string[]) => {
    const f: ActiveFilters = { ...tmpActiveFilters() };
    if (options.length === 0) {
      delete f[value];
    } else {
      f[value] = options;
    }
    setTmpActiveFilters(f);
  };

  const resetFilter = (name: FilterCategory) => {
    updateActiveFilters(name, []);
  };

  return (
    <>
      <div class="position-relative">
        <button
          title="Filters"
          class={`position-relative btn btn-sm btn-secondary text-white btn-sm rounded-0 py-0 me-0 me-lg-4 ${styles.filterBtn} btnIconMobile`}
          classList={{ disabled: disabledBtn() }}
          onClick={() => setVisibleFiltersModal(true)}
        >
          <div class="d-flex flex-row align-items-center">
            <SVGIcon kind={SVGIconKind.Filters} />
            <div class="d-none d-lg-block fw-semibold ps-2">Filters</div>
          </div>
        </button>
        <Show when={!isEmpty(props.initialActiveFilters())}>
          <div
            class={`d-block d-lg-none position-absolute p-1 border border-3 border-white bg-dark rounded-circle ${styles.dot}`}
          />
        </Show>
      </div>
      <Modal
        modalDialogClass={styles.modal}
        header={
          <div class="d-flex flex-row align-items-baseline">
            <div>Filters</div>
            <button
              type="button"
              title="Reset filters"
              class="btn btn-sm btn-link text-muted py-0"
              onClick={(e) => {
                e.preventDefault();
                setTmpActiveFilters({});
              }}
              aria-label="Reset filters"
            >
              (reset all)
            </button>
          </div>
        }
        footer={
          <div class="d-flex flex-row justify-content-between w-100">
            <div>
              <small class="d-none fst-italic text-muted">x items found</small>
            </div>
            <div>
              <button
                type="button"
                title="Apply filters"
                class="btn btn-sm btn-secondary text-uppercase fw-semibold text-white rounded-0"
                onClick={(e) => {
                  e.preventDefault();
                  props.applyFilters(tmpActiveFilters());
                  setVisibleFiltersModal(false);
                }}
                aria-label="Apply filters"
              >
                Apply
              </button>
            </div>
          </div>
        }
        open={visibleFiltersModal()}
        size="xl"
        onClose={() => setVisibleFiltersModal(false)}
      >
        <div class="p-0 p-lg-3">
          <Show
            when={!isUndefined(filtersFromData())}
            fallback={
              <div class="p-5 mt-3">
                <Loading />
              </div>
            }
          >
            <div class="row g-4 g-lg-5 mb-4 mb-lg-5">
              <SearchbarSection
                title="Location"
                placeholder="Search country"
                section={getSection(FilterCategory.Country)}
                initialActiveFilters={tmpActiveFilters}
                updateActiveFilters={updateActiveFilters}
                resetFilter={resetFilter}
              />
            </div>

            <Show when={visibleTitles().includes(FilterTitle.Project)}>
              <div class={`border-bottom text-uppercase fw-semibold ${styles.title}`}>{FilterTitle.Project}</div>
              <div class="row g-4 g-lg-5 mb-4 mb-lg-5">
                <Section
                  title="Status"
                  section={getSectionInPredefinedFilters(FilterCategory.Maturity)}
                  extraMaturity={getSection(FilterCategory.Maturity)}
                  activeFilters={{ ...tmpActiveFilters() }[FilterCategory.Maturity]}
                  updateActiveFilters={updateActiveFilters}
                  resetFilter={resetFilter}
                  sectionClass={styles.section}
                />

                <Section
                  title="TAG"
                  section={getSection(FilterCategory.TAG)}
                  activeFilters={{ ...tmpActiveFilters() }[FilterCategory.TAG]}
                  updateActiveFilters={updateActiveFilters}
                  resetFilter={resetFilter}
                  sectionClass={styles.section}
                />

                <SearchbarSection
                  title="License"
                  placeholder="Search license"
                  section={getSection(FilterCategory.License)}
                  initialActiveFilters={tmpActiveFilters}
                  updateActiveFilters={updateActiveFilters}
                  resetFilter={resetFilter}
                />

                <Section
                  title="Extra"
                  section={getSection(FilterCategory.Extra)}
                  activeFilters={{ ...tmpActiveFilters() }[FilterCategory.Extra]}
                  updateActiveFilters={updateActiveFilters}
                  resetFilter={resetFilter}
                  sectionClass={styles.section}
                />
              </div>
            </Show>

            <Show when={visibleTitles().includes(FilterTitle.Organization)}>
              <div class={`border-bottom text-uppercase fw-semibold ${styles.title}`}>{FilterTitle.Organization}</div>

              <div class="row g-4 g-lg-5 mb-4 mb-lg-5">
                <SearchbarSection
                  title="Name"
                  placeholder="Search organization"
                  section={getSection(FilterCategory.Organization)}
                  initialActiveFilters={tmpActiveFilters}
                  updateActiveFilters={updateActiveFilters}
                  resetFilter={resetFilter}
                />

                <SearchbarSection
                  section={getSection(FilterCategory.Industry)}
                  placeholder="Search industry"
                  initialActiveFilters={tmpActiveFilters}
                  updateActiveFilters={updateActiveFilters}
                  resetFilter={resetFilter}
                />

                <Section
                  title="Type"
                  section={getSectionInPredefinedFilters(FilterCategory.OrgType)}
                  activeFilters={{ ...tmpActiveFilters() }[FilterCategory.OrgType]}
                  updateActiveFilters={updateActiveFilters}
                  resetFilter={resetFilter}
                  sectionClass={styles.section}
                />
              </div>
            </Show>
          </Show>
        </div>
      </Modal>
    </>
  );
};

export default Filters;

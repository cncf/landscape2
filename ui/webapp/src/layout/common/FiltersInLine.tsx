import { useOutsideClick } from 'common';
import { Accessor, createSignal, For } from 'solid-js';

import { BANNER_ID } from '../../data';
import { ActiveFilters, FilterCategory, FilterSection } from '../../types';
import styles from './FiltersInLine.module.css';
import Section from './Section';

interface Props {
  filters: FilterSection[];
  updateActiveFilters: (value: FilterCategory, options: string[]) => void;
  resetFilters: () => void;
  initialActiveFilters: Accessor<ActiveFilters>;
}

interface FiltersProps {
  activeFilters?: string[];
  contentClassName?: string;
  section: FilterSection;
  withSearchBar?: boolean;
  updateActiveFilters: (value: FilterCategory, options: string[]) => void;
}

const Filters = (props: FiltersProps) => {
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [ref, setRef] = createSignal<HTMLDivElement>();
  useOutsideClick([ref], [BANNER_ID], visibleDropdown, () => setVisibleDropdown(false));

  const updateActiveFilters = (value: FilterCategory, options: string[]) => {
    setVisibleDropdown(false);
    props.updateActiveFilters(value, options);
  };

  return (
    <div class={`me-4 ${styles.dropdownWrapper}`}>
      <div ref={setRef} class="position-relative">
        <button
          class={`btn btn-md btn-light text-decoration-none rounded-0 text-truncate text-start w-100 ${styles.btn}`}
          type="button"
          onClick={() => setVisibleDropdown(!visibleDropdown())}
          aria-label="Filters button"
          aria-expanded={visibleDropdown()}
        >
          {props.section.title}
        </button>

        <div
          role="menu"
          class={`dropdown-menu rounded-0 overflow-y-auto ${styles.dropdown}`}
          classList={{
            show: visibleDropdown(),
          }}
        >
          <div class="ms-2 ms-xl-3 mt-2">
            <Section
              section={props.section}
              activeFilters={props.activeFilters}
              updateActiveFilters={updateActiveFilters}
              device="desktop"
              onlyChecks
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const FiltersInLine = (props: Props) => {
  return (
    <>
      <div class="d-flex flex-row align-items-baseline my-2">
        <div class={`text-uppercase text-primary fw-bold ${styles.title}`}>Filters</div>
      </div>
      <div class="d-flex flex-row align-items-top">
        <For each={props.filters}>
          {(section: FilterSection) => {
            return (
              <Filters
                section={section}
                activeFilters={props.initialActiveFilters()[section.value]}
                updateActiveFilters={props.updateActiveFilters}
              />
            );
          }}
        </For>
      </div>
    </>
  );
};

export default FiltersInLine;

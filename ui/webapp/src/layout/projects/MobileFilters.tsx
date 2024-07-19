import { SVGIcon, SVGIconKind } from 'common';
import isEmpty from 'lodash/isEmpty';
import { Accessor, createSignal, For, JSXElement, Show } from 'solid-js';

import { ActiveFilters, FilterCategory, FilterSection } from '../../types';
import Section from '../common/Section';
import { Sidebar } from '../common/Sidebar';
import styles from './MobileFilters.module.css';

interface Props {
  filters: FilterSection[];
  updateActiveFilters: (value: FilterCategory, options: string[]) => void;
  resetFilters: () => void;
  initialActiveFilters: Accessor<ActiveFilters>;
  children: JSXElement;
}

const MobileFilters = (props: Props) => {
  const [openSidebar, setOpenSidebar] = createSignal<boolean>(false);

  return (
    <div>
      <div class="position-relative">
        <button
          title="Filters"
          class={`position-relative btn btn-sm btn-secondary text-white btn-sm rounded-0 py-0 me-0 me-md-4 ${styles.filterBtn} btnIconMobile me-3`}
          onClick={() => setOpenSidebar(true)}
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
      <Sidebar
        label="Filters"
        header={
          <div class="d-flex flex-row align-items-beseline">
            <div>Filters</div>
            <Show when={!isEmpty(props.initialActiveFilters())}>
              <button
                type="button"
                title="Reset filters"
                onClick={() => {
                  props.resetFilters();
                  setOpenSidebar(false);
                }}
                class="btn btn-sm btn-link text-muted py-0"
                aria-label="Reset filters"
              >
                (reset all)
              </button>
            </Show>
          </div>
        }
        visibleButton={false}
        open={openSidebar()}
        onOpenStatusChange={() => setOpenSidebar(false)}
      >
        <div class="position-relative p-3">
          <div class="mb-4">
            <div class="d-flex flex-row align-items-center pb-2">
              <small class={`fw-semibold me-2 ${styles.title}`}>Order</small>
            </div>
            {props.children}
          </div>

          <div class="row g-4 g-lg-5 mb-4 mb-lg-5">
            <For each={props.filters}>
              {(section: FilterSection) => {
                return (
                  <Section
                    section={section}
                    activeFilters={props.initialActiveFilters()[section.value]}
                    updateActiveFilters={props.updateActiveFilters}
                    colClass="col-12"
                    sectionClass={`border p-2 overflow-y-auto ${styles.checksList}`}
                    device="mobile"
                  />
                );
              }}
            </For>
          </div>
        </div>
      </Sidebar>
    </div>
  );
};

export default MobileFilters;

import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import { For, Show } from 'solid-js';

import { FilterCategory, FilterOption, FilterSection } from '../../../types';
import getFoundationNameLabel from '../../../utils/getFoundationNameLabel';
import CheckBox from '../../common/Checkbox';
import styles from './Section.module.css';

interface Props {
  section?: FilterSection;
  extraMaturity?: FilterSection;
  activeFilters?: string[];
  title?: string;
  inLine?: boolean;
  updateActiveFilters: (value: FilterCategory, options: string[]) => void;
  resetFilter: (value: FilterCategory) => void;
}

const Section = (props: Props) => {
  const onChange = (name: FilterCategory, value: string, checked: boolean, subOtps?: string[]) => {
    let tmpActiveFilters: string[] = props.activeFilters ? [...props.activeFilters] : [];
    if (!checked) {
      if (props.activeFilters) {
        tmpActiveFilters = props.activeFilters.filter((f: string) => f !== value && !(subOtps || []).includes(f));
      }
    } else {
      if (isUndefined(subOtps)) {
        tmpActiveFilters.push(value);
      } else {
        tmpActiveFilters = [...tmpActiveFilters, ...subOtps];
        tmpActiveFilters.push(value);
        tmpActiveFilters = [...new Set(tmpActiveFilters)];
      }
    }

    // Remove foundation value from maturity category when no more options
    if (name === FilterCategory.Maturity) {
      if (isEqual(tmpActiveFilters, [window.baseDS.foundation.toLowerCase()])) {
        tmpActiveFilters = [];
      }
    }
    props.updateActiveFilters(name, tmpActiveFilters);
  };

  const visibleSection = (): boolean => {
    if (isUndefined(props.section)) {
      return false;
    }
    if (props.section.value === FilterCategory.Maturity && isUndefined(props.extraMaturity)) {
      return false;
    }
    return true;
  };

  return (
    <Show when={visibleSection()}>
      <div class="col-12 col-sm-6 col-lg-4">
        <div class="d-flex flex-column h-100">
          <div class="d-flex flex-row align-items-center pb-2">
            <small class={`fw-semibold me-2 ${styles.title}`}>{props.title || props.section!.title}</small>
            <Show when={props.activeFilters}>
              <button
                class={`btn btn-sm btn-link text-muted lh-1 align-baseline p-0 ${styles.resetBtn}`}
                onClick={() => props.resetFilter(props.section?.value as FilterCategory)}
              >
                (reset)
              </button>
            </Show>
          </div>
          <div class={`postion-relative w-100 border p-0 p-sm-3 flex-grow-1 ${styles.section}`}>
            <div classList={{ 'd-flex flex-row': props.inLine }}>
              <For each={props.section!.options}>
                {(opt: FilterOption) => {
                  let subOpts: string[];
                  let suboptions = opt.suboptions;
                  if (
                    opt.value === getFoundationNameLabel() &&
                    props.section?.value === FilterCategory.Maturity &&
                    !isUndefined(props.extraMaturity)
                  ) {
                    suboptions = props.extraMaturity.options;
                    subOpts = props.extraMaturity.options.map((subOpt: FilterOption) => subOpt.value);
                  } else if (opt.suboptions) {
                    subOpts = opt.suboptions.map((subOpt: FilterOption) => subOpt.value);
                  }

                  return (
                    <div classList={{ 'me-3': props.inLine }} class={styles.checks}>
                      <CheckBox
                        name={props.section!.value!}
                        value={opt.value}
                        labelClass={`mw-100 text-muted ${styles.label}`}
                        class={isUndefined(props.inLine) ? 'my-2' : 'mt-2'}
                        label={opt.name}
                        checked={(props.activeFilters || []).includes(opt.value)}
                        onChange={(value: string, checked: boolean) =>
                          onChange(props.section!.value!, value, checked, subOpts)
                        }
                      />
                      <div class="ms-3">
                        <Show when={suboptions}>
                          <For each={suboptions}>
                            {(subOpt: FilterOption) => (
                              <CheckBox
                                name={props.section!.value!}
                                value={subOpt.value}
                                labelClass={`mw-100 text-muted ${styles.label}`}
                                class={isUndefined(props.inLine) ? 'my-2' : 'mt-2'}
                                label={subOpt.name}
                                checked={(props.activeFilters || []).includes(subOpt.value)}
                                onChange={(value: string, checked: boolean) =>
                                  onChange(props.section!.value!, value, checked)
                                }
                              />
                            )}
                          </For>
                        </Show>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default Section;

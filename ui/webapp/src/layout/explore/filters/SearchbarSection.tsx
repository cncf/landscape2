import { SVGIcon, SVGIconKind } from 'common';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import { Accessor, createEffect, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js';

import { ActiveFilters, FilterCategory, FilterOption, FilterSection } from '../../../types';
import CheckBox from '../../common/Checkbox';
import styles from './SearchbarSection.module.css';

export interface Props {
  title?: string;
  placeholder?: string;
  section?: FilterSection;
  extraOptions?: { [key: string]: FilterSection };
  initialActiveFilters: Accessor<ActiveFilters>;
  updateActiveFilters: (value: FilterCategory, options: string[]) => void;
  resetFilter: (value: FilterCategory) => void;
}

const SEARCH_DELAY = 3 * 100; // 300ms

const SearchbarSection = (props: Props) => {
  const [inputEl, setInputEl] = createSignal<HTMLInputElement>();
  const [value, setValue] = createSignal<string>('');
  const [searchTimeout, setSearchTimeout] = createSignal<number | null>(null);
  const [visibleOptions, setVisibleOptions] = createSignal<FilterOption[]>([]);
  const [activeFilters, setActiveFilters] = createSignal<string[]>([]);

  const getActiveFilters = (): string[] => {
    if (!isUndefined(props.initialActiveFilters) && !isUndefined(props.section)) {
      return props.initialActiveFilters()[props.section.value] || [];
    }
    return [];
  };

  const sortOptions = (opts: FilterOption[]): FilterOption[] => {
    if (activeFilters().length === 0) {
      return opts;
    } else {
      // eslint-disable-next-line solid/reactivity
      return sortBy(opts, (opt: FilterOption) => !activeFilters()!.includes(opt.value));
    }
  };

  const onChange = (value: string, checked: boolean) => {
    let tmpActiveFilters: string[] = [...activeFilters()];
    if (!checked) {
      if (activeFilters().length > 0) {
        tmpActiveFilters = activeFilters().filter((f: string) => f !== value);
      }
    } else {
      tmpActiveFilters.push(value);
    }
    if (props.section) {
      props.updateActiveFilters(props.section.value, tmpActiveFilters);
    }
  };

  const cleanSearchValue = () => {
    setValue('');
    forceFocus();
  };

  const forceBlur = (): void => {
    if (inputEl()) {
      inputEl()!.blur();
    }
  };

  const forceFocus = (): void => {
    if (inputEl()) {
      inputEl()!.focus();
    }
  };

  const search = () => {
    filterOptions();
    forceBlur();
  };

  const filterOptions = () => {
    if (!isUndefined(props.section)) {
      if (value() !== '') {
        setVisibleOptions(
          sortOptions(
            props.section.options.filter(
              (f: FilterOption) =>
                (f.value && f.value.toLowerCase().includes(value().toLowerCase())) ||
                f.name.toLowerCase().includes(value().toLowerCase())
            )
          )
        );
      } else {
        setVisibleOptions(sortOptions(props.section.options));
      }
    }
  };

  createEffect(
    on(props.initialActiveFilters, () => {
      const newActive = getActiveFilters();
      setActiveFilters(newActive);
      filterOptions();
    })
  );

  createEffect(
    on(value, () => {
      if (!isNull(searchTimeout())) {
        clearTimeout(searchTimeout()!);
      }
      setSearchTimeout(() => {
        return setTimeout(() => {
          filterOptions();
        }, SEARCH_DELAY);
      });
    })
  );

  onMount(() => {
    if (!isUndefined(props.section)) {
      setVisibleOptions(sortOptions(props.section.options));
      setActiveFilters(getActiveFilters());
    }
  });

  onCleanup(() => {
    if (searchTimeout()) {
      clearTimeout(searchTimeout()!);
    }
  });

  return (
    <Show when={!isUndefined(props.section)}>
      <div class="col-12 col-sm-6 col-lg-4">
        <div class="d-flex flex-column h-100">
          <div class="d-flex flex-row align-items-center pb-2">
            <small class={`fw-semibold me-2 ${styles.title}`}>{props.title || props.section!.title}</small>
            <Show when={activeFilters().length > 0}>
              <button
                class={`btn btn-sm btn-link text-muted lh-1 align-baseline p-0 ${styles.resetBtn}`}
                onClick={() => props.resetFilter(props.section?.value as FilterCategory)}
              >
                (reset)
              </button>
            </Show>
          </div>
          <div class={`postion-relative w-100 flex-grow-1 ${styles.section}`}>
            <div
              class={`d-flex align-items-center overflow-hidden position-relative searchBar lh-base bg-white ${styles.searchBar} search`}
            >
              <input
                ref={setInputEl}
                class={`flex-grow-1 border-0 shadow-none bg-transparent lh-base ps-2 ${styles.input}`}
                placeholder={props.placeholder || 'Search'}
                type="text"
                value={value()}
                autocomplete="off"
                autocorrect="off"
                autocapitalize="none"
                spellcheck={false}
                onBlur={() => setValue('')}
                onInput={(e) => setValue(e.currentTarget.value)}
              />

              <Show when={value() !== ''}>
                <button
                  title="Clear search"
                  aria-label="Clear search"
                  class={`btn btn-link text-muted lh-1 px-2 ${styles.btnIcon}`}
                  onClick={cleanSearchValue}
                >
                  <SVGIcon kind={SVGIconKind.Clear} />
                </button>
                <div class={`vr ${styles.vr}`} />
              </Show>

              <button
                title="Search text"
                aria-label="Search text"
                class={`btn btn-link lh-1 px-2 ${styles.btnIcon}`}
                onClick={search}
              >
                <div class={`${styles.iconWrapper}`}>
                  <SVGIcon kind={SVGIconKind.Search} />
                </div>
              </button>
            </div>

            <div class={`overflow-auto ${styles.list} visibleScroll`} role="listbox">
              <div class="py-2 px-0 px-sm-3">
                <Show
                  when={visibleOptions().length > 0}
                  fallback={
                    <div class="py-4 text-center">
                      We can't seem to find any result that match your search for <span class="fw-bold">{value()}</span>
                    </div>
                  }
                >
                  <For each={visibleOptions()}>
                    {(opt: FilterOption) => {
                      return (
                        <>
                          <CheckBox
                            name={props.section?.value as string}
                            value={opt.value}
                            labelClass={`mw-100 text-muted ${styles.label}`}
                            class="my-1"
                            label={opt.name}
                            checked={activeFilters().includes(opt.value)}
                            onChange={(value: string, checked: boolean) => onChange(value, checked)}
                          />
                          <Show when={!isUndefined(props.extraOptions) && props.extraOptions[opt.value]}>
                            <div class="ms-3">
                              <For each={props.extraOptions![opt.value].options}>
                                {(subOpt: FilterOption) => (
                                  <CheckBox
                                    name={props.extraOptions![opt.value].value}
                                    value={subOpt.value}
                                    labelClass={`mw-100 text-muted ${styles.label}`}
                                    class="my-1"
                                    label={subOpt.name}
                                    checked={activeFilters().includes(subOpt.value)}
                                    onChange={(value: string, checked: boolean) => onChange(value, checked)}
                                  />
                                )}
                              </For>
                            </div>
                          </Show>
                        </>
                      );
                    }}
                  </For>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default SearchbarSection;

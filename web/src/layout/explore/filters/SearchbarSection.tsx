import { ChangeEvent, useEffect, useRef, useState } from 'react';

import styles from './SearchbarSection.module.css';
import { CheckBox } from '../../common/Checkbox';
import { FilterCategory, FilterOption, FilterSection } from '../../../types';
import { sortBy } from 'lodash';

export interface Props {
  title?: string;
  placeholder?: string;
  section?: FilterSection;
  activeFilters?: string[];
  updateActiveFilters: (value: FilterCategory, options: string[]) => void;
  resetFilter: (value: FilterCategory) => void;
}

const SEARCH_DELAY = 3 * 100; // 300ms

const SearchbarSection = (props: Props) => {
  const sortOptions = (opts: FilterOption[]): FilterOption[] => {
    return sortBy(opts, (opt: FilterOption) => !(props.activeFilters || []).includes(opt.value));
  };

  const inputEl = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>('');
  const [visibleOptions, setVisibleOptions] = useState<FilterOption[]>(
    props.section ? sortOptions(props.section.options) : []
  );
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const onChange = (value: string, checked: boolean) => {
    let tmpActiveFilters: string[] = props.activeFilters ? [...props.activeFilters] : [];
    if (!checked) {
      if (props.activeFilters) {
        tmpActiveFilters = props.activeFilters.filter((f: string) => f !== value);
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
    if (inputEl !== null && inputEl.current !== null) {
      inputEl.current.blur();
    }
  };

  const forceFocus = (): void => {
    if (inputEl !== null && inputEl.current !== null) {
      inputEl.current.focus();
    }
  };

  const search = () => {
    filterOptions();
    forceBlur();
  };

  const filterOptions = () => {
    if (value !== '' && props.section) {
      setVisibleOptions(
        sortOptions(
          props.section.options.filter(
            (f: FilterOption) =>
              (f.value && f.value.toLowerCase().includes(value.toLowerCase())) ||
              f.name.toLowerCase().includes(value.toLowerCase())
          )
        )
      );
    } else {
      setVisibleOptions(props.section ? sortOptions(props.section.options) : []);
    }
  };

  useEffect(() => {
    filterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.activeFilters]);

  useEffect(() => {
    if (searchTimeout !== null) {
      clearTimeout(searchTimeout);
    }
    setSearchTimeout(
      setTimeout(() => {
        filterOptions();
      }, SEARCH_DELAY)
    );
  }, [value]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (props.section === undefined) return null;

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex flex-row align-items-center pb-3">
        <small className={`fw-semibold me-2 ${styles.title}`}>{props.title || props.section.title}</small>
        {props.activeFilters && (
          <button
            className={`btn btn-sm btn-link text-muted lh-1 align-baseline p-0 ${styles.resetBtn}`}
            onClick={() => props.resetFilter(props.section?.value as FilterCategory)}
          >
            (reset)
          </button>
        )}
      </div>
      <div className="postion-relative w-100 border flex-grow-1">
        <div
          className={`d-flex align-items-center overflow-hidden position-relative searchBar lh-base bg-white ${styles.searchBar} search`}
        >
          <input
            data-testid="search-bar"
            ref={inputEl}
            className={`flex-grow-1 border-0 shadow-none bg-transparent lh-base ps-2 ${styles.input}`}
            placeholder={props.placeholder || 'Search'}
            type="text"
            value={value}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            onBlur={() => setValue('')}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
          />

          {value !== '' && (
            <>
              <button
                title="Clear search"
                aria-label="Clear search"
                className={`btn btn-link text-muted lh-1 px-2 ${styles.btnIcon}`}
                onClick={cleanSearchValue}
              >
                <svg
                  stroke="currentColor"
                  fill="currentColor"
                  strokeWidth="0"
                  viewBox="0 0 512 512"
                  height="1em"
                  width="1em"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M400 145.49L366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49z"></path>
                </svg>
              </button>
              <div className={`vr ${styles.vr}`} />
            </>
          )}

          <button
            title="Search text"
            aria-label="Search text"
            className={`btn btn-link lh-1 px-2 ${styles.btnIcon}`}
            onClick={search}
          >
            <div className={`${styles.iconWrapper}`}>
              <svg
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </button>
        </div>

        <div className={`overflow-auto ${styles.list} visibleScroll`} role="listbox">
          <div className="py-2 px-3">
            {visibleOptions.length > 0 ? (
              <>
                {visibleOptions.map((opt: FilterOption) => {
                  return (
                    <CheckBox
                      key={`filter_${opt.value}`}
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      name={props.section!.value}
                      value={opt.value}
                      labelClassName="mw-100 text-muted"
                      className="my-1"
                      label={opt.name}
                      checked={(props.activeFilters || []).includes(opt.value)}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value, e.target.checked)}
                    />
                  );
                })}
              </>
            ) : (
              <div className="py-4 text-center">Lorem ipsum....</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchbarSection;

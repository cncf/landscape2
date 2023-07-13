import { ChangeEvent, useEffect, useRef, useState } from 'react';

import styles from './SearchbarSection.module.css';
import { CheckBox } from '../../common/Checkbox';
import { FilterCategory, FilterOption, FilterSection } from '../../../types';

export interface Props {
  title?: string;
  section?: FilterSection;
  activeFilters?: string[];
  updateActiveFilters: (value: FilterCategory, options: string[]) => void;
}

const SEARCH_DELAY = 3 * 100; // 300ms

const SearchbarSection = (props: Props) => {
  const inputEl = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>('');
  const [visibleOptions, setVisibleOptions] = useState<FilterOption[] | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [visibleDropdown, setVisibleDropdown] = useState<boolean>(false);

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
        props.section.options.filter(
          (f: FilterOption) =>
            (f.value && f.value.toLowerCase().includes(value.toLowerCase())) ||
            f.name.toLowerCase().includes(value.toLowerCase())
        )
      );
      setVisibleDropdown(true);
    } else {
      setVisibleOptions(null);
      setVisibleDropdown(false);
    }
  };

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
    <>
      <div className="postion-relative w-100">
        <div
          className={`d-flex align-items-center overflow-hidden position-relative searchBar lh-base bg-white ${styles.searchBar} search`}
        >
          <input
            data-testid="search-bar"
            ref={inputEl}
            className={`flex-grow-1 border-0 shadow-none bg-transparent lh-base ${styles.input}`}
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
        <small className={`text-muted pb-2 ${styles.legend}`}>{props.title || props.section.title}</small>

        {props.activeFilters && (
          <div>
            {props.activeFilters.map((f: string) => {
              return (
                <div key={`f_${f}`} className={`d-flex flex-row align-items-center w-100 ${styles.activeFilter}`}>
                  <div className="flex-grow-1 text-truncate me-2">{f}</div>
                  <button
                    title={`Remove ${f} filter`}
                    aria-label={`Remove ${f} filter`}
                    className="btn btn-sm btn-link text-end text-decoration-none"
                    onClick={() => onChange(f, false)}
                  >
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      strokeWidth="0"
                      viewBox="0 0 512 512"
                      className={styles.closeIcon}
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M256 90c44.3 0 86 17.3 117.4 48.6C404.7 170 422 211.7 422 256s-17.3 86-48.6 117.4C342 404.7 300.3 422 256 422s-86-17.3-117.4-48.6C107.3 342 90 300.3 90 256s17.3-86 48.6-117.4C170 107.3 211.7 90 256 90m0-42C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48z"></path>
                      <path d="M360 330.9L330.9 360 256 285.1 181.1 360 152 330.9l74.9-74.9-74.9-74.9 29.1-29.1 74.9 74.9 74.9-74.9 29.1 29.1-74.9 74.9z"></path>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {visibleDropdown && visibleOptions !== null && (
          <div
            className={`position-absolute dropdown-menu dropdown-menu-left p-0 shadow-sm rounded-0 show noFocus overflow-auto ${styles.dropdown} ${styles.visibleScroll}`}
            role="listbox"
          >
            <div className="mt-2 p-3">
              {visibleOptions.length > 0 ? (
                <>
                  {visibleOptions.map((opt: FilterOption) => {
                    return (
                      <CheckBox
                        key={`filter_${opt.value}`}
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        name={props.section!.value}
                        value={opt.value}
                        labelClassName="mw-100"
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
        )}
      </div>
    </>
  );
};

export default SearchbarSection;

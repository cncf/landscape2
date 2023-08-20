import { isNull, isUndefined, sortBy } from 'lodash';
import { ChangeEvent, memo, useCallback, useEffect, useRef, useState } from 'react';

import { FilterCategory, FilterOption, FilterSection, SVGIconKind } from '../../../types';
import { CheckBox } from '../../common/Checkbox';
import SVGIcon from '../../common/SVGIcon';
import styles from './SearchbarSection.module.css';

export interface Props {
  title?: string;
  placeholder?: string;
  section?: FilterSection;
  activeFilters?: string[];
  updateActiveFilters: (value: FilterCategory, options: string[]) => void;
  resetFilter: (value: FilterCategory) => void;
}

const SEARCH_DELAY = 3 * 100; // 300ms

const SearchbarSection = memo(function SearchbarSection(props: Props) {
  const inputEl = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const activeFiltersRef = useRef(props.activeFilters); // Ref to activeFilters to use from setTimeout
  activeFiltersRef.current = props.activeFilters;

  const sortOptions = (opts: FilterOption[]): FilterOption[] => {
    return sortBy(opts, (opt: FilterOption) => !(activeFiltersRef.current || []).includes(opt.value));
  };

  const [visibleOptions, setVisibleOptions] = useState<FilterOption[]>(
    props.section ? sortOptions(props.section.options) : []
  );

  const onChange = useCallback(
    (value: string, checked: boolean) => {
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
    },
    [props]
  );

  const cleanSearchValue = () => {
    setValue('');
    forceFocus();
  };

  const forceBlur = (): void => {
    if (!isNull(inputEl) && !isNull(inputEl.current)) {
      inputEl.current.blur();
    }
  };

  const forceFocus = (): void => {
    if (!isNull(inputEl) && !isNull(inputEl.current)) {
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
    if (!isNull(searchTimeout)) {
      clearTimeout(searchTimeout);
    }
    setSearchTimeout(() => {
      return setTimeout(() => {
        filterOptions();
      }, SEARCH_DELAY);
    });
  }, [value]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (isUndefined(props.section)) return null;

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
                <SVGIcon kind={SVGIconKind.Clear} />
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
              <SVGIcon kind={SVGIconKind.Search} />
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
                      name={props.section?.value as string}
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
              <div className="py-4 text-center">
                We can't seem to find any result that match your search for <span className="fw-bold">{value}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default SearchbarSection;

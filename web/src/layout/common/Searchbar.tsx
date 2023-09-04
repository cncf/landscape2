import classNames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, KeyboardEvent, useContext, useEffect, useRef, useState } from 'react';

import { useOutsideClick } from '../../hooks/useOutsideClick';
import { BaseItem, SVGIconKind } from '../../types';
import { ActionsContext, AppActionsContext } from '../context/AppContext';
import HoverableItem from './HoverableItem';
import MaturityBadge from './MaturityBadge';
import styles from './Searchbar.module.css';
import SVGIcon from './SVGIcon';

interface Props {
  items: BaseItem[];
}

const SEARCH_DELAY = 3 * 100; // 300ms
const MIN_CHARACTERS_SEARCH = 2;

const Searchbar = (props: Props) => {
  const { updateActiveItemId } = useContext(AppActionsContext) as ActionsContext;
  const inputEl = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef(null);
  const [value, setValue] = useState<string>('');
  const [itemsList, setItemsList] = useState<BaseItem[] | null>(null);
  const [visibleDropdown, setVisibleDropdown] = useState<boolean>(false);
  const [highlightedItem, setHighlightedItem] = useState<number | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);

  useOutsideClick([dropdownRef], visibleDropdown, () => {
    setValue('');
    cleanItemsSearch();
  });

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    switch (e.key) {
      case 'Escape':
        cleanItemsSearch();
        return;
      case 'ArrowDown':
        updateHighlightedItem('down');
        return;
      case 'ArrowUp':
        updateHighlightedItem('up');
        return;
      case 'Enter':
        e.preventDefault();
        if (!isNull(itemsList) && !isNull(highlightedItem)) {
          if (highlightedItem === itemsList.length) {
            search();
          } else {
            const selectedProject = itemsList[highlightedItem];
            if (selectedProject) {
              openItemModal(selectedProject.id);
            }
          }
        } else {
          search();
        }
        return;
      default:
        return;
    }
  };

  const openItemModal = (selectedItemId: string) => {
    forceBlur();
    setValue('');
    cleanItemsSearch();
    updateActiveItemId(selectedItemId);
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

  const onSearch = (text: string) => {
    const filteredItems = props.items.filter((item: BaseItem) => {
      const re = new RegExp(text, 'i');
      if (re.test(item.name)) {
        return item;
      }
    });
    if (filteredItems.length > 0) {
      const isInputFocused = inputEl.current === document.activeElement;
      // We have to be sure that input has focus to display results
      if (isInputFocused) {
        setItemsList(filteredItems);
        setVisibleDropdown(true);
      } else {
        cleanItemsSearch();
      }
    } else {
      cleanItemsSearch();
    }
  };

  const search = () => {
    onSearch(value);
    cleanTimeout();
    cleanItemsSearch();
    forceBlur();
  };

  const cleanTimeout = () => {
    if (!isNull(dropdownTimeout)) {
      clearTimeout(dropdownTimeout);
      setDropdownTimeout(null);
    }
  };

  const cleanSearchValue = () => {
    setValue('');
    forceFocus();
  };

  const cleanItemsSearch = () => {
    setItemsList(null);
    setVisibleDropdown(false);
    setHighlightedItem(null);
  };

  const updateHighlightedItem = (arrow: 'up' | 'down') => {
    if (!isNull(itemsList) && visibleDropdown) {
      if (!isNull(highlightedItem)) {
        let newIndex: number = arrow === 'up' ? highlightedItem - 1 : highlightedItem + 1;
        if (newIndex > itemsList.length) {
          newIndex = 0;
        }
        if (newIndex < 0) {
          newIndex = itemsList.length;
        }
        setHighlightedItem(newIndex);
        scrollToHighlightedItem(newIndex);
      } else {
        if (itemsList && itemsList.length > 0) {
          const newIndex = arrow === 'up' ? itemsList.length - 1 : 0;
          setHighlightedItem(newIndex);
          scrollToHighlightedItem(newIndex);
        }
      }
    }
  };

  const scrollToHighlightedItem = (index: number) => {
    const element = document.getElementById(`sl-opt${index}`);
    if (element && dropdownRef && dropdownRef.current) {
      element.scrollIntoView(false);
    }
  };

  useEffect(() => {
    const isInputFocused = inputEl.current === document.activeElement;
    if (value.length >= MIN_CHARACTERS_SEARCH && isInputFocused) {
      cleanTimeout();
      setDropdownTimeout(
        setTimeout(() => {
          setHighlightedItem(null);
          onSearch(value);
        }, SEARCH_DELAY)
      );
    }

    return () => {
      if (!isNull(dropdownTimeout)) {
        clearTimeout(dropdownTimeout);
      }
    };
  }, [value]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <div
        className={`d-flex align-items-center overflow-hidden searchBar lh-base bg-white mx-auto ${styles.searchBar} search`}
      >
        <input
          data-testid="search-bar"
          ref={inputEl}
          className={`flex-grow-1 ps-2 ps-md-3 border-0 shadow-none bg-transparent lh-base ${styles.input}`}
          type="text"
          value={value}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          placeholder="Search projects, products and members"
          onKeyDown={onKeyDown}
          onBlur={() => setValue('')}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        />

        {value !== '' && (
          <>
            <button
              title="Clear text"
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

      {visibleDropdown && !isNull(itemsList) && (
        <div
          ref={dropdownRef}
          className={`dropdown-menu dropdown-menu-left p-0 shadow-sm w-100 rounded-0 show noFocus overflow-auto ${styles.dropdown} ${styles.visibleScroll}`}
          role="listbox"
          id="search-list"
        >
          <HoverableItem onLeave={() => setHighlightedItem(null)}>
            {itemsList.map((item: BaseItem, index: number) => {
              return (
                <HoverableItem
                  key={`item_${item.name}`}
                  onHover={() => setHighlightedItem(index)}
                  onLeave={() => setHighlightedItem(null)}
                >
                  <button
                    type="button"
                    className={classNames(
                      'btn btn-link text-decoration-none text-black w-100 border-bottom rounded-0 d-flex flex-row align-items-stretch p-3',
                      styles.btnProject,
                      { [styles.activeDropdownItem]: index === highlightedItem }
                    )}
                    onClick={() => {
                      openItemModal(item.id);
                    }}
                    aria-label={`Open ${item.name} detail`}
                    role="option"
                    aria-selected={index === highlightedItem}
                    id={`sl-opt${index}`}
                  >
                    <div className="d-flex flex-row align-items-center w-100">
                      <div
                        className={`d-flex align-items-center justify-content-center me-3 ${styles.miniImageWrapper}`}
                      >
                        <img
                          alt={`${item.name} logo`}
                          className={`m-auto ${styles.logo}`}
                          src={import.meta.env.MODE === 'development' ? `../../static/${item.logo}` : `${item.logo}`}
                        />
                      </div>
                      <div
                        className={`flex-grow-1 d-flex flex-column text-start justify-content-between h-100 ${styles.truncateWrapper}`}
                      >
                        <div className="d-flex flex-row align-items-baseline">
                          <span className={`text-truncate fw-semibold ${styles.title}`}>{item.name}</span>
                          {!isUndefined(item.maturity) && (
                            <div className={`d-flex flex-nowrap position-relative ${styles.badges}`}>
                              <div
                                title="CNCF"
                                className={`d-none d-xxl-flex badge rounded-0 bg-primary ms-2 ${styles.badge}`}
                              >
                                CNCF
                              </div>

                              <MaturityBadge level={item.maturity} className={`ms-2 ${styles.badge}`} />
                            </div>
                          )}
                        </div>
                        <div className={`text-muted text-truncate ${styles.legend}`}>
                          {item.category} / {item.subcategory}
                        </div>
                      </div>
                    </div>
                  </button>
                </HoverableItem>
              );
            })}
          </HoverableItem>
        </div>
      )}
    </>
  );
};

export default Searchbar;

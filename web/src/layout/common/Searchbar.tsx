import classNames from 'classnames';
import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

import { useOutsideClick } from '../../hooks/useOutsideClick';
import HoverableItem from './HoverableItem';
import styles from './Searchbar.module.css';
import { BaseItem } from '../../types';

interface Props {
  items: BaseItem[];
  openItem: (item: BaseItem) => void;
}

const SEARCH_DELAY = 3 * 100; // 300ms
const MIN_CHARACTERS_SEARCH = 2;

const Searchbar = (props: Props) => {
  const inputEl = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef(null);
  const [value, setValue] = useState<string>('');
  const [itemsList, setItemsList] = useState<BaseItem[] | null>(null);
  const [visibleDropdown, setVisibleDropdown] = useState<boolean>(false);
  const [highlightedItem, setHighlightedItem] = useState<number | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);

  useOutsideClick([dropdownRef], visibleDropdown, () => {
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
        if (itemsList !== null && highlightedItem !== null) {
          if (highlightedItem === itemsList.length) {
            search();
          } else {
            const selectedProject = itemsList[highlightedItem];
            if (selectedProject) {
              openItemModal(selectedProject);
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

  const openItemModal = (selectedItem: BaseItem) => {
    forceBlur();
    setValue('');
    cleanItemsSearch();
    props.openItem(selectedItem);
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
    if (dropdownTimeout !== null) {
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
    if (itemsList !== null && visibleDropdown) {
      if (highlightedItem !== null) {
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
      if (dropdownTimeout !== null) {
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
          onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        />

        {value !== '' && (
          <>
            <button
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

        <button aria-label="Search text" className={`btn btn-link lh-1 px-2 ${styles.btnIcon}`} onClick={search}>
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

      {visibleDropdown && itemsList !== null && (
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
                      'btn btn-link text-black w-100 border-bottom rounded-0 d-flex flex-row align-items-stretch text-decoration-none p-3',
                      styles.btnProject,
                      { [styles.activeDropdownItem]: index === highlightedItem }
                    )}
                    onClick={() => {
                      openItemModal(item);
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
                      <div className={`flex-grow-1 d-flex flex-column ${styles.truncateWrapper}`}>
                        <div className="d-flex flex-row justify-content-between align-items-end">
                          <span className={`text-truncate fw-semibold mb-0 ${styles.title}`}>{item.name}</span>
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

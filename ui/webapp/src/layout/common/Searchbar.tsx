import { BANNER_ID, FoundationBadge, Image, MaturityBadge, SVGIcon, SVGIconKind, useOutsideClick } from 'common';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { SearchResult } from 'minisearch';
import { batch, createEffect, createSignal, createUniqueId, For, on, onCleanup, onMount, Show } from 'solid-js';

import { FOUNDATION } from '../../data';
import searchEngine from '../../utils/search';
import { useUpdateActiveItemId } from '../stores/activeItem';
import HoverableItem from './HoverableItem';
import styles from './Searchbar.module.css';

interface Props {
  searchBarClass?: string;
  device: string;
}

const SEARCH_DELAY = 3 * 100; // 300ms
const MIN_CHARACTERS_SEARCH = 2;

const Searchbar = (props: Props) => {
  const updateActiveItemId = useUpdateActiveItemId();
  const listId = `search-list-${createUniqueId()}`;
  const [inputEl, setInputEl] = createSignal<HTMLInputElement>();
  const [wrapperRef, setWrapperRef] = createSignal<HTMLDivElement>();
  const [dropdownRef, setDropdownRef] = createSignal<HTMLDivElement>();
  const [value, setValue] = createSignal<string>('');
  const [itemsList, setItemsList] = createSignal<SearchResult[] | null>(null);
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [highlightedItem, setHighlightedItem] = createSignal<number | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [keyboardFocus, setKeyboardFocus] = createSignal<boolean>(false);
  let searchTimeout: ReturnType<typeof setTimeout> | undefined;
  // Query the listed results belong to
  let listedQuery: string | null = null;
  // Whether the last interaction used a pointer; keyboard focus shows the focus ring of the search bar
  let pointerInteraction = false;

  const optionId = (index: number): string => `${listId}-opt${index}`;
  const visibleResults = () => visibleDropdown() && (itemsList()?.length ?? 0) > 0;
  const activeDescendant = () => {
    const index = highlightedItem();
    return visibleResults() && !isNull(index) ? optionId(index) : undefined;
  };

  // The input belongs to the search bar too, so pressing in it keeps the results
  useOutsideClick([wrapperRef, dropdownRef], [BANNER_ID], visibleDropdown, () => {
    setValue('');
    cleanItemsSearch();
  });

  const onKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'Escape':
        cleanItemsSearch();
        return;
      case 'ArrowDown':
      case 'ArrowUp':
        if (visibleResults()) {
          e.preventDefault();
          updateHighlightedItem(e.key === 'ArrowUp' ? 'up' : 'down');
        }
        return;
      case 'Enter': {
        e.preventDefault();
        if (value().length < MIN_CHARACTERS_SEARCH) return;
        const items = itemsList();
        if (isNull(items) || listedQuery !== value()) {
          // No results are listed for the current text: the search runs right away
          cleanTimeout();
          setHighlightedItem(null);
          onSearch(value());
        } else if (items.length > 0) {
          // The highlighted result, or the first one when none is highlighted
          openItemModal((items[highlightedItem() ?? 0] ?? items[0]).id);
        }
        return;
      }
      default:
        return;
    }
  };

  const openItemModal = (itemId: string) => {
    updateActiveItemId(itemId);
    setValue('');
    cleanItemsSearch();
    forceBlur();
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

  const isInputFocused = (): boolean => inputEl() === document.activeElement;

  const onSearch = async (text: string) => {
    try {
      const filteredItems = await searchEngine.searchTerm(text);
      // Results of an older query, or arriving once the input lost the focus, are dropped
      if (text !== value()) return;
      if (!isInputFocused()) {
        cleanItemsSearch();
        return;
      }
      listedQuery = text;
      batch(() => {
        setError(null);
        setItemsList(filteredItems);
        setVisibleDropdown(true);
      });
    } catch (err) {
      if (text !== value()) return;
      if (!isInputFocused()) {
        cleanItemsSearch();
        return;
      }
      listedQuery = text;
      batch(() => {
        setError(err instanceof Error ? err.message : String(err));
        setItemsList([]);
        setVisibleDropdown(true);
      });
    }
  };

  const cleanTimeout = () => {
    if (!isUndefined(searchTimeout)) {
      clearTimeout(searchTimeout);
      searchTimeout = undefined;
    }
  };

  const cleanSearchValue = () => {
    setValue('');
    forceFocus();
  };

  const cleanItemsSearch = () => {
    listedQuery = null;
    batch(() => {
      setError(null);
      setItemsList(null);
      setVisibleDropdown(false);
      setHighlightedItem(null);
    });
  };

  // Moves the highlight through the results, wrapping around at both ends
  const updateHighlightedItem = (arrow: 'up' | 'down') => {
    const resultsNumber = itemsList()?.length ?? 0;
    if (resultsNumber === 0) return;

    const currentIndex = highlightedItem();
    let newIndex: number;
    if (isNull(currentIndex)) {
      newIndex = arrow === 'up' ? resultsNumber - 1 : 0;
    } else {
      newIndex = (currentIndex + (arrow === 'up' ? -1 : 1) + resultsNumber) % resultsNumber;
    }
    setHighlightedItem(newIndex);
    scrollToHighlightedItem(newIndex);
  };

  const scrollToHighlightedItem = (index: number) => {
    const element = dropdownRef()?.querySelector<HTMLElement>(`[id="${optionId(index)}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  };

  createEffect(
    on(value, () => {
      if (isInputFocused()) {
        cleanTimeout();
        if (value().length >= MIN_CHARACTERS_SEARCH) {
          searchTimeout = setTimeout(() => {
            searchTimeout = undefined;
            setHighlightedItem(null);
            onSearch(value());
          }, SEARCH_DELAY);
        } else {
          cleanItemsSearch();
        }
      }
    })
  );

  const docPointerDown = () => {
    pointerInteraction = true;
  };

  // This function is used to focus the input when the user presses the '/' key
  const docKeyDown = (e: KeyboardEvent) => {
    pointerInteraction = false;
    if (props.device !== 'desktop') return;
    // We check if the body is the active element to avoid focusing the input when the focus
    // is on a different element (e.g. a input, a select, etc.)
    const isBodyElementActive = document.body === document.activeElement;
    if (isBodyElementActive) {
      if (e.key === '/') {
        e.preventDefault();
        forceFocus();
      }
    }
  };

  onMount(() => {
    // We add the event listeners to the document to track the last interaction (the '/' key
    // focuses the input only on desktop)
    document.addEventListener('keydown', docKeyDown, false);
    document.addEventListener('pointerdown', docPointerDown, true);
    onCleanup(() => {
      document.removeEventListener('keydown', docKeyDown);
      document.removeEventListener('pointerdown', docPointerDown, true);
    });
  });

  onCleanup(cleanTimeout);

  return (
    <>
      <div
        ref={setWrapperRef}
        class={`d-flex align-items-center overflow-hidden lh-base bg-white mx-0 mx-md-auto ${styles.searchBar} ${props.searchBarClass ?? ''}`}
        classList={{ [styles.keyboardFocus]: keyboardFocus() }}
      >
        <input
          id={`searchbar-${props.device}`}
          ref={setInputEl}
          class={`flex-grow-1 ps-2 ps-md-3 border-0 shadow-none bg-transparent lh-base ${styles.input}`}
          type="text"
          role="combobox"
          aria-label="Search items"
          aria-autocomplete="list"
          aria-expanded={visibleResults()}
          aria-controls={listId}
          aria-activedescendant={activeDescendant()}
          value={value()}
          autocomplete="off"
          autocorrect="off"
          autocapitalize="none"
          spellcheck={false}
          placeholder={props.device === 'desktop' ? '' : 'Search items'}
          onKeyDown={onKeyDown}
          onInput={(e) => setValue(e.target.value)}
          onFocus={() => setKeyboardFocus(!pointerInteraction)}
          onBlur={() => setKeyboardFocus(false)}
        />

        {props.device === 'desktop' && (
          <Show when={value() == ''}>
            <div class={`position-absolute d-flex align-items-center ${styles.desktopPlaceholder}`}>
              Type <small class={`rounded border mx-1 ${styles.desktopPlaceholderIcon}`}>/</small> to search items
            </div>
          </Show>
        )}

        <Show when={value() !== ''}>
          <button
            title="Clear text"
            aria-label="Clear search"
            class={`btn btn-link text-muted lh-1 px-2 ${styles.btnIcon}`}
            onClick={cleanSearchValue}
          >
            <div class={styles.btnIcon}>
              <SVGIcon kind={SVGIconKind.Clear} />
            </div>
          </button>
          <div class={`vr ${styles.vr}`} />
        </Show>

        <div class={`px-2 py-1 ${styles.btnIcon} ${styles.iconWrapper}`}>
          <SVGIcon kind={SVGIconKind.Search} />
        </div>
      </div>

      <Show when={visibleDropdown() && !isNull(itemsList())}>
        <div
          ref={setDropdownRef}
          class={`dropdown-menu p-0 w-100 rounded-0 show overflow-auto visibleScroll ${
            styles.dropdown
          } ${styles[`listLength-${itemsList()!.length}`] ?? ''}`}
        >
          <Show
            when={itemsList()!.length > 0}
            fallback={
              <div class="p-4 text-center fst-italic text-muted" role="status">
                <small>{error() ?? `We couldn't find any items that match that criteria.`}</small>
              </div>
            }
          >
            <HoverableItem onLeave={() => setHighlightedItem(null)}>
              <div id={listId} role="listbox" aria-label="Search results">
                <For each={itemsList()!}>
                  {(item, index) => {
                    return (
                      <HoverableItem
                        onHover={() => setHighlightedItem(index())}
                        onLeave={() => setHighlightedItem(null)}
                      >
                        <button
                          type="button"
                          class={`btn btn-link text-decoration-none text-black w-100 border-bottom rounded-0 d-flex flex-row align-items-stretch p-3 ${styles.btnProject}`}
                          classList={{
                            activeDropdownItem: index() === highlightedItem(),
                          }}
                          onClick={() => {
                            openItemModal(item.id);
                          }}
                          aria-label={`Open ${item.name} info`}
                          role="option"
                          tabIndex={-1}
                          aria-selected={index() === highlightedItem()}
                          id={optionId(index())}
                        >
                          <div class="d-flex flex-row align-items-center w-100">
                            <div
                              class={`d-flex align-items-center justify-content-center me-3 ${styles.miniImageWrapper}`}
                            >
                              <Image name={item.name} class="m-auto" logo={item.logo} />
                            </div>
                            <div
                              class={`flex-grow-1 d-flex flex-column text-start justify-content-between h-100 ${styles.truncateWrapper}`}
                            >
                              <div class="d-flex flex-row align-items-baseline">
                                <span class={`text-truncate fw-semibold ${styles.title}`}>{item.name}</span>
                                <Show when={!isUndefined(item.maturity)}>
                                  <div class={`d-flex flex-nowrap position-relative ${styles.badges}`}>
                                    <FoundationBadge
                                      foundation={FOUNDATION}
                                      class={`d-none d-xxl-flex ms-2 ${styles.badge}`}
                                    />
                                    <MaturityBadge level={item.maturity!} class={`ms-2 ${styles.badge}`} />
                                  </div>
                                </Show>
                              </div>
                              <div class={`text-muted ${styles.legend}`}>
                                <span class="d-none d-md-block text-truncate">
                                  {item.category} / {item.subcategory}
                                </span>
                                <span class="d-block d-md-none text-truncate">{item.subcategory}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      </HoverableItem>
                    );
                  }}
                </For>
              </div>
            </HoverableItem>
          </Show>
        </div>
      </Show>
    </>
  );
};

export default Searchbar;

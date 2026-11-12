import { useLocation, useNavigate } from '@solidjs/router';
import {
  Alignment,
  ALL_OPTIONS_EMBED_KEY,
  BANNER_ID,
  buildEmbedKey,
  buildEmbedUrl,
  buildMultiCategoryKey,
  capitalizeFirstLetter,
  type ClassificationOption,
  ClassifyType,
  CodeBlock,
  DEFAULT_CLASSIFY_TYPE,
  DEFAULT_DISPLAY_CATEGORY_HEADER,
  DEFAULT_DISPLAY_CATEGORY_IN_SUBCATEGORY,
  DEFAULT_DISPLAY_HEADER,
  DEFAULT_DISPLAY_ITEM_MODAL,
  DEFAULT_DISPLAY_ITEM_NAME,
  DEFAULT_ITEM_NAME_SIZE,
  DEFAULT_ITEMS_ALIGNMENT,
  DEFAULT_ITEMS_SIZE,
  DEFAULT_ITEMS_SPACING,
  DEFAULT_ITEMS_STYLE_VIEW,
  DEFAULT_TITLE_ALIGNMENT,
  DEFAULT_TITLE_FG_COLOR,
  DEFAULT_TITLE_FONT_FAMILY,
  DEFAULT_TITLE_SIZE,
  DEFAULT_UPPERCASE_TITLE,
  DISPLAY_CATEGORY_IN_SUBCATEGORY_PARAM,
  DISPLAY_HEADER_CATEGORY_PARAM,
  DISPLAY_HEADER_PARAM,
  DISPLAY_ITEM_MODAL_PARAM,
  DISPLAY_ITEM_NAME_PARAM,
  type EmbedConfig,
  FontFamily,
  formatTAGName,
  ITEM_NAME_SIZE_RANGE,
  Modal,
  Size,
  SMALL_DEVICES_BREAKPOINTS,
  Style,
  SVGIcon,
  SVGIconKind,
  TITLE_BGCOLOR_PARAM,
  TITLE_FGCOLOR_PARAM,
  TITLE_SIZE_RANGE,
  UPPERCASE_TITLE_PARAM,
  useBreakpointDetect,
  useOutsideClick,
} from 'common';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  For,
  Match,
  on,
  Show,
  Switch,
  untrack,
} from 'solid-js';

import { BASE_PATH, EMBED_SETUP_PATH, HIDE_ORGANIZATION_SECTION_IN_PROJECTS } from '../../data';
import { Category, Subcategory } from '../../types';
import clampInt from '../../utils/clampInt';
import getDevOrigin from '../../utils/getDevOrigin';
import isExploreSection from '../../utils/isExploreSection';
import itemsDataGetter from '../../utils/itemsDataGetter';
import prepareLink from '../../utils/prepareLink';
import rgba2hex from '../../utils/rgba2hex';
import CheckBox from '../common/Checkbox';
import styles from './EmbedModal.module.css';

// Embed setup checkboxes and color inputs, named after the embed url param each
// one sets (an object rather than an enum, as enum members cannot be initialized
// from imports with isolatedModules).
const InputType = {
  DisplayHeaders: DISPLAY_HEADER_PARAM,
  DisplayCategoryTitle: DISPLAY_HEADER_CATEGORY_PARAM,
  DisplayCategoryInSubcategory: DISPLAY_CATEGORY_IN_SUBCATEGORY_PARAM,
  UppercaseTitle: UPPERCASE_TITLE_PARAM,
  TitleBgColor: TITLE_BGCOLOR_PARAM,
  TitleFgColor: TITLE_FGCOLOR_PARAM,
  DisplayItemName: DISPLAY_ITEM_NAME_PARAM,
  DisplayItemModal: DISPLAY_ITEM_MODAL_PARAM,
} as const;

type InputType = (typeof InputType)[keyof typeof InputType];

const SIZES_LEGENDS = {
  [Size.XSmall]: 'Extra small',
  [Size.Small]: 'Small',
  [Size.Medium]: 'Medium',
  [Size.Large]: 'Large',
  [Size.XLarge]: 'Extra large',
};

// Accepted range of the custom gap between items (the embed ignores negative values)
const ITEMS_SPACING_RANGE = { max: Number.MAX_SAFE_INTEGER, min: 0 };

// Value of the title background color that makes the titles transparent
const TRANSPARENT_BG_COLOR = 'transparent';

enum SpacingType {
  Default = 'default',
  Custom = 'custom',
}

/** Category, subcategory, maturity and TAG selection of the embed setup. */
interface EmbedSelection {
  categories: string[];
  key: string;
  maturity: string;
  subcategories: string[];
  subcategoriesList: Subcategory[];
  tag: string;
}

const EmbedModal = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { point } = useBreakpointDetect();
  const BG_COLOR = rgba2hex(window.baseDS.colors.color5);
  // Icon is only visible when Explore section is loaded
  const isVisible = createMemo(() => isExploreSection(location.pathname));
  const isEmbedSetupActive = () => location.pathname === EMBED_SETUP_PATH;
  const [visibleModal, setVisibleModal] = createSignal<boolean>(isEmbedSetupActive());
  // Categories with items, and their subcategories, sorted by name once
  const categoriesList = createMemo((): Category[] =>
    sortBy(itemsDataGetter.getCategoriesAndSubcategoriesWithItems(), ['name']).map((category) => ({
      ...category,
      subcategories: sortBy(category.subcategories, ['name']),
    }))
  );
  const maturityOptions = itemsDataGetter.getMaturityOptions();
  const TAGOptions = itemsDataGetter.getTagOptions();

  // Selection the embed setup opens with: the first category and its first
  // subcategory (none in a landscape without categories), and the first maturity
  // and TAG options
  const getDefaultSelection = (): EmbedSelection => {
    const firstCategory = categoriesList()[0];
    const subcategoriesList = firstCategory?.subcategories ?? [];
    const firstSubcategory = subcategoriesList[0]?.normalized_name;
    return {
      categories: firstCategory ? [firstCategory.normalized_name] : [],
      key: firstCategory ? getCategoryKey(firstCategory.normalized_name, firstSubcategory) : '',
      maturity: getOptionKey('maturity', maturityOptions[0]),
      subcategories: firstSubcategory ? [firstSubcategory] : [],
      subcategoriesList,
      tag: getOptionKey('tag', TAGOptions[0]),
    };
  };

  // Initial values only: the defaults are read again when the modal is closed
  const defaultSelection = untrack(getDefaultSelection);
  const [subcategoriesList, setSubcategoriesList] = createSignal<Subcategory[]>(defaultSelection.subcategoriesList);
  const [key, setKey] = createSignal<string>(defaultSelection.key);
  const [selectedClassifyBy, setSelectedClassifyBy] = createSignal<ClassifyType>(DEFAULT_CLASSIFY_TYPE);
  const [selectedCategories, setSelectedCategories] = createSignal<string[]>(defaultSelection.categories);
  const [selectedSubcategories, setSelectedSubcategories] = createSignal<string[]>(defaultSelection.subcategories);
  const [selectedMaturity, setSelectedMaturity] = createSignal<string>(defaultSelection.maturity);
  const [selectedTag, setSelectedTag] = createSignal<string>(defaultSelection.tag);
  const [subcategoriesDropdownVisible, setSubcategoriesDropdownVisible] = createSignal<boolean>(false);
  const [subcategoriesDropdownRef, setSubcategoriesDropdownRef] = createSignal<HTMLDivElement>();
  const [categoriesDropdownVisible, setCategoriesDropdownVisible] = createSignal<boolean>(false);
  const [categoriesDropdownRef, setCategoriesDropdownRef] = createSignal<HTMLDivElement>();
  useOutsideClick([categoriesDropdownRef], [BANNER_ID], categoriesDropdownVisible, () =>
    setCategoriesDropdownVisible(false)
  );
  useOutsideClick([subcategoriesDropdownRef], [BANNER_ID], subcategoriesDropdownVisible, () =>
    setSubcategoriesDropdownVisible(false)
  );
  const multipleCategoriesSelected = createMemo(() => selectedCategories().length > 1);
  const selectedCategoriesLabel = createMemo(() => {
    if (selectedCategories().length === 0) {
      return 'Select categories';
    }
    const categoriesMap = new Map(
      categoriesList().map((category) => [category.normalized_name, category.name] as [string, string])
    );
    const labels = selectedCategories()
      .map((value) => categoriesMap.get(value))
      .filter((name): name is string => Boolean(name));

    if (labels.length === 0) {
      return 'Select categories';
    }

    return labels.join(', ');
  });
  const selectedSubcategoriesLabel = createMemo(() => {
    if (multipleCategoriesSelected()) {
      return 'All subcategories';
    }
    if (selectedSubcategories().includes('all') || selectedSubcategories().length === 0) {
      return 'All subcategories';
    }
    const selectedNames = selectedSubcategories()
      .map((value) => {
        const match = subcategoriesList().find((subcategory) => subcategory.normalized_name === value);
        return match ? match.name : undefined;
      })
      .filter((name): name is string => Boolean(name));
    return selectedNames.length > 0 ? selectedNames.join(', ') : 'Select subcategories';
  });
  const [selectedStyle, setSelectedStyle] = createSignal<Style>(DEFAULT_ITEMS_STYLE_VIEW);
  const [selectedSize, setSelectedSize] = createSignal<Size>(DEFAULT_ITEMS_SIZE);
  const [displayHeader, setDisplayHeader] = createSignal<boolean>(DEFAULT_DISPLAY_HEADER);
  const [displayCategoryTitle, setDisplayCategoryTitle] = createSignal<boolean>(DEFAULT_DISPLAY_CATEGORY_HEADER);
  const [displayCategoryInSubcategory, setDisplayCategoryInSubcategory] = createSignal<boolean>(
    DEFAULT_DISPLAY_CATEGORY_IN_SUBCATEGORY
  );
  const [uppercaseTitle, setUppercaseTitle] = createSignal<boolean>(DEFAULT_UPPERCASE_TITLE);
  const [titleAlignment, setTitleAlignment] = createSignal<Alignment>(DEFAULT_TITLE_ALIGNMENT);
  const [titleFontFamily, setTitleFontFamily] = createSignal<FontFamily>(DEFAULT_TITLE_FONT_FAMILY);
  const [titleSize, setTitleSize] = createSignal<number>(DEFAULT_TITLE_SIZE);
  const [bgColor, setBgColor] = createSignal<string>(BG_COLOR);
  const [fgColor, setFgColor] = createSignal<string>(DEFAULT_TITLE_FG_COLOR);
  const [itemsAlignment, setItemsAlignment] = createSignal<Alignment>(DEFAULT_ITEMS_ALIGNMENT);
  const [itemsSpacing, setItemsSpacing] = createSignal<number | undefined>();
  const [itemsSpacingType, setItemsSpacingType] = createSignal<SpacingType>(SpacingType.Default);
  const [displayItemName, setDisplayItemName] = createSignal<boolean>(DEFAULT_DISPLAY_ITEM_NAME);
  const [itemNameSize, setItemNameSize] = createSignal<number>(DEFAULT_ITEM_NAME_SIZE);
  const [displayItemModal, setDisplayItemModal] = createSignal<boolean>(DEFAULT_DISPLAY_ITEM_MODAL);
  const hideOrganizationSection = HIDE_ORGANIZATION_SECTION_IN_PROJECTS;
  const [prevHash, setPrevHash] = createSignal<string>('');
  const [prevSearch, setPrevSearch] = createSignal<string>('');
  const [embedScriptLoaded, setEmbedScriptLoaded] = createSignal<boolean>(false);
  const embedOrigin = () => `${getDevOrigin(window.location.origin)}${BASE_PATH}/embed`;
  const embedBaseUrl = () => `${embedOrigin()}/embed.html`;

  // Configuration of the embed view, normalized the way the embed reads it
  const config = createMemo((): EmbedConfig => {
    const classifyBy = selectedClassifyBy();
    const isCategoryView = classifyBy === ClassifyType.Category;
    const isMultiCategoryView = isCategoryView && multipleCategoriesSelected();
    const categories = isMultiCategoryView ? selectedCategories() : [];
    const subcategories = selectedSubcategories().filter((value) => value !== 'all');
    const keys: Record<ClassifyType, string> = {
      [ClassifyType.Category]: isMultiCategoryView ? buildMultiCategoryKey(categories) : key(),
      [ClassifyType.Maturity]: selectedMaturity(),
      [ClassifyType.TAG]: selectedTag(),
    };
    const spacing = itemsSpacing();

    return {
      basePath: BASE_PATH,
      categories,
      classifyBy,
      displayCategoryInSubcategory: displayCategoryInSubcategory(),
      displayCategoryTitle: displayCategoryTitle(),
      displayHeader: displayHeader(),
      displayItemModal: displayItemModal(),
      displayItemName: displayItemName(),
      hideOrganizationSection: displayItemModal() && hideOrganizationSection,
      isBgTransparent: bgColor() === TRANSPARENT_BG_COLOR,
      itemNameSize: itemNameSize(),
      itemsAlignment: itemsAlignment(),
      itemsSize: selectedSize(),
      itemsStyle: selectedStyle(),
      key: keys[classifyBy],
      subcategories: isCategoryView && !isMultiCategoryView && subcategories.length > 1 ? subcategories : [],
      titleAlignment: titleAlignment(),
      titleBgColor: bgColor(),
      titleFgColor: fgColor(),
      titleFontFamily: titleFontFamily(),
      titleSize: titleSize(),
      uppercaseTitle: uppercaseTitle(),
      ...(itemsSpacingType() === SpacingType.Custom && !isUndefined(spacing) ? { itemsSpacing: spacing } : {}),
    };
  });
  const url = createMemo(() => buildEmbedUrl(config(), embedBaseUrl()));

  const getExtraCode = () => {
    if (displayItemModal()) {
      return `\n<!-- Landscape embed item details view -->\n<!-- NOTE: the script and the iframe below should only be added once, even when adding multiple embed views to the page -->\n<script src="${embedOrigin()}/embed-item.js"></script>\n<iframe id="embed-item" src="${embedOrigin()}/embed-item.html" style="width:100%;height:100%;border:none;position:fixed;top:0;bottom:0;left:0;right:0;z-index:2147483647;display:none;"></iframe>`;
    }
    return '';
  };

  const onUpdateSpacingType = (type: SpacingType) => {
    if (type === SpacingType.Custom) {
      setItemsSpacing(DEFAULT_ITEMS_SPACING);
    } else {
      setItemsSpacing();
    }
    setItemsSpacingType(type);
  };

  const onChange = (type: InputType, value: string, checked?: boolean) => {
    switch (type) {
      case InputType.DisplayHeaders:
        setDisplayHeader(checked!);
        break;
      case InputType.DisplayCategoryTitle:
        setDisplayCategoryTitle(checked!);
        break;
      case InputType.UppercaseTitle:
        setUppercaseTitle(checked!);
        break;
      case InputType.DisplayCategoryInSubcategory:
        setDisplayCategoryInSubcategory(checked!);
        break;
      case InputType.DisplayItemName:
        setDisplayItemName(checked!);
        break;
      case InputType.TitleBgColor:
        setBgColor(value);
        break;
      case InputType.TitleFgColor:
        setFgColor(value);
        break;
      case InputType.DisplayItemModal:
        setDisplayItemModal(checked!);
        break;
      default:
        break;
    }
  };

  // Applies the number typed in an input, clamped to its range, and shows the
  // value applied (the previous one when the input is not a number)
  const onNumberChange = (
    input: HTMLInputElement,
    range: { max: number; min: number },
    value: Accessor<number | undefined>,
    setValue: (value: number) => void
  ) => {
    const number = clampInt(input.value, range.min, range.max);
    if (!isUndefined(number)) {
      setValue(number);
    }
    input.value = String(value() ?? '');
  };

  const applySingleCategorySelection = (category: string) => {
    const selectedCat = categoriesList().find((cat: Category) => cat.normalized_name === category);
    if (!selectedCat) {
      return;
    }
    const subcategories = selectedCat.subcategories;
    const firstSubcategory = subcategories[0]?.normalized_name;

    batch(() => {
      setSubcategoriesList(subcategories);
      setSubcategoriesDropdownVisible(false);
      if (firstSubcategory) {
        setSelectedSubcategories([firstSubcategory]);
        setKey(getCategoryKey(category, firstSubcategory));
      } else {
        setSelectedSubcategories([]);
        setKey(category);
      }
    });
  };

  const updateCategoriesSelection = (values: string[]) => {
    const categoriesOrder = new Map(
      categoriesList().map((category, index) => [category.normalized_name, index] as [string, number])
    );
    const unique = Array.from(new Set(values.filter((value) => categoriesOrder.has(value))));
    if (unique.length === 0) {
      return;
    }
    unique.sort((a, b) => categoriesOrder.get(a)! - categoriesOrder.get(b)!);
    setSelectedCategories(unique);

    if (unique.length === 1) {
      applySingleCategorySelection(unique[0]);
      return;
    }

    const first = unique[0];
    const firstCategory = categoriesList().find((category) => category.normalized_name === first);

    batch(() => {
      setSubcategoriesList(firstCategory?.subcategories ?? []);
      setSubcategoriesDropdownVisible(false);
      setSelectedSubcategories(['all']);
      setKey(first);
    });
  };

  const toggleCategory = (value: string, checked: boolean) => {
    const previousValues = selectedCategories();

    if (checked) {
      if (previousValues.includes(value)) {
        return;
      }
      updateCategoriesSelection([...previousValues, value]);
      return;
    }

    const nextValues = previousValues.filter((item) => item !== value);
    if (nextValues.length === 0) {
      return;
    }
    updateCategoriesSelection(nextValues);
  };

  const updateSelectionsKey = (values: string[], category: string) => {
    if (values.length === 1) {
      setKey(getCategoryKey(category, values[0]));
    } else {
      setKey(category);
    }
  };

  const selectAllSubcategories = () => {
    const currentCategory = selectedCategories()[0];
    if (!currentCategory) {
      return;
    }
    batch(() => {
      setSelectedSubcategories(['all']);
      setKey(currentCategory);
    });
  };

  const toggleSubcategory = (value: string, checked: boolean) => {
    if (multipleCategoriesSelected()) {
      return;
    }
    const currentCategory = selectedCategories()[0];
    if (!currentCategory) {
      return;
    }

    if (value === 'all') {
      selectAllSubcategories();
      return;
    }

    const previousValues = selectedSubcategories().filter((item) => item !== 'all');

    if (checked) {
      const alreadySelected = previousValues.includes(value);
      const nextValues = alreadySelected ? previousValues : [...previousValues, value];
      batch(() => {
        setSelectedSubcategories(nextValues);
        updateSelectionsKey(nextValues, currentCategory);
      });
      return;
    }

    const nextValues = previousValues.filter((item) => item !== value);

    if (nextValues.length === 0) {
      selectAllSubcategories();
      return;
    }

    batch(() => {
      setSelectedSubcategories(nextValues);
      updateSelectionsKey(nextValues, currentCategory);
    });
  };

  const onClose = () => {
    navigate(`${BASE_PATH}/${prevSearch() !== '' ? prevSearch() : ''}${prevHash()}`, {
      replace: true,
    });
    setVisibleModal(false);

    // Reset settings
    batch(() => {
      const selection = getDefaultSelection();
      setSubcategoriesList(selection.subcategoriesList);
      setSelectedCategories(selection.categories);
      setCategoriesDropdownVisible(false);
      setSelectedSubcategories(selection.subcategories);
      setSubcategoriesDropdownVisible(false);
      setSelectedMaturity(selection.maturity);
      setSelectedTag(selection.tag);
      setSelectedClassifyBy(DEFAULT_CLASSIFY_TYPE);
      setKey(selection.key);
      setSelectedSize(DEFAULT_ITEMS_SIZE);
      setSelectedStyle(DEFAULT_ITEMS_STYLE_VIEW);
      setTitleAlignment(DEFAULT_TITLE_ALIGNMENT);
      setTitleFontFamily(DEFAULT_TITLE_FONT_FAMILY);
      setTitleSize(DEFAULT_TITLE_SIZE);
      setDisplayHeader(DEFAULT_DISPLAY_HEADER);
      setDisplayCategoryTitle(DEFAULT_DISPLAY_CATEGORY_HEADER);
      setDisplayCategoryInSubcategory(DEFAULT_DISPLAY_CATEGORY_IN_SUBCATEGORY);
      setUppercaseTitle(DEFAULT_UPPERCASE_TITLE);
      setDisplayItemName(DEFAULT_DISPLAY_ITEM_NAME);
      setItemsAlignment(DEFAULT_ITEMS_ALIGNMENT);
      setItemNameSize(DEFAULT_ITEM_NAME_SIZE);
      setItemsSpacingType(SpacingType.Default);
      setItemsSpacing(undefined);
      setBgColor(BG_COLOR);
      setFgColor(DEFAULT_TITLE_FG_COLOR);
      setDisplayItemModal(DEFAULT_DISPLAY_ITEM_MODAL);
    });
  };

  createEffect(
    on(point, () => {
      if (visibleModal() && SMALL_DEVICES_BREAKPOINTS.includes(point())) {
        onClose();
      }
    })
  );

  createEffect(
    on(visibleModal, () => {
      if (visibleModal()) {
        setPrevSearch(location.search);
        setPrevHash(location.hash);
      }
    })
  );

  createEffect(
    on(selectedClassifyBy, () => {
      if (selectedClassifyBy() !== ClassifyType.Category) {
        setCategoriesDropdownVisible(false);
        setSubcategoriesDropdownVisible(false);
      }
    })
  );

  createEffect(
    on(displayItemModal, () => {
      if (displayItemModal()) {
        import(/* @vite-ignore */ `${embedOrigin()}/embed-item.js`).then(() => {
          setEmbedScriptLoaded(true);
        });
      }
    })
  );

  return (
    <Show when={isVisible()}>
      <div class="me-2 position-relative">
        <button
          type="button"
          class={`btn btn-md p-0 rounded-0 lh-1 ${styles.btn}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setVisibleModal(true);
            navigate(prepareLink(EMBED_SETUP_PATH), {
              replace: true,
            });
          }}
          aria-label='Open "Embeddable view setup" modal'
        >
          <SVGIcon kind={SVGIconKind.Embed} />
        </button>
      </div>
      <Show when={visibleModal()}>
        <Modal
          title="Embeddable view setup"
          size="xxl"
          open
          bodyClass={styles.modalBody}
          onClose={onClose}
          header="Embeddable view setup"
          footer={
            <div class="d-flex flex-row justify-content-end w-100">
              <div>
                <button
                  type="button"
                  title="Close modal"
                  class="btn btn-sm btn-secondary text-uppercase fw-semibold text-white rounded-0"
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div class="mw-100 h-100 d-flex flex-column overflow-hidden">
            <div class={`d-flex flex-column h-100 ${styles.mainWrapper}`}>
              <div class={`h-100 flex-grow-1 d-flex w-100 ${styles.contentWrapper}`}>
                <div class="row g-0 w-100">
                  <div class="col-4 col-xxl-3 overflow-auto h-100 visibleScroll">
                    <div class={`p-4 ${styles.configWrapper}`}>
                      <div>
                        <label
                          class={`d-block text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}
                          for="classifyBy"
                        >
                          Classify
                        </label>
                        <select
                          id="classifyBy"
                          class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                          value={selectedClassifyBy()}
                          onChange={(e) => {
                            setSelectedClassifyBy(e.currentTarget.value as ClassifyType);
                          }}
                        >
                          <option value={ClassifyType.Category}>Category</option>
                          <Show when={maturityOptions.length > 0}>
                            <option value={ClassifyType.Maturity}>Maturity</option>
                          </Show>
                          <Show when={TAGOptions.length > 0}>
                            <option value={ClassifyType.TAG}>TAG</option>
                          </Show>
                        </select>
                      </div>
                      <Switch>
                        <Match when={selectedClassifyBy() === ClassifyType.Category}>
                          <div class="mt-4">
                            <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>
                              Category
                            </div>
                            <div ref={setCategoriesDropdownRef} class={`position-relative ${styles.dropdownWrapper}`}>
                              <button
                                type="button"
                                id="categories"
                                class={`btn btn-sm text-start w-100 rounded-0 ${styles.dropdownButton}`}
                                onClick={() => setCategoriesDropdownVisible(!categoriesDropdownVisible())}
                                aria-label="Categories list"
                                aria-controls="categoriesOptions"
                                aria-expanded={categoriesDropdownVisible()}
                              >
                                <span class={styles.dropdownButtonLabel}>{selectedCategoriesLabel()}</span>
                                <SVGIcon kind={SVGIconKind.CaretDown} class={styles.dropdownButtonIcon} />
                              </button>
                              <fieldset
                                id="categoriesOptions"
                                class={`dropdown-menu rounded-0 shadow-none w-100 ${styles.dropdownMenu}`}
                                classList={{ show: categoriesDropdownVisible() }}
                              >
                                <legend class="visually-hidden">Categories</legend>
                                <div class="px-3 py-2">
                                  <For each={categoriesList()}>
                                    {(cat: Category) => {
                                      return (
                                        <CheckBox
                                          name="category"
                                          value={cat.normalized_name}
                                          label={cat.name}
                                          checked={selectedCategories().includes(cat.normalized_name)}
                                          onChange={(value, checked) => {
                                            toggleCategory(value, checked);
                                          }}
                                          labelClass={`mw-100 text-muted ${styles.optionLabel}`}
                                          class={styles.dropdownOption}
                                        />
                                      );
                                    }}
                                  </For>
                                </div>
                              </fieldset>
                            </div>
                          </div>
                          <div class="mt-4">
                            <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>
                              Subcategory
                            </div>
                            <div
                              ref={setSubcategoriesDropdownRef}
                              class={`position-relative ${styles.dropdownWrapper}`}
                            >
                              <button
                                type="button"
                                id="subcategories"
                                class={`btn btn-sm text-start w-100 rounded-0 ${styles.dropdownButton} ${
                                  multipleCategoriesSelected() ? styles.dropdownButtonDisabled : ''
                                }`}
                                disabled={multipleCategoriesSelected()}
                                aria-disabled={multipleCategoriesSelected()}
                                onClick={() => {
                                  if (multipleCategoriesSelected()) {
                                    return;
                                  }
                                  setSubcategoriesDropdownVisible(!subcategoriesDropdownVisible());
                                }}
                                aria-label="Subcategories list"
                                aria-controls="subcategoriesOptions"
                                aria-expanded={subcategoriesDropdownVisible()}
                              >
                                <span class={styles.dropdownButtonLabel}>{selectedSubcategoriesLabel()}</span>
                                <SVGIcon kind={SVGIconKind.CaretDown} class={styles.dropdownButtonIcon} />
                              </button>
                              <fieldset
                                id="subcategoriesOptions"
                                class={`dropdown-menu rounded-0 shadow-none w-100 ${styles.dropdownMenu}`}
                                classList={{ show: subcategoriesDropdownVisible() }}
                              >
                                <legend class="visually-hidden">Subcategories</legend>
                                <div class="px-3 py-2">
                                  <CheckBox
                                    name="subcategory"
                                    value="all"
                                    label="All"
                                    checked={selectedSubcategories().includes('all')}
                                    onChange={(value, checked) => {
                                      toggleSubcategory(value, checked);
                                    }}
                                    labelClass={`mw-100 text-muted ${styles.optionLabel}`}
                                    class={styles.dropdownOption}
                                  />
                                  <For each={subcategoriesList()}>
                                    {(subcat: Subcategory) => {
                                      return (
                                        <CheckBox
                                          name="subcategory"
                                          value={subcat.normalized_name}
                                          label={subcat.name}
                                          checked={selectedSubcategories().includes(subcat.normalized_name)}
                                          onChange={(value, checked) => {
                                            toggleSubcategory(value, checked);
                                          }}
                                          labelClass={`mw-100 text-muted ${styles.optionLabel}`}
                                          class={styles.dropdownOption}
                                        />
                                      );
                                    }}
                                  </For>
                                </div>
                              </fieldset>
                            </div>
                            <Show when={multipleCategoriesSelected()}>
                              <div class={`mt-2 ${styles.dropdownHint}`}>
                                Select only one category to filter specific subcategories.
                              </div>
                            </Show>
                          </div>
                        </Match>
                        <Match when={selectedClassifyBy() === ClassifyType.Maturity}>
                          <div class="mt-4">
                            <label
                              class={`d-block text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}
                              for="maturity"
                            >
                              Maturity
                            </label>
                            <select
                              id="maturity"
                              class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                              value={selectedMaturity()}
                              onChange={(e) => {
                                setSelectedMaturity(e.currentTarget.value);
                              }}
                            >
                              <option value={ALL_OPTIONS_EMBED_KEY}>All</option>
                              <For each={maturityOptions}>
                                {(m: ClassificationOption) => {
                                  return (
                                    <option value={getOptionKey('maturity', m)}>{capitalizeFirstLetter(m.name)}</option>
                                  );
                                }}
                              </For>
                            </select>
                          </div>
                        </Match>
                        <Match when={selectedClassifyBy() === ClassifyType.TAG}>
                          <div class="mt-4">
                            <label
                              class={`d-block text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}
                              for="tag"
                            >
                              TAG
                            </label>
                            <select
                              id="tag"
                              class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                              value={selectedTag()}
                              onChange={(e) => {
                                setSelectedTag(e.currentTarget.value);
                              }}
                            >
                              <option value={ALL_OPTIONS_EMBED_KEY}>All</option>
                              <For each={TAGOptions}>
                                {(t: ClassificationOption) => {
                                  return <option value={getOptionKey('tag', t)}>{formatTAGName(t.name)}</option>;
                                }}
                              </For>
                            </select>
                          </div>
                        </Match>
                      </Switch>

                      <div class="mt-4">
                        <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>Header</div>
                        <div class="form-check">
                          <CheckBox
                            name={InputType.DisplayHeaders}
                            value="true"
                            class="ps-0 my-2"
                            labelClass={`mw-100 text-muted ${styles.label}`}
                            label="Visible"
                            checked={displayHeader()}
                            onChange={(value: string, checked: boolean) =>
                              onChange(InputType.DisplayHeaders, value, checked)
                            }
                          />
                        </div>
                        <Show when={selectedClassifyBy() === ClassifyType.Category}>
                          <div class="form-check">
                            <CheckBox
                              name={InputType.DisplayCategoryTitle}
                              value="true"
                              class="ps-0 my-2"
                              labelClass={`mw-100 text-muted ${styles.label}`}
                              label="Include category header"
                              checked={displayCategoryTitle()}
                              onChange={(value: string, checked: boolean) =>
                                onChange(InputType.DisplayCategoryTitle, value, checked)
                              }
                            />
                          </div>
                          <div class="form-check">
                            <CheckBox
                              name={InputType.DisplayCategoryInSubcategory}
                              value="true"
                              class="ps-0 my-2"
                              labelClass={`mw-100 text-muted ${styles.label}`}
                              label="Include category in subcategory header"
                              checked={displayCategoryInSubcategory()}
                              onChange={(value: string, checked: boolean) =>
                                onChange(InputType.DisplayCategoryInSubcategory, value, checked)
                              }
                            />
                          </div>
                        </Show>
                        <div class="form-check">
                          <CheckBox
                            name={InputType.UppercaseTitle}
                            value="true"
                            class="ps-0 my-2"
                            labelClass={`mw-100 text-muted ${styles.label}`}
                            label="Uppercase"
                            checked={uppercaseTitle()}
                            onChange={(value: string, checked: boolean) =>
                              onChange(InputType.UppercaseTitle, value, checked)
                            }
                          />
                        </div>
                        <div class="form-check ps-0">
                          <div class="d-flex flex-row align-items-center mt-3">
                            <input
                              class={styles.inputColor}
                              type="color"
                              id={InputType.TitleBgColor}
                              name={InputType.TitleBgColor}
                              value={bgColor()}
                              onInput={(e) => {
                                onChange(InputType.TitleBgColor, e.currentTarget.value);
                              }}
                            />
                            <label class={`mw-100 text-muted ms-2 ${styles.label}`} for={InputType.TitleBgColor}>
                              Background color
                            </label>
                          </div>
                        </div>
                        <div class="form-check ps-0">
                          <div class="d-flex flex-row align-items-center mt-3">
                            <input
                              class={styles.inputColor}
                              type="color"
                              id={InputType.TitleFgColor}
                              name={InputType.TitleFgColor}
                              value={fgColor()}
                              onInput={(e) => {
                                onChange(InputType.TitleFgColor, e.currentTarget.value);
                              }}
                            />
                            <label class={`mw-100 text-muted ms-2 ${styles.label}`} for={InputType.TitleFgColor}>
                              Foreground color
                            </label>
                          </div>
                        </div>
                        <div class="d-flex flex-column mt-3">
                          <label
                            class={`text-muted form-check-label text-nowrap ${styles.label}`}
                            for="titleFontFamily"
                          >
                            Font family:
                          </label>
                          <select
                            id="titleFontFamily"
                            class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                            value={titleFontFamily()}
                            onChange={(e) => {
                              setTitleFontFamily(e.currentTarget.value as FontFamily);
                            }}
                          >
                            <For each={Object.values(FontFamily)}>
                              {(f: FontFamily) => {
                                return <option value={f}>{capitalizeFirstLetter(f)}</option>;
                              }}
                            </For>
                          </select>
                        </div>
                        <div class="d-flex flex-column mt-3">
                          <label class={`text-muted form-check-label text-nowrap ${styles.label}`} for="titleSize">
                            Font size (px):
                          </label>
                          <div>
                            <input
                              type="number"
                              id="titleSize"
                              class={`form-control rounded-0 border-0 ${styles.input}`}
                              min={TITLE_SIZE_RANGE.min}
                              max={TITLE_SIZE_RANGE.max}
                              value={titleSize()}
                              onChange={(e) => {
                                onNumberChange(e.currentTarget, TITLE_SIZE_RANGE, titleSize, setTitleSize);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div class="d-flex flex-column mt-3">
                        <label class={`text-muted form-check-label text-nowrap ${styles.label}`} for="titleAlignment">
                          Alignment
                        </label>
                        <select
                          id="titleAlignment"
                          class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                          value={titleAlignment()}
                          onChange={(e) => {
                            setTitleAlignment(e.currentTarget.value as Alignment);
                          }}
                        >
                          <For each={Object.values(Alignment)}>
                            {(a: Alignment) => {
                              return <option value={a}>{capitalizeFirstLetter(a)}</option>;
                            }}
                          </For>
                        </select>
                      </div>

                      {/* Item */}
                      <div class="mt-4">
                        <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>Item</div>
                      </div>
                      <div class="form-check">
                        <CheckBox
                          name={InputType.DisplayItemModal}
                          value="true"
                          class="ps-0 my-2"
                          labelClass={`mw-100 text-muted ${styles.label}`}
                          label="Open details modal on click"
                          checked={displayItemModal()}
                          onChange={(value: string, checked: boolean) =>
                            onChange(InputType.DisplayItemModal, value, checked)
                          }
                        />
                      </div>
                      <Show when={selectedStyle() !== Style.Card}>
                        <div class="form-check">
                          <CheckBox
                            name={InputType.DisplayItemName}
                            value="true"
                            class="ps-0 my-2"
                            labelClass={`mw-100 text-muted ${styles.label}`}
                            label="Display item name"
                            checked={displayItemName()}
                            onChange={(value: string, checked: boolean) =>
                              onChange(InputType.DisplayItemName, value, checked)
                            }
                          />
                        </div>
                        <Show when={displayItemName()}>
                          <div class="d-flex flex-column mt-3">
                            <label class={`text-muted form-check-label text-nowrap ${styles.label}`} for="itemNameSize">
                              Item name font size (px):
                            </label>
                            <div>
                              <input
                                type="number"
                                id="itemNameSize"
                                class={`form-control rounded-0 border-0 ${styles.input}`}
                                min={ITEM_NAME_SIZE_RANGE.min}
                                max={ITEM_NAME_SIZE_RANGE.max}
                                value={itemNameSize()}
                                onChange={(e) => {
                                  onNumberChange(e.currentTarget, ITEM_NAME_SIZE_RANGE, itemNameSize, setItemNameSize);
                                }}
                              />
                            </div>
                          </div>
                        </Show>
                      </Show>

                      <div class="d-flex flex-column mt-3">
                        <label class={`text-muted form-check-label text-nowrap ${styles.label}`} for="itemsStyle">
                          Style
                        </label>
                        <select
                          id="itemsStyle"
                          class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                          value={selectedStyle()}
                          onChange={(e) => {
                            setSelectedStyle(e.currentTarget.value as Style);
                          }}
                        >
                          <For each={Object.values(Style)}>
                            {(s: Style) => {
                              return <option value={s}>{capitalizeFirstLetter(s)}</option>;
                            }}
                          </For>
                        </select>
                      </div>

                      <Show when={selectedStyle() !== Style.Card}>
                        <div class="d-flex flex-column mt-3">
                          <label class={`text-muted form-check-label text-nowrap ${styles.label}`} for="itemsSize">
                            Size
                          </label>
                          <select
                            id="itemsSize"
                            class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                            value={selectedSize()}
                            onChange={(e) => {
                              setSelectedSize(e.currentTarget.value as Size);
                            }}
                          >
                            <For each={Object.values(Size)}>
                              {(s: Size) => {
                                return <option value={s}>{SIZES_LEGENDS[s]}</option>;
                              }}
                            </For>
                          </select>
                        </div>
                        <div class="d-flex flex-column mt-3">
                          <label class={`text-muted form-check-label text-nowrap ${styles.label}`} for="itemsAlignment">
                            Alignment
                          </label>
                          <select
                            id="itemsAlignment"
                            class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                            value={itemsAlignment()}
                            onChange={(e) => {
                              setItemsAlignment(e.currentTarget.value as Alignment);
                            }}
                          >
                            <For each={Object.values(Alignment)}>
                              {(a: Alignment) => {
                                return <option value={a}>{capitalizeFirstLetter(a)}</option>;
                              }}
                            </For>
                          </select>
                        </div>
                        <fieldset class="d-flex flex-column mt-3">
                          <legend class={`mb-0 text-muted form-check-label text-nowrap ${styles.label}`}>
                            Gap between items:
                          </legend>
                          <div class="d-flex mt-1">
                            <For each={Object.values(SpacingType)}>
                              {(t: string | number | string[], index: () => number) => {
                                return (
                                  <div class="form-check form-check-inline">
                                    <input
                                      class="form-check-input"
                                      type="radio"
                                      name="spacing"
                                      id={`spacing_${t}`}
                                      value={t}
                                      checked={itemsSpacingType() === t}
                                      onInput={(e) => {
                                        onUpdateSpacingType(e.currentTarget.value as SpacingType);
                                      }}
                                    />
                                    <label class={`text-muted form-check-label ${styles.label}`} for={`spacing_${t}`}>
                                      {Object.keys(SpacingType)[index()]}
                                      <Show when={t === SpacingType.Custom}> (px)</Show>
                                    </label>
                                  </div>
                                );
                              }}
                            </For>
                          </div>

                          <Show when={itemsSpacingType() === SpacingType.Custom}>
                            <label class="visually-hidden" for="itemsSpacing">
                              Gap between items (px)
                            </label>
                            <input
                              type="number"
                              id="itemsSpacing"
                              min={ITEMS_SPACING_RANGE.min}
                              class={`form-control rounded-0 border-0 ${styles.input}`}
                              value={itemsSpacing()}
                              onChange={(e) => {
                                onNumberChange(e.currentTarget, ITEMS_SPACING_RANGE, itemsSpacing, setItemsSpacing);
                              }}
                            />
                          </Show>
                        </fieldset>
                      </Show>
                    </div>
                  </div>
                  <div class="col-8 col-xxl-9 border-start">
                    <div class="h-100 d-flex flex-column">
                      <div class={`text-uppercase text-muted fw-semibold ${styles.labelSelect} ${styles.previewTitle}`}>
                        Preview
                      </div>
                      <div class="p-4 pt-2 flex-grow-1">
                        <iframe title="Embed grid" src={url()} class="d-block w-100 h-100 border-0" />
                        <Show when={displayItemModal() && embedScriptLoaded()}>
                          <iframe
                            id="embed-item"
                            title="Embed item details view"
                            src={`${embedOrigin()}/embed-item.html`}
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'none',
                              border: 'none',
                              position: 'fixed',
                              top: '0',
                              bottom: '0',
                              left: '0',
                              right: '0',
                              'z-index': '2147483647',
                            }}
                          />
                        </Show>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class={`border-top p-4 ${styles.codeWrapper}`}>
                <div class={`text-uppercase text-muted fw-semibold mb-2 ${styles.labelSelect}`}>Embed code</div>
                <CodeBlock
                  content={`<!-- Landscape embed view -->\n<iframe src="${url()}" style="width:100%;height:100%;display:block;border:none;"></iframe>${getExtraCode()}`}
                  alignment="top"
                  orientation="column"
                  codeClass={`bg-dark text-white ${styles.code}`}
                  btnWrapperClass="mt-2 ms-auto"
                  withCopyBtn
                />
              </div>
            </div>
          </div>
        </Modal>
      </Show>
    </Show>
  );
};

export default EmbedModal;

// Build the embed key of the category and subcategory normalized names selected
const getCategoryKey = (category: string, subcategory?: string) =>
  buildEmbedKey({
    classify: 'category',
    category: { normalized_name: category },
    subcategory: subcategory ? { normalized_name: subcategory } : undefined,
  });

// Build the embed key of the maturity or TAG option selected (all options when none)
const getOptionKey = (classify: 'maturity' | 'tag', option?: ClassificationOption) =>
  buildEmbedKey({ classify, option });

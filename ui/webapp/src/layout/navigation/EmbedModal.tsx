import { useLocation, useNavigate } from '@solidjs/router';
import { capitalizeFirstLetter, CodeBlock, Modal, SVGIcon, SVGIconKind, useBreakpointDetect } from 'common';
import isUndefined from 'lodash/isUndefined';
import sortBy from 'lodash/sortBy';
import { batch, createEffect, createMemo, createSignal, For, on, onMount, Show } from 'solid-js';

import {
  Alignment,
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
  DEFAULT_TITLE_BG_COLOR,
  DEFAULT_TITLE_FG_COLOR,
  DEFAULT_TITLE_FONT_FAMILY,
  DEFAULT_TITLE_SIZE,
  DEFAULT_UPPERCASE_TITLE,
  DISPLAY_CATEGORY_IN_SUBCATEGORY_PARAM,
  DISPLAY_HEADER_CATEGORY_PARAM,
  DISPLAY_HEADER_PARAM,
  DISPLAY_ITEM_MODAL_PARAM,
  DISPLAY_ITEM_NAME_PARAM,
  FontFamily,
  ITEM_NAME_SIZE_PARAM,
  ITEMS_ALIGNMENT_PARAM,
  ITEMS_SIZE_PARAM,
  ITEMS_SPACING_PARAM,
  ITEMS_STYLE_PARAM,
  KEY_PARAM,
  Size,
  Style,
  TITLE_ALIGNMENT_PARAM,
  TITLE_BGCOLOR_PARAM,
  TITLE_FGCOLOR_PARAM,
  TITLE_FONT_FAMILY_PARAM,
  TITLE_SIZE_PARAM,
  UPPERCASE_TITLE_PARAM,
} from '../../../../embed/src/types';
import { BASE_PATH, EMBED_SETUP_PATH, SMALL_DEVICES_BREAKPOINTS } from '../../data';
import { Category, Subcategory } from '../../types';
import isExploreSection from '../../utils/isExploreSection';
import itemsDataGetter from '../../utils/itemsDataGetter';
import prepareLink from '../../utils/prepareLink';
import rgba2hex from '../../utils/rgba2hex';
import CheckBox from '../common/Checkbox';
import styles from './EmbedModal.module.css';

enum InputType {
  ItemsStyle = ITEMS_STYLE_PARAM,
  ItemsSize = ITEMS_SIZE_PARAM,
  DisplayHeaders = DISPLAY_HEADER_PARAM,
  DisplayCategoryTitle = DISPLAY_HEADER_CATEGORY_PARAM,
  DisplayCategoryInSubcategory = DISPLAY_CATEGORY_IN_SUBCATEGORY_PARAM,
  TitleFontFamily = TITLE_FONT_FAMILY_PARAM,
  UppercaseTitle = UPPERCASE_TITLE_PARAM,
  TitleSize = TITLE_SIZE_PARAM,
  TitleAlignment = TITLE_ALIGNMENT_PARAM,
  ItemsSpacing = ITEMS_SPACING_PARAM,
  ItemsAlignment = ITEMS_ALIGNMENT_PARAM,
  TitleBgColor = TITLE_BGCOLOR_PARAM,
  TitleFgColor = TITLE_FGCOLOR_PARAM,
  DisplayItemName = DISPLAY_ITEM_NAME_PARAM,
  ItemNameSize = ITEM_NAME_SIZE_PARAM,
  DisplayItemModal = DISPLAY_ITEM_MODAL_PARAM,
}

const SIZES_LEGENDS = {
  [Size.XSmall]: 'Extra small',
  [Size.Small]: 'Small',
  [Size.Medium]: 'Medium',
  [Size.Large]: 'Large',
  [Size.XLarge]: 'Extra large',
};

enum SpacingType {
  Default = 'default',
  Custom = 'custom',
}

const EmbedModal = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { point } = useBreakpointDetect();
  const BG_COLOR =
    !isUndefined(window.baseDS.colors) && !isUndefined(window.baseDS.colors!.color5)
      ? rgba2hex(window.baseDS.colors.color5)
      : DEFAULT_TITLE_BG_COLOR;
  // Icon is only visible when Explore section is loaded
  const isVisible = createMemo(() => isExploreSection(location.pathname));
  const isEmbedSetupActive = () => location.pathname === EMBED_SETUP_PATH;
  const [visibleModal, setVisibleModal] = createSignal<boolean>(isEmbedSetupActive());
  const categoriesList = () => sortBy(itemsDataGetter.getCategoriesAndSubcategoriesList(), ['name']);
  const [subcategoriesList, setSubcategoriesList] = createSignal<Subcategory[]>(
    sortBy(categoriesList()[0].subcategories, ['name'])
  );
  const [key, setKey] = createSignal<string>(
    // eslint-disable-next-line solid/reactivity
    `${categoriesList()[0].normalized_name}--${subcategoriesList()[0].normalized_name}`
  );
  const [selectedCategory, setSelectedCategory] = createSignal<string>(categoriesList()[0].normalized_name);
  // eslint-disable-next-line solid/reactivity
  const [selectedSubcategory, setSelectedSubcategory] = createSignal<string>(subcategoriesList()[0].normalized_name);
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
  const [url, setUrl] = createSignal<string>();
  const [prevHash, setPrevHash] = createSignal<string>('');
  const [prevSearch, setPrevSearch] = createSignal<string>('');
  const [embedScriptLoaded, setEmbedScriptLoaded] = createSignal<boolean>(false);
  const embedOrigin = () =>
    `${import.meta.env.MODE === 'development' ? 'http://localhost:8000' : window.location.origin}${BASE_PATH}/embed`;

  const getIFrameUrl = () => {
    const embedUrl = new URL(`${embedOrigin()}/embed.html`);
    const embedParams = new URLSearchParams();
    embedParams.append(KEY_PARAM, key() || categoriesList()[0].normalized_name);
    embedParams.append(DISPLAY_HEADER_PARAM, displayHeader() ? 'true' : 'false');
    embedParams.append(DISPLAY_HEADER_CATEGORY_PARAM, displayCategoryTitle() ? 'true' : 'false');
    embedParams.append(DISPLAY_CATEGORY_IN_SUBCATEGORY_PARAM, displayCategoryInSubcategory() ? 'true' : 'false');
    embedParams.append(UPPERCASE_TITLE_PARAM, uppercaseTitle() ? 'true' : 'false');
    embedParams.append(TITLE_ALIGNMENT_PARAM, titleAlignment());
    embedParams.append(TITLE_FONT_FAMILY_PARAM, titleFontFamily());
    embedParams.append(TITLE_SIZE_PARAM, titleSize().toString());
    embedParams.append(ITEMS_STYLE_PARAM, selectedStyle());
    embedParams.append(TITLE_BGCOLOR_PARAM, bgColor());
    embedParams.append(TITLE_FGCOLOR_PARAM, fgColor());
    embedParams.append(DISPLAY_ITEM_MODAL_PARAM, displayItemModal() ? 'true' : 'false');

    if (selectedStyle() !== Style.Card) {
      embedParams.append(DISPLAY_ITEM_NAME_PARAM, displayItemName() ? 'true' : 'false');
      embedParams.append(ITEMS_SIZE_PARAM, selectedSize());
      embedParams.append(ITEMS_ALIGNMENT_PARAM, itemsAlignment());
      if (displayItemName()) {
        embedParams.append(ITEM_NAME_SIZE_PARAM, itemNameSize().toString());
      }
      if (itemsSpacingType() === SpacingType.Custom && !isUndefined(itemsSpacing())) {
        embedParams.append(ITEMS_SPACING_PARAM, itemsSpacing()!.toString());
      }
    }

    return `${embedUrl}?${embedParams.toString()}`;
  };

  const getExtraCode = () => {
    if (displayItemModal()) {
      return `\n<!-- Landscape embed item details view -->\n<!-- NOTE: the script and the iframe below should only be added once, even when adding multiple embed views to the page -->\n<script src="${embedOrigin()}/embed-item.js"></script>\n<iframe id="embed-item" src="${embedOrigin()}/embed-item.html" style="width:100%;height:100%;display:block;border:none;position:fixed;top:0;bottom:0;left:0;right:0;z-index:999999999;display:none;"></iframe>`;
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
      case InputType.ItemsStyle:
        setSelectedStyle(value as Style);
        break;
      case InputType.ItemsSize:
        setSelectedSize(value as Size);
        break;
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
      case InputType.ItemNameSize:
        setItemNameSize(parseInt(value));
        break;
      case InputType.TitleFontFamily:
        setTitleFontFamily(value as FontFamily);
        break;
      case InputType.TitleSize:
        setTitleSize(parseInt(value));
        break;
      case InputType.ItemsSpacing:
        setItemsSpacing(parseInt(value));
        break;
      case InputType.TitleAlignment:
        setTitleAlignment(value as Alignment);
        break;
      case InputType.ItemsAlignment:
        setItemsAlignment(value as Alignment);
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

  const updateCategory = (category: string) => {
    const selectedCat = categoriesList().find((cat: Category) => cat.normalized_name === category);
    if (selectedCat) {
      const subcategories = sortBy(selectedCat.subcategories, ['name']);
      const firstSubcategory = subcategories[0].normalized_name;

      batch(() => {
        setSubcategoriesList(subcategories);
        setSelectedCategory(category);
        setSelectedSubcategory(firstSubcategory);
        setKey(`${selectedCategory()}--${firstSubcategory}`);
      });
    }
  };

  const onClose = () => {
    navigate(`${BASE_PATH}/${prevSearch() !== '' ? prevSearch() : ''}${prevHash()}`, {
      replace: true,
    });
    setVisibleModal(false);

    // Reset settings
    batch(() => {
      const subcategories = sortBy(categoriesList()[0].subcategories, ['name']);
      setSubcategoriesList(subcategories);
      setSelectedCategory(categoriesList()[0].normalized_name);
      setSelectedSubcategory(subcategories[0].normalized_name);
      setKey(`${categoriesList()[0].normalized_name}--${subcategories[0].normalized_name}`);
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

  onMount(() => {
    setUrl(getIFrameUrl());
  });

  createEffect(() => {
    setUrl(getIFrameUrl());
  });

  createEffect(
    on(point, () => {
      if (visibleModal() && !isUndefined(point()) && SMALL_DEVICES_BREAKPOINTS.includes(point()!)) {
        onClose();
      }
    })
  );

  createEffect(
    on(visibleModal, () => {
      if (visibleModal()) {
        setPrevSearch(location.search);
        setPrevHash(location.hash);
        setUrl(getIFrameUrl());
      }
    })
  );

  createEffect(
    on(displayItemModal, () => {
      if (displayItemModal()) {
        import(`${embedOrigin()}/embed-item.js`).then(() => {
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
        >
          <SVGIcon kind={SVGIconKind.Embed} />
        </button>
      </div>
      <Show when={visibleModal()}>
        <Modal
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
                        <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>Category</div>
                        <select
                          id="categories"
                          class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                          value={selectedCategory()}
                          aria-label="Categories"
                          onChange={(e) => {
                            updateCategory(e.currentTarget.value);
                          }}
                        >
                          <For each={categoriesList()}>
                            {(cat: Category) => {
                              return <option value={cat.normalized_name}>{cat.name}</option>;
                            }}
                          </For>
                        </select>
                      </div>
                      <div class="mt-4">
                        <div class={`text-uppercase text-muted fw-semibold mb-1 ${styles.labelSelect}`}>
                          Subcategory
                        </div>
                        <select
                          id="subcategories"
                          class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                          value={selectedSubcategory() || subcategoriesList()[0].normalized_name}
                          aria-label="Subcategories"
                          onChange={(e) => {
                            const value = e.currentTarget.value;
                            setSelectedSubcategory(value);
                            setKey(`${selectedCategory()}${value !== 'all' ? `--${value}` : ''}`);
                          }}
                        >
                          <option value="all">All</option>
                          <For each={sortBy(subcategoriesList(), ['name'])}>
                            {(subcat: Subcategory) => {
                              return <option value={subcat.normalized_name}>{subcat.name}</option>;
                            }}
                          </For>
                        </select>
                      </div>
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
                          <label class={`text-muted form-check-label text-nowrap ${styles.label}`}>Font family:</label>
                          <select
                            id="fontFamily"
                            class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                            value={titleFontFamily()}
                            aria-label="Font family"
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
                          <label class={`text-muted form-check-label text-nowrap ${styles.label}`}>
                            Font size (px):
                          </label>
                          <div>
                            <input
                              type="number"
                              class={`form-control withShadow rounded-0 border-0 ${styles.input}`}
                              min={10}
                              max={60}
                              value={titleSize()}
                              aria-label="Size"
                              onChange={(e) => {
                                setTitleSize(parseInt(e.currentTarget.value));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div class="d-flex flex-column mt-3">
                        <label class={`text-muted form-check-label text-nowrap ${styles.label}`}>Alignment</label>
                        <select
                          id="alignment"
                          class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                          value={titleAlignment()}
                          aria-label="Styles"
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
                        <Show when={displayItemName()}>
                          <div class="d-flex flex-column mt-3">
                            <label class={`text-muted form-check-label text-nowrap ${styles.label}`}>
                              Item name font size (px):
                            </label>
                            <div>
                              <input
                                type="number"
                                class={`form-control withShadow rounded-0 border-0 ${styles.input}`}
                                min={10}
                                max={40}
                                value={itemNameSize()}
                                aria-label="Size"
                                onChange={(e) => {
                                  setItemNameSize(parseInt(e.currentTarget.value));
                                }}
                              />
                            </div>
                          </div>
                        </Show>
                      </Show>

                      <div class="d-flex flex-column mt-3">
                        <label class={`text-muted form-check-label text-nowrap ${styles.label}`}>Style</label>
                        <select
                          id="styles"
                          class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                          value={selectedStyle()}
                          aria-label="Styles"
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
                          <label class={`text-muted form-check-label text-nowrap ${styles.label}`}>Size</label>
                          <select
                            id="sizes"
                            class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                            value={selectedSize()}
                            aria-label="Sizes"
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
                          <label class={`text-muted form-check-label text-nowrap ${styles.label}`}>Alignment</label>
                          <select
                            id="alignment"
                            class={`form-select form-select-md border-0 rounded-0 ${styles.select}`}
                            value={itemsAlignment()}
                            aria-label="Styles"
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
                        <div class="d-flex flex-column mt-3">
                          <label class={`text-muted form-check-label text-nowrap ${styles.label}`}>
                            Gap between items:
                          </label>
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
                                      aria-checked={itemsSpacingType() === t}
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
                            <input
                              type="number"
                              min={0}
                              class={`form-control withShadow rounded-0 border-0 ${styles.input}`}
                              value={itemsSpacing()}
                              aria-label="Items spacing"
                              onChange={(e) => {
                                setItemsSpacing(parseInt(e.currentTarget.value));
                              }}
                            />
                          </Show>
                        </div>
                      </Show>
                    </div>
                  </div>
                  <div class="col-8 col-xxl-9 border-start">
                    <div class="h-100 d-flex flex-column">
                      <div class={`text-uppercase text-muted fw-semibold ${styles.labelSelect} ${styles.previewTitle}`}>
                        Preview
                      </div>
                      <Show when={!isUndefined(url())}>
                        <div class="p-4 pt-2 flex-grow-1">
                          <iframe src={url()} class="d-block w-100 h-100 border-0 scroll-auto" />
                          <Show when={displayItemModal() && embedScriptLoaded()}>
                            <iframe
                              id="embed-item"
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
                                'z-index': '999999999',
                              }}
                            />
                          </Show>
                        </div>
                      </Show>
                    </div>
                  </div>
                </div>
              </div>

              <div class={`border-top p-4 ${styles.codeWrapper}`}>
                <div class={`text-uppercase text-muted fw-semibold mb-2 ${styles.labelSelect}`}>Embed code</div>
                <CodeBlock
                  language="html"
                  content={
                    !isUndefined(url())
                      ? `<!-- Landscape embed view -->\n<iframe src="${url()}" style="width:100%;height:100%;display:block;border:none;"></iframe>${getExtraCode()}`
                      : ''
                  }
                  alignment="top"
                  orientation="column"
                  codeClass={`bg-dark text-white ${styles.code}`}
                  btnWrapperClass="mt-2 ms-auto"
                  withCopyBtn
                  visibleBtnText
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

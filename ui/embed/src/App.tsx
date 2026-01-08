import { capitalizeFirstLetter, formatTAGName } from 'common';
import { batch, createEffect, createMemo, createSignal, For, Match, on, onMount, Show, Switch } from 'solid-js';
import { styled } from 'solid-styled-components';

import ExternalLink from './common/ExternalLink';
import Loading from './common/Loading';
import NoData from './common/NoData';
import StyleView from './common/StyleView';
import {
  Alignment,
  BASE_PATH_PARAM,
  BaseItem,
  CATEGORIES_PARAM,
  Category,
  CategoryClassification,
  CLASSIFY_BY_PARAM,
  ClassifyType,
  Data,
  DEFAULT_CLASSIFY_TYPE,
  DEFAULT_DISPLAY_CATEGORY_HEADER,
  DEFAULT_DISPLAY_CATEGORY_IN_SUBCATEGORY,
  DEFAULT_DISPLAY_HEADER,
  DEFAULT_DISPLAY_ITEM_MODAL,
  DEFAULT_DISPLAY_ITEM_NAME,
  DEFAULT_HIDE_ORGANIZATION_SECTION,
  DEFAULT_ITEM_NAME_SIZE,
  DEFAULT_ITEMS_ALIGNMENT,
  DEFAULT_ITEMS_SIZE,
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
  HIDE_ORGANIZATION_SECTION_PARAM,
  ITEM_NAME_SIZE_PARAM,
  ITEMS_ALIGNMENT_PARAM,
  ITEMS_SIZE_PARAM,
  ITEMS_SPACING_PARAM,
  ITEMS_STYLE_PARAM,
  KEY_PARAM,
  MaturityClassification,
  Size,
  Style,
  SUBCATEGORIES_PARAM,
  TagClassification,
  TITLE_ALIGNMENT_PARAM,
  TITLE_BGCOLOR_PARAM,
  TITLE_FGCOLOR_PARAM,
  TITLE_FONT_FAMILY_PARAM,
  TITLE_SIZE_PARAM,
  UPPERCASE_TITLE_PARAM,
} from './types';
import getUrl from './utils/getUrl';

interface TitleProps {
  isBgTransparent: boolean;
  size: number;
  alignment: Alignment;
  uppercase: boolean;
  firstTitle?: boolean;
  spacing?: number;
  multiCategory?: boolean;
}

interface ContentProps {
  fontFamily: FontFamily;
}

interface MultiCategoryEntry {
  category: Category;
  items: BaseItem[];
}

const FONT_FAMILY_OPTIONS = {
  [FontFamily.Serif]: `Times, "Times New Roman", Georgia, Palatino, serif`,
  [FontFamily.SansSerif]: `"Clarity City", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, Roboto, "Noto Sans", Ubuntu, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
  [FontFamily.Monospace]: `Courier, Consolas, "Andale Mono", monospace`,
};

const Content = styled('div')`
  margin: 0;
  padding: 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;

  *,
  *::before,
  *::after {
    font-family: ${(props: ContentProps) => FONT_FAMILY_OPTIONS[props.fontFamily]};
    box-sizing: border-box;
  }
`;

const Title = styled('div')`
  background-color: var(--bg-color);
  color: var(--fg-color);
  padding: ${(props: TitleProps) => (props.isBgTransparent ? '0.5rem 0' : '0.5rem 0.75rem')};
  font-size: ${(props: TitleProps) => (props.size ? `${props.size}px` : '0.8rem')};
  text-align: ${(props: TitleProps) => props.alignment};
  text-transform: ${(props: TitleProps) => (props.uppercase ? 'uppercase' : 'normal')};
  margin: ${(props: TitleProps) => {
    const marginValue = typeof props.spacing !== 'undefined' && props.spacing > 16 ? `${props.spacing}px` : '16px';
    const extraMarginValue =
      typeof props.spacing !== 'undefined' && props.spacing > 16 ? `${props.spacing * 2}px` : '32px';
    if (props.multiCategory) {
      return props.firstTitle ? `0 0 ${marginValue} 0` : `${extraMarginValue} 0 ${marginValue} 0`;
    }
    return `0 0 ${marginValue} 0`;
  }};
  font-weight: 500;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Subtitle = styled('div')`
  background-color: var(--bg-color);
  color: var(--fg-color);
  padding: ${(props: TitleProps) => (props.isBgTransparent ? '0.5rem 0' : '0.5rem 0.75rem')};
  font-size: ${(props: TitleProps) => (props.size ? `${props.size}px` : '0.8rem')};
  text-align: ${(props: TitleProps) => props.alignment};
  text-transform: ${(props: TitleProps) => (props.uppercase ? 'uppercase' : 'normal')};
  font-weight: 500;
  line-height: 1.5;
  margin: ${(props: TitleProps) => {
    const marginValue = typeof props.spacing !== 'undefined' && props.spacing > 16 ? `${props.spacing}px` : '16px';
    return typeof props.firstTitle !== 'undefined' && props.firstTitle
      ? `0 0 ${marginValue} 0`
      : `${marginValue} 0 ${marginValue} 0`;
  }};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const App = () => {
  const [basePath, setBasePath] = createSignal<string>('');
  const [classifyBy, setClassifyBy] = createSignal<string>(DEFAULT_CLASSIFY_TYPE);
  const [key, setKey] = createSignal<string>();
  const [data, setData] = createSignal<Data | null>();
  const [displayHeader, setDisplayHeader] = createSignal<boolean>(DEFAULT_DISPLAY_HEADER);
  const [itemsStyleView, setItemsStyleView] = createSignal<Style>(DEFAULT_ITEMS_STYLE_VIEW);
  const [isBgTransparent, setIsBgTransparent] = createSignal<boolean>(false);
  const [titleBgColor, setTitleBgColor] = createSignal<string>(DEFAULT_TITLE_BG_COLOR);
  const [tilteFgColor, setTitleFgColor] = createSignal<string>(DEFAULT_TITLE_FG_COLOR);
  const [itemsSize, setItemsSize] = createSignal<Size>(DEFAULT_ITEMS_SIZE);
  const [displayCategoryTitle, setDisplayCategoryTitle] = createSignal<boolean>(DEFAULT_DISPLAY_CATEGORY_HEADER);
  const [displayCategoryInSubcategory, setDisplayCategoryInSubcategory] = createSignal<boolean>(
    DEFAULT_DISPLAY_CATEGORY_IN_SUBCATEGORY
  );
  const [uppercaseTitle, setUppercaseTitle] = createSignal<boolean>(DEFAULT_UPPERCASE_TITLE);
  const [titleAlignment, setTitleAlignment] = createSignal<Alignment>(DEFAULT_TITLE_ALIGNMENT);
  const [titleFontFamily, setTitleFontFamily] = createSignal<FontFamily>(DEFAULT_TITLE_FONT_FAMILY);
  const [titleSize, setTitleSize] = createSignal<number>(DEFAULT_TITLE_SIZE);
  const [displayItemName, setDisplayItemName] = createSignal<boolean>(DEFAULT_DISPLAY_ITEM_NAME);
  const [itemNameSize, setItemNameSize] = createSignal<number>(DEFAULT_ITEM_NAME_SIZE);
  const [itemsAlignment, setItemsAlignment] = createSignal<Alignment>(DEFAULT_ITEMS_ALIGNMENT);
  const [itemsSpacing, setItemsSpacing] = createSignal<number | undefined>();
  const [selectedSubcategories, setSelectedSubcategories] = createSignal<string[]>([]);
  const [selectedCategories, setSelectedCategories] = createSignal<string[]>([]);
  const [multiCategoriesData, setMultiCategoriesData] = createSignal<MultiCategoryEntry[] | null | undefined>(
    undefined
  );
  const [multiCategoriesFoundation, setMultiCategoriesFoundation] = createSignal<string>('');
  const [multiCategoriesKey, setMultiCategoriesKey] = createSignal<string>();
  const [displayItemModal, setDisplayItemModal] = createSignal<boolean>(DEFAULT_DISPLAY_ITEM_MODAL);
  const [hideOrganizationSection, setHideOrganizationSection] = createSignal<boolean>(
    DEFAULT_HIDE_ORGANIZATION_SECTION
  );
  const [activeItemId, setActiveItemId] = createSignal<string | null>(null);
  const origin = () => (import.meta.env.MODE === 'development' ? `http://localhost:8000` : `${basePath()}`);

  // Sort items by name alphabetically
  const sortItemsByName = (items: BaseItem[]): BaseItem[] => {
    return items.sort((a, b) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  };

  const getSortedItems = (items: BaseItem[]): BaseItem[] => {
    return sortItemsByName([...items]);
  };

  const isMultiCategorySelection = createMemo(() => {
    return classifyBy() === ClassifyType.Category && selectedCategories().length > 1;
  });

  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => value === b[index]);
  };

  const filterItemsBySubcategory = (items: BaseItem[], categoryName: string, subcategoryName: string): BaseItem[] => {
    const filtered = items.filter((item) => {
      if (item.category === categoryName && item.subcategory === subcategoryName) {
        return true;
      }
      if (!item.additional_categories) {
        return false;
      }
      return item.additional_categories.some((additionalCategory) => {
        return additionalCategory.category === categoryName && additionalCategory.subcategory === subcategoryName;
      });
    });
    return getSortedItems(filtered);
  };

  const loadMultiCategoryData = async (categories: string[], originUrl: string) => {
    setMultiCategoriesData(undefined);
    setMultiCategoriesFoundation('');
    try {
      const normalizedSelection = Array.from(new Set(categories.filter((value) => value && value.trim() !== '')));

      if (normalizedSelection.length === 0) {
        setMultiCategoriesKey();
        setMultiCategoriesData(null);
        return;
      }

      const responses = await Promise.all(
        normalizedSelection.map(async (normalized) => {
          try {
            const response = await fetch(`${originUrl}/data/embed_category_${normalized}.json`);
            if (!response.ok) {
              return null;
            }
            const json = await response.json();
            const categoryClassification = json?.classification?.category ?? json?.category;
            if (
              !categoryClassification ||
              typeof categoryClassification.name !== 'string' ||
              typeof categoryClassification.normalized_name !== 'string'
            ) {
              return null;
            }
            const items: BaseItem[] = Array.isArray(json.items) ? json.items : [];
            const category: Category = {
              name: categoryClassification.name,
              normalized_name: categoryClassification.normalized_name,
              subcategories: Array.isArray(categoryClassification.subcategories)
                ? categoryClassification.subcategories
                : [],
            };
            const foundation = typeof json.foundation === 'string' ? json.foundation : '';
            return {
              key: category.normalized_name || normalized,
              foundation,
              entry: {
                category,
                items,
              } as MultiCategoryEntry,
            };
          } catch {
            return null;
          }
        })
      );

      const validEntries = responses.filter(
        (value): value is { key: string; foundation: string; entry: MultiCategoryEntry } => Boolean(value)
      );

      if (validEntries.length === 0) {
        setMultiCategoriesKey();
        setMultiCategoriesData(null);
        return;
      }

      const selectionKeys = validEntries.map((value) => value.key);

      if (!arraysEqual(selectionKeys, selectedCategories())) {
        setSelectedCategories(selectionKeys);
      }

      setMultiCategoriesKey(selectionKeys.join('__'));

      const foundations = validEntries
        .map((value) => value.foundation)
        .filter((value): value is string => value !== '');
      setMultiCategoriesFoundation(foundations.length > 0 ? foundations[0] : '');
      setMultiCategoriesData(validEntries.map((value) => value.entry));
    } catch {
      setMultiCategoriesFoundation('');
      setMultiCategoriesKey();
      setMultiCategoriesData(null);
    }
  };

  createEffect(
    on(selectedCategories, (currentSelection) => {
      if (classifyBy() !== ClassifyType.Category) {
        return;
      }
      if (!currentSelection || currentSelection.length <= 1) {
        return;
      }
      const selectionKey = currentSelection.join('__');
      const currentKey = multiCategoriesKey();
      const currentData = multiCategoriesData();
      if (currentKey !== selectionKey || typeof currentData === 'undefined' || currentData === null) {
        loadMultiCategoryData(currentSelection, origin());
      }
    })
  );

  const allVisibleItems = createMemo(() => {
    if (isMultiCategorySelection()) {
      const entries = multiCategoriesData();
      if (!entries || !Array.isArray(entries)) {
        return [];
      }
      return entries.flatMap((entry) => entry.items);
    }
    if (data()) {
      return data()!.items;
    }
    return [];
  });

  const currentFoundation = createMemo(() => {
    if (isMultiCategorySelection()) {
      return multiCategoriesFoundation();
    }
    return data()?.foundation || '';
  });

  const isLoadingEmbedData = createMemo(() => {
    if (isMultiCategorySelection()) {
      return typeof multiCategoriesData() === 'undefined';
    }
    return typeof data() === 'undefined';
  });

  const hasEmbedData = createMemo(() => {
    if (isMultiCategorySelection()) {
      return multiCategoriesData() !== null;
    }
    return data() !== null;
  });

  const multiCategoryEntries = createMemo(() => {
    const entries = multiCategoriesData();
    return Array.isArray(entries) ? entries : [];
  });

  const filterBySelectedSubcategories = (input: Data, currentClassify: string, currentSelection: string[]): Data => {
    if (currentClassify !== ClassifyType.Category) {
      return input;
    }

    const normalizedSelection = Array.from(
      new Set(currentSelection.filter((value) => value !== '' && value !== 'all'))
    );

    if (normalizedSelection.length === 0) {
      return input;
    }

    const categoryClassification = input.classification as CategoryClassification;
    const filteredSubcategories = categoryClassification.category.subcategories.filter((subcategory) =>
      normalizedSelection.includes(subcategory.normalized_name)
    );

    if (filteredSubcategories.length === 0) {
      return input;
    }

    const allowedNames = new Set(filteredSubcategories.map((subcategory) => subcategory.name));
    const filteredItems = input.items.filter((item) => {
      if (allowedNames.has(item.subcategory)) {
        return true;
      }
      if (!item.additional_categories) {
        return false;
      }
      return item.additional_categories.some((additionalCategory) => {
        return (
          additionalCategory.category === categoryClassification.category.name &&
          allowedNames.has(additionalCategory.subcategory)
        );
      });
    });

    return {
      ...input,
      classification: {
        ...categoryClassification,
        category: {
          ...categoryClassification.category,
          subcategories: filteredSubcategories,
        },
      },
      items: filteredItems,
    };
  };

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const basePathParam = urlParams.get(BASE_PATH_PARAM);
    const classifyByParam = urlParams.get(CLASSIFY_BY_PARAM);
    const keyParam = urlParams.get(KEY_PARAM);
    const categoriesParam = urlParams.get(CATEGORIES_PARAM);
    const displayHeaderParam = urlParams.get(DISPLAY_HEADER_PARAM);
    const styleParam = urlParams.get(ITEMS_STYLE_PARAM);
    const sizeParam = urlParams.get(ITEMS_SIZE_PARAM);
    const bgParam = urlParams.get(TITLE_BGCOLOR_PARAM);
    const fgParam = urlParams.get(TITLE_FGCOLOR_PARAM);
    const displayCategoryParam = urlParams.get(DISPLAY_HEADER_CATEGORY_PARAM);
    const displayCategoryInSubcategoryParam = urlParams.get(DISPLAY_CATEGORY_IN_SUBCATEGORY_PARAM);
    const titleAlignmentParam = urlParams.get(TITLE_ALIGNMENT_PARAM);
    const titleFontFamilyParam = urlParams.get(TITLE_FONT_FAMILY_PARAM);
    const titleSizeParam = urlParams.get(TITLE_SIZE_PARAM);
    const displayItemNameParam = urlParams.get(DISPLAY_ITEM_NAME_PARAM);
    const itemNameSizeParam = urlParams.get(ITEM_NAME_SIZE_PARAM);
    const alignmentParam = urlParams.get(ITEMS_ALIGNMENT_PARAM);
    const spacingParam = urlParams.get(ITEMS_SPACING_PARAM);
    const uppercaseParam = urlParams.get(UPPERCASE_TITLE_PARAM);
    const displayItemModalParam = urlParams.get(DISPLAY_ITEM_MODAL_PARAM);
    const hideOrganizationSectionParam = urlParams.get(HIDE_ORGANIZATION_SECTION_PARAM);
    const subcategoriesParam = urlParams.get(SUBCATEGORIES_PARAM);

    const parsedCategories = categoriesParam
      ? categoriesParam
          .split(',')
          .map((value) => value.trim())
          .filter((value) => value !== '')
      : [];
    const uniqueCategories = Array.from(new Set(parsedCategories));

    let isValidSize = true;
    let isValidStyle = true;

    batch(() => {
      if (classifyByParam !== null) {
        setClassifyBy(classifyByParam);
      }
      setDisplayHeader(displayHeaderParam === 'true');
      if (displayCategoryParam !== null) {
        setDisplayCategoryTitle(displayCategoryParam === 'true');
      }
      if (displayCategoryInSubcategoryParam !== null) {
        setDisplayCategoryInSubcategory(displayCategoryInSubcategoryParam === 'true');
      }
      if (uppercaseParam !== null) {
        setUppercaseTitle(uppercaseParam === 'true');
      }
      if (displayItemNameParam !== null) {
        setDisplayItemName(displayItemNameParam === 'true');
        if (itemNameSizeParam !== null) {
          const itemNameS = parseInt(itemNameSizeParam);
          if (itemNameS >= 10 && itemNameS <= 40) {
            setItemNameSize(itemNameS);
          }
        }
      }
      if (styleParam !== null) {
        if (Object.values(Style).includes(styleParam as Style)) {
          setItemsStyleView(styleParam as Style);
        } else {
          isValidStyle = false;
        }
      }
      if (sizeParam !== null) {
        if (Object.values(Size).includes(sizeParam as Size)) {
          setItemsSize(sizeParam as Size);
        } else {
          isValidSize = false;
        }
      }
      if (bgParam !== null) {
        setTitleBgColor(bgParam);
        setIsBgTransparent(bgParam === 'transparent');
      }
      if (fgParam !== null) {
        setTitleFgColor(fgParam);
      }
      if (titleFontFamilyParam !== null) {
        setTitleFontFamily(titleFontFamilyParam as FontFamily);
      }
      if (titleAlignmentParam !== null) {
        setTitleAlignment(titleAlignmentParam as Alignment);
      }
      if (titleSizeParam !== null) {
        const titleS = parseInt(titleSizeParam);
        if (titleS >= 10 && titleS <= 60) {
          setTitleSize(titleS);
        }
      }
      if (alignmentParam !== null) {
        setItemsAlignment(alignmentParam as Alignment);
      }
      if (spacingParam !== null) {
        const spacing = parseInt(spacingParam);
        if (spacing >= 0) {
          setItemsSpacing(spacing);
        }
      }
      if (displayItemModalParam !== null) {
        const displayItemModal = displayItemModalParam === 'true';
        setDisplayItemModal(displayItemModal);
        if (hideOrganizationSectionParam !== null) {
          setHideOrganizationSection(hideOrganizationSectionParam === 'true');
        }
      }
      setBasePath(basePathParam || '');
    });

    if (!isValidSize || !isValidStyle) {
      setData(null);
      setMultiCategoriesData(null);
      return;
    }

    if (classifyBy() !== ClassifyType.Category) {
      setSelectedCategories([]);
      setMultiCategoriesData(undefined);
      setMultiCategoriesFoundation('');
      setMultiCategoriesKey();
    }

    if (classifyBy() === ClassifyType.Category && uniqueCategories.length > 1) {
      setSelectedCategories(uniqueCategories);
      setSelectedSubcategories([]);
      setMultiCategoriesKey(uniqueCategories.join('__'));
      setMultiCategoriesData(undefined);
      setMultiCategoriesFoundation('');
      setData(null);
      setKey();
      return;
    }

    if (classifyBy() === ClassifyType.Category && uniqueCategories.length === 1) {
      setSelectedCategories(uniqueCategories);
    } else if (classifyBy() === ClassifyType.Category) {
      setSelectedCategories([]);
      setMultiCategoriesData(undefined);
      setMultiCategoriesFoundation('');
      setMultiCategoriesKey();
    }

    if (keyParam !== null) {
      batch(() => {
        if (classifyBy() === ClassifyType.Category && subcategoriesParam) {
          const parsedSubcategories = subcategoriesParam
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value !== '');
          setSelectedSubcategories(parsedSubcategories);
        } else {
          setSelectedSubcategories([]);
        }
        setKey(keyParam);
      });
    } else if (classifyBy() === ClassifyType.Category && uniqueCategories.length === 1) {
      batch(() => {
        setSelectedSubcategories([]);
        setKey(uniqueCategories[0]);
      });
    } else {
      setData(null);
    }
  });

  createEffect(
    on(key, () => {
      if (isMultiCategorySelection()) {
        return;
      }
      const currentKey = key();
      if (typeof currentKey === 'undefined') {
        return;
      }
      const currentClassifyBy = classifyBy();
      const currentSelections = selectedSubcategories();

      async function fetchData() {
        try {
          fetch(`${origin()}/data/embed_${currentClassifyBy}_${currentKey}.json`)
            .then((res) => {
              if (res.ok) {
                return res.json();
              }
              throw new Error('Something went wrong');
            })
            .then((res) => {
              setData(filterBySelectedSubcategories(res, currentClassifyBy, currentSelections));
            })
            .catch(() => {
              setData(null);
            });
        } catch {
          setData(null);
        }
      }

      fetchData();
    })
  );

  createEffect(
    on(activeItemId, () => {
      const currentId = activeItemId();
      if (currentId === null) {
        return;
      }
      const multiSelection = isMultiCategorySelection();
      const effectiveKey = multiSelection ? multiCategoriesKey() : key();
      if (!effectiveKey) {
        setActiveItemId(null);
        return;
      }
      window.parent.postMessage(
        {
          type: 'showItemDetails',
          itemId: currentId,
          classifyBy: classifyBy(),
          key: effectiveKey,
          foundation: currentFoundation(),
          basePath: origin(),
          hideOrganizationSection: hideOrganizationSection(),
          categories: multiSelection ? selectedCategories() : undefined,
        },
        '*'
      );
      setActiveItemId(null);
    })
  );

  return (
    <Content
      fontFamily={titleFontFamily()}
      style={{
        all: 'initial',
        isolation: 'isolate',
        overflow: 'hidden',
        '--bg-color': titleBgColor(),
        '--fg-color': tilteFgColor(),
      }}
    >
      <Show when={!isLoadingEmbedData()} fallback={<Loading bgColor={titleBgColor()} />}>
        <Show
          when={hasEmbedData()}
          fallback={
            <NoData>
              <div>
                <h4>Invalid embed url</h4>
                <p>
                  Please visit: <ExternalLink href={`${getUrl()}/embed-setup`}>{getUrl()}/embed-setup</ExternalLink>
                </p>
              </div>
            </NoData>
          }
        >
          <Show
            when={displayHeader()}
            fallback={
              <StyleView
                items={getSortedItems(allVisibleItems())}
                foundation={currentFoundation()}
                style={itemsStyleView()}
                size={itemsSize()}
                alignment={itemsAlignment()}
                spacing={itemsSpacing()}
                displayName={displayItemName()}
                itemNameSize={itemNameSize()}
                displayItemModal={displayItemModal()}
                setActiveItemId={setActiveItemId}
              />
            }
          >
            <Switch>
              <Match when={classifyBy() === ClassifyType.Category}>
                <Switch>
                  <Match when={isMultiCategorySelection()}>
                    <For each={multiCategoryEntries()}>
                      {(entry, categoryIndex) => {
                        if (entry.items.length === 0) {
                          return null;
                        }
                        return (
                          <>
                            <Show when={displayCategoryTitle()}>
                              <Title
                                isBgTransparent={isBgTransparent()}
                                size={titleSize()}
                                alignment={titleAlignment()}
                                uppercase={uppercaseTitle()}
                                firstTitle={categoryIndex() === 0}
                                multiCategory
                                spacing={itemsSpacing()}
                              >
                                {entry.category.name}
                              </Title>
                            </Show>
                            <For each={entry.category.subcategories}>
                              {(subcategory, subIndex) => {
                                const items = filterItemsBySubcategory(
                                  entry.items,
                                  entry.category.name,
                                  subcategory.name
                                );

                                if (items.length === 0) {
                                  return null;
                                }

                                return (
                                  <>
                                    <Subtitle
                                      isBgTransparent={isBgTransparent()}
                                      size={titleSize()}
                                      alignment={titleAlignment()}
                                      uppercase={uppercaseTitle()}
                                      firstTitle={categoryIndex() === 0 && subIndex() === 0}
                                      spacing={itemsSpacing()}
                                    >
                                      <Show when={displayCategoryInSubcategory()}>{entry.category.name} - </Show>
                                      {subcategory.name} ({items.length})
                                    </Subtitle>
                                    <StyleView
                                      items={items}
                                      foundation={currentFoundation()}
                                      style={itemsStyleView()}
                                      size={itemsSize()}
                                      alignment={itemsAlignment()}
                                      spacing={itemsSpacing()}
                                      displayName={displayItemName()}
                                      itemNameSize={itemNameSize()}
                                      displayItemModal={displayItemModal()}
                                      setActiveItemId={setActiveItemId}
                                    />
                                  </>
                                );
                              }}
                            </For>
                          </>
                        );
                      }}
                    </For>
                  </Match>
                  <Match when={!isMultiCategorySelection()}>
                    <Show when={displayCategoryTitle()}>
                      <Title
                        isBgTransparent={isBgTransparent()}
                        size={titleSize()}
                        alignment={titleAlignment()}
                        uppercase={uppercaseTitle()}
                        spacing={itemsSpacing()}
                      >
                        {(data()!.classification as CategoryClassification).category.name}
                      </Title>
                    </Show>
                    <For each={(data()!.classification as CategoryClassification).category.subcategories}>
                      {(subcategory, index) => {
                        const items = filterItemsBySubcategory(
                          data()!.items,
                          (data()!.classification as CategoryClassification).category.name,
                          subcategory.name
                        );

                        if (items.length === 0) {
                          return null;
                        }

                        return (
                          <>
                            <Subtitle
                              isBgTransparent={isBgTransparent()}
                              size={titleSize()}
                              alignment={titleAlignment()}
                              uppercase={uppercaseTitle()}
                              firstTitle={index() === 0}
                              spacing={itemsSpacing()}
                            >
                              <Show when={displayCategoryInSubcategory()}>
                                {(data()!.classification as CategoryClassification).category.name} -{' '}
                              </Show>
                              {subcategory.name} ({items.length})
                            </Subtitle>
                            <StyleView
                              items={items}
                              foundation={currentFoundation()}
                              style={itemsStyleView()}
                              size={itemsSize()}
                              alignment={itemsAlignment()}
                              spacing={itemsSpacing()}
                              displayName={displayItemName()}
                              itemNameSize={itemNameSize()}
                              displayItemModal={displayItemModal()}
                              setActiveItemId={setActiveItemId}
                            />
                          </>
                        );
                      }}
                    </For>
                  </Match>
                </Switch>
              </Match>

              <Match when={classifyBy() === ClassifyType.Maturity}>
                <For each={(data()!.classification as MaturityClassification).maturity}>
                  {(maturity, index) => {
                    const items = getSortedItems(
                      data()!.items.filter((item: BaseItem) => item.maturity === maturity.name)
                    );

                    return (
                      <>
                        <Subtitle
                          isBgTransparent={isBgTransparent()}
                          size={titleSize()}
                          alignment={titleAlignment()}
                          uppercase={uppercaseTitle()}
                          firstTitle={index() === 0}
                          spacing={itemsSpacing()}
                        >
                          {capitalizeFirstLetter(maturity.name)} ({items.length})
                        </Subtitle>
                        <StyleView
                          items={items}
                          foundation={currentFoundation()}
                          style={itemsStyleView()}
                          size={itemsSize()}
                          alignment={itemsAlignment()}
                          spacing={itemsSpacing()}
                          displayName={displayItemName()}
                          itemNameSize={itemNameSize()}
                          displayItemModal={displayItemModal()}
                          setActiveItemId={setActiveItemId}
                        />
                      </>
                    );
                  }}
                </For>
              </Match>
              <Match when={classifyBy() === ClassifyType.TAG}>
                <For each={(data()!.classification as TagClassification).tag}>
                  {(tag, index) => {
                    const items = getSortedItems(
                      data()!.items.filter((item: BaseItem) => item.tag && item.tag.includes(tag.name))
                    );

                    return (
                      <>
                        <Subtitle
                          isBgTransparent={isBgTransparent()}
                          size={titleSize()}
                          alignment={titleAlignment()}
                          uppercase={uppercaseTitle()}
                          firstTitle={index() === 0}
                          spacing={itemsSpacing()}
                        >
                          {formatTAGName(tag.name)} ({items.length})
                        </Subtitle>
                        <StyleView
                          items={items}
                          foundation={currentFoundation()}
                          style={itemsStyleView()}
                          size={itemsSize()}
                          alignment={itemsAlignment()}
                          spacing={itemsSpacing()}
                          displayName={displayItemName()}
                          itemNameSize={itemNameSize()}
                          displayItemModal={displayItemModal()}
                          setActiveItemId={setActiveItemId}
                        />
                      </>
                    );
                  }}
                </For>
              </Match>
            </Switch>
          </Show>
        </Show>
      </Show>
    </Content>
  );
};

export default App;

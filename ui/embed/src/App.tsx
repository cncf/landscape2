import { batch, createEffect, createSignal, For, on, onMount, Show } from 'solid-js';
import { styled } from 'solid-styled-components';

import ExternalLink from './common/ExternalLink';
import Loading from './common/Loading';
import NoData from './common/NoData';
import StyleView from './common/StyleView';
import {
  Alignment,
  BASE_PATH_PARAM,
  BaseItem,
  Data,
  DEFAULT_DISPLAY_CATEGORY_HEADER,
  DEFAULT_DISPLAY_CATEGORY_IN_SUBCATEGORY,
  DEFAULT_DISPLAY_HEADER,
  DEFAULT_DISPLAY_ITEM_MODAL,
  DEFAULT_DISPLAY_ITEM_NAME,
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
} from './types';
import getUrl from './utils/getUrl';

interface TitleProps {
  isBgTransparent: boolean;
  size: number;
  alignment: Alignment;
  uppercase: boolean;
  firstTitle?: boolean;
  spacing?: number;
}

interface ContentProps {
  fontFamily: FontFamily;
}

const FONT_FAMILY_OPTIONS = {
  [FontFamily.Serif]: `Times, "Times New Roman", Georgia, Palatino, serif`,
  [FontFamily.SansSerif]: `"Clarity City", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, Roboto, Ubuntu, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
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

const CategoryTitle = styled('div')`
  background-color: var(--bg-color);
  color: var(--fg-color);
  padding: ${(props: TitleProps) => (props.isBgTransparent ? '0.5rem 0' : '0.5rem 0.75rem')};
  font-size: ${(props: TitleProps) => (props.size ? `${props.size}px` : '0.8rem')};
  text-align: ${(props: TitleProps) => props.alignment};
  text-transform: ${(props: TitleProps) => (props.uppercase ? 'uppercase' : 'normal')};
  font-weight: 500;
  line-height: 1.5;
  overflow: hidden;
  margin-bottom: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SubcategoryTitle = styled('div')`
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
  const [displayItemModal, setDisplayItemModal] = createSignal<boolean>(DEFAULT_DISPLAY_ITEM_MODAL);
  const [activeItemId, setActiveItemId] = createSignal<string | null>(null);
  const origin = () => (import.meta.env.MODE === 'development' ? `http://localhost:8000` : `${basePath()}`);

  // Sort items by name alphabetically
  const sortItemsByName = (items: BaseItem[]): BaseItem[] => {
    return items.sort((a, b) => {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  };

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const basePathParam = urlParams.get(BASE_PATH_PARAM);
    const keyParam = urlParams.get(KEY_PARAM);
    const displayHeaderParam = urlParams.get(DISPLAY_HEADER_PARAM);
    const styleParam = urlParams.get(ITEMS_STYLE_PARAM);
    const sizeParam = urlParams.get(ITEMS_SIZE_PARAM);
    const bgParam = urlParams.get(TITLE_BGCOLOR_PARAM);
    const fgParam = urlParams.get(TITLE_FGCOLOR_PARAM);
    const displayCategoryParam = urlParams.get(DISPLAY_HEADER_CATEGORY_PARAM);
    const displayCategoryInSubcategoryParam = urlParams.get(DISPLAY_CATEGORY_IN_SUBCATEGORY_PARAM);
    const titleAligmentParam = urlParams.get(TITLE_ALIGNMENT_PARAM);
    const titleFontFamilyParam = urlParams.get(TITLE_FONT_FAMILY_PARAM);
    const titleSizeParam = urlParams.get(TITLE_SIZE_PARAM);
    const displayItemNameParam = urlParams.get(DISPLAY_ITEM_NAME_PARAM);
    const itemNameSizeParam = urlParams.get(ITEM_NAME_SIZE_PARAM);
    const alignmentParam = urlParams.get(ITEMS_ALIGNMENT_PARAM);
    const spacingParam = urlParams.get(ITEMS_SPACING_PARAM);
    const uppercaseParam = urlParams.get(UPPERCASE_TITLE_PARAM);
    const displayItemModalParam = urlParams.get(DISPLAY_ITEM_MODAL_PARAM);

    batch(() => {
      if (keyParam !== null) {
        let isValidSize = true;
        let isValidStyle = true;
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
        if (titleAligmentParam !== null) {
          setTitleAlignment(titleAligmentParam as Alignment);
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
        }
        // When size and style are not valid, we don´t save the key
        if (isValidSize && isValidStyle) {
          setBasePath(basePathParam || '');
          setKey(keyParam);
        } else {
          setData(null);
        }
      } else {
        setData(null);
      }
    });
  });

  createEffect(
    on(key, () => {
      async function fetchData() {
        try {
          fetch(`${origin()}/data/embed_${key()}.json`)
            .then((res) => {
              if (res.ok) {
                return res.json();
              }
              throw new Error('Something went wrong');
            })
            .then((res) => {
              setData(res);
            })
            .catch(() => {
              setData(null);
            });
        } catch {
          setData(null);
        }
      }
      if (typeof key() !== 'undefined') {
        fetchData();
      }
    })
  );

  createEffect(
    on(activeItemId, () => {
      if (activeItemId() !== null) {
        window.parent.postMessage(
          {
            type: 'showItemDetails',
            itemId: activeItemId(),
            key: key(),
            foundation: data()!.foundation,
            basePath: origin(),
          },
          '*'
        );
        setActiveItemId(null);
      }
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
      <Show
        when={data() !== null}
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
        <Show when={typeof data() !== 'undefined'} fallback={<Loading bgColor={titleBgColor()} />}>
          <Show
            when={displayHeader()}
            fallback={
              <StyleView
                items={sortItemsByName(data()!.items)}
                foundation={data()!.foundation}
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
            <Show when={displayCategoryTitle()}>
              <CategoryTitle
                isBgTransparent={isBgTransparent()}
                size={titleSize()}
                alignment={titleAlignment()}
                uppercase={uppercaseTitle()}
              >
                {data()!.category.name}
              </CategoryTitle>
            </Show>
            <For each={data()!.category.subcategories}>
              {(subcategory, index) => {
                const items = sortItemsByName(
                  data()!.items.filter((item: BaseItem) => {
                    let inAdditionalCategory = false;
                    // Check if category/subcategory is in additional_categories
                    if (item.additional_categories) {
                      inAdditionalCategory = item.additional_categories.some((additionalCategory) => {
                        return (
                          additionalCategory.category === data()!.category.name &&
                          additionalCategory.subcategory === subcategory.name
                        );
                      });
                    }

                    return (
                      (item.category === data()!.category.name && item.subcategory === subcategory.name) ||
                      inAdditionalCategory
                    );
                  })
                );

                return (
                  <>
                    <SubcategoryTitle
                      isBgTransparent={isBgTransparent()}
                      size={titleSize()}
                      alignment={titleAlignment()}
                      uppercase={uppercaseTitle()}
                      firstTitle={index() === 0}
                      spacing={itemsSpacing()}
                    >
                      <Show when={displayCategoryInSubcategory()}>{data()!.category.name} - </Show>
                      {subcategory.name} ({items.length})
                    </SubcategoryTitle>
                    <StyleView
                      items={items}
                      foundation={data()!.foundation}
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
          </Show>
        </Show>
      </Show>
    </Content>
  );
};

export default App;

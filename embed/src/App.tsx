import { batch, createEffect, createSignal, For, on, onMount, Show } from 'solid-js';
import { styled } from 'solid-styled-components';

import ExternalLink from './common/ExternalLink';
import Loading from './common/Loading';
import NoData from './common/NoData';
import StyleView from './common/StyleView';
import {
  BaseItem,
  BGCOLOR_PARAM,
  Data,
  DEFAULT_BG_COLOR,
  DEFAULT_DISPLAY_HEADER,
  DEFAULT_FG_COLOR,
  DEFAULT_SIZE,
  DEFAULT_STYLE_VIEW,
  DISPLAY_HEADER_PARAM,
  FGCOLOR_PARAM,
  KEY_PARAM,
  Size,
  SIZE_PARAM,
  Style,
  STYLE_PARAM,
  Subcategory,
} from './types';
import getUrl from './utils/getUrl';

interface TitleProps {
  isBgTransparent: boolean;
}

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
    font-family: Clarity City, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Roboto, Ubuntu,
      Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol;
    box-sizing: border-box;
  }
`;

const CategoryTitle = styled('div')`
  background-color: var(--bg-color);
  color: var(--fg-color);
  padding: ${(props: TitleProps) => (props.isBgTransparent ? '0.5rem 0' : '0.5rem 0.75rem')};
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.5;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SubcategoryTitle = styled('div')`
  background-color: var(--bg-color);
  color: var(--fg-color);
  padding: ${(props: TitleProps) => (props.isBgTransparent ? '0.5rem 0' : '0.5rem 0.75rem')};
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.5;
  margin: 1rem 0;
  margin-top: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const App = () => {
  const [key, setKey] = createSignal<string>();
  const [data, setData] = createSignal<Data | null>();
  const [displayHeader, setDisplayHeader] = createSignal<boolean>(DEFAULT_DISPLAY_HEADER);
  const [styleView, setStyleView] = createSignal<Style>(DEFAULT_STYLE_VIEW);
  const [isBgTransparent, setIsBgTransparent] = createSignal<boolean>(false);
  const [bgColor, setBgColor] = createSignal<string>(DEFAULT_BG_COLOR);
  const [fgColor, setFgColor] = createSignal<string>(DEFAULT_FG_COLOR);
  const [size, setSize] = createSignal<Size>(DEFAULT_SIZE);

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const keyParam = urlParams.get(KEY_PARAM);
    const displayHeader = urlParams.get(DISPLAY_HEADER_PARAM);
    const styleParam = urlParams.get(STYLE_PARAM);
    const sizeParam = urlParams.get(SIZE_PARAM);
    const bgParam = urlParams.get(BGCOLOR_PARAM);
    const fgParam = urlParams.get(FGCOLOR_PARAM);

    batch(() => {
      if (keyParam !== null) {
        let isValidSize = true;
        let isValidStyle = true;
        setDisplayHeader(displayHeader === 'true');
        if (styleParam !== null) {
          if (Object.values(Style).includes(styleParam as Style)) {
            setStyleView(styleParam as Style);
          } else {
            isValidStyle = false;
          }
        }
        if (sizeParam !== null) {
          if (Object.values(Size).includes(sizeParam as Size)) {
            setSize(sizeParam as Size);
          } else {
            isValidSize = false;
          }
        }
        if (bgParam !== null) {
          setBgColor(bgParam);
          setIsBgTransparent(bgParam === 'transparent');
        }
        if (fgParam !== null) {
          setFgColor(fgParam);
        }
        // When size and style are not valid, we don´t save the key
        if (isValidSize && isValidStyle) {
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
          fetch(
            import.meta.env.MODE === 'development'
              ? `http://localhost:8000/data/embed_${key()}.json`
              : `../data/embed_${key()}.json`
          )
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

  return (
    <Content
      style={{
        all: 'initial',
        isolation: 'isolate',
        overflow: 'hidden',
        '--bg-color': bgColor(),
        '--fg-color': fgColor(),
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
        <Show when={typeof data() !== 'undefined'} fallback={<Loading bgColor={bgColor()} />}>
          <Show when={displayHeader()} fallback={<StyleView items={data()!.items} style={styleView()} size={size()} />}>
            <CategoryTitle isBgTransparent={isBgTransparent()}>{data()!.category.name}</CategoryTitle>
            <For each={data()!.category.subcategories}>
              {(subcategory: Subcategory) => {
                const items = data()!.items.filter((item: BaseItem) => {
                  return item.category === data()!.category.name && item.subcategory === subcategory.name;
                });

                return (
                  <>
                    <SubcategoryTitle isBgTransparent={isBgTransparent()}>
                      {subcategory.name} ({items.length})
                    </SubcategoryTitle>
                    <StyleView items={items} style={styleView()} size={size()} />
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

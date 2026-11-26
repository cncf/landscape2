import { useLocation } from '@solidjs/router';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createMemo, createSignal, on, onCleanup, Show } from 'solid-js';

import { CardMenu, ClassifyOption, SortDirection, SortOption } from '../../../types';
import { getAnchorId } from '../../../utils/anchorIds';
import goToElement from '../../../utils/goToElement';
import { CardData } from '../../../utils/itemsDataGetter';
import { parseHashId } from '../../../utils/urlParams';
import ButtonToTopScroll from '../../common/ButtonToTopScroll';
import { useFullDataReady } from '../../stores/fullData';
import styles from './CardCategory.module.css';
import Content from './Content';
import Menu from './Menu';

interface Props {
  initialIsVisible: boolean;
  classify: ClassifyOption;
  sorted: SortOption;
  direction: SortDirection;
  data?: CardData;
  menu?: CardMenu;
}

const CardCategory = (props: Props) => {
  const location = useLocation();
  const [firstLoad, setFirstLoad] = createSignal<boolean>(false);
  const [container, setContainer] = createSignal<HTMLDivElement>();
  const fullDataReady = useFullDataReady();
  const data = () => props.data;
  const isVisible = () => props.initialIsVisible;
  const menu = () => props.menu;
  // Anchor ids of every section in page order, with `undefined` for sections without an anchor
  const sectionAnchorIds = createMemo(() => {
    if (props.classify === ClassifyOption.None) return [];
    return Object.entries(menu() ?? {}).flatMap(([title, subtitles]) =>
      subtitles.map((subtitle) => getAnchorId({ title, subtitle, grouped: true }))
    );
  });
  // Whether the left-hand menu has at least one entry to render
  const hasVisibleMenu = createMemo(() => sectionAnchorIds().some((anchorId) => !isUndefined(anchorId)));
  let hasScrolledInitialSection = false;
  let scrollTimeout: ReturnType<typeof setTimeout> | undefined;

  const updateActiveSection = (containerEl: HTMLDivElement) => {
    const cleanHash = parseHashId(location.hash);
    const anchorIds = sectionAnchorIds();
    // Only skip scrolling when the hash names the section that is actually first on the page
    if (cleanHash !== '' && anchorIds.includes(cleanHash) && cleanHash !== anchorIds[0]) {
      // Does nothing when the menu option is already visible
      containerEl.querySelector(`#btn_${CSS.escape(cleanHash)}`)?.scrollIntoView({ block: 'nearest' });
      scrollTimeout = setTimeout(() => {
        goToElement(`card_${cleanHash}`);
      }, 100);
    }
  };

  createEffect(
    on(isVisible, () => {
      if (isVisible()) {
        if (!firstLoad()) {
          setFirstLoad(true);
        }
      }
    })
  );

  // Reveal the active hash entry once the container (and menu) has mounted
  createEffect(
    on(container, (containerEl) => {
      if (!containerEl || !isVisible() || hasScrolledInitialSection) return;
      hasScrolledInitialSection = true;
      updateActiveSection(containerEl);
    })
  );

  onCleanup(() => {
    if (!isUndefined(scrollTimeout)) {
      clearTimeout(scrollTimeout);
    }
  });

  return (
    <Show when={firstLoad()}>
      <div ref={setContainer} class="d-flex flex-row mt-2">
        <Show when={hasVisibleMenu() && menu()}>
          {(menuData) => <Menu menu={menuData()} isVisible={props.initialIsVisible} sticky />}
        </Show>
        <div
          class="d-flex flex-column"
          classList={{
            [styles.content]: hasVisibleMenu(),
            'w-100': !hasVisibleMenu(),
          }}
        >
          <Show when={fullDataReady() && data()}>
            {(cardData) => (
              <Content
                data={cardData()}
                classify={props.classify}
                isVisible={props.initialIsVisible}
                sorted={props.sorted}
                direction={props.direction}
              />
            )}
          </Show>
          <ButtonToTopScroll />
        </div>
      </div>
    </Show>
  );
};

export default CardCategory;

import { useLocation } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on, onMount, Show } from 'solid-js';

import { CardMenu, ClassifyOption, SortDirection, SortOption } from '../../../types';
import { getAnchorId } from '../../../utils/anchorIds';
import getName from '../../../utils/getName';
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
  const [firstItem, setFirstItem] = createSignal<string>();
  const [container, setContainer] = createSignal<HTMLDivElement>();
  const fullDataReady = useFullDataReady();
  const data = () => props.data;
  const isVisible = () => props.initialIsVisible;
  const menu = () => props.menu;

  const isAvailableSelectedSection = (): boolean => {
    const selection = parseHashId(location.hash);
    if (props.classify === ClassifyOption.Maturity) {
      const status = selection.split('--')[1];
      return menu()?.Maturity?.includes(status) ?? false;
    } else if (props.classify === ClassifyOption.TAG) {
      const tagOpt = selection.split('--')[1];
      return menu()?.Tag?.includes(tagOpt) ?? false;
    } else {
      const names = getName(selection);
      const menuData = menu();
      return (
        !isUndefined(menuData) &&
        !isNull(names) &&
        Object.keys(menuData).includes(names.category) &&
        !isUndefined(names.subcategory) &&
        menuData[names.category].includes(names.subcategory)
      );
    }
  };

  const updateActiveSection = () => {
    const firstItemInMenu = firstItem();
    if (firstItemInMenu) {
      if (location.hash !== '' && isAvailableSelectedSection()) {
        const cleanHash = parseHashId(location.hash);
        if (cleanHash !== firstItemInMenu) {
          // Does nothing when the menu option is already visible
          container()
            ?.querySelector(`#btn_${CSS.escape(cleanHash)}`)
            ?.scrollIntoView({ block: 'nearest' });
          setTimeout(() => {
            goToElement(`card_${cleanHash}`);
          }, 100);
        }
      }
    }
  };

  // When data changes, we need to update the first item in the menu
  createEffect(
    on(data, () => {
      const menuData = menu();
      if (!isUndefined(menuData) && !isEmpty(menuData)) {
        const firstAnchorId = Object.entries(menuData)
          .flatMap(([title, subtitles]) => subtitles.map((subtitle) => getAnchorId({ title, subtitle, grouped: true })))
          .find((anchorId) => !isUndefined(anchorId));
        setFirstItem(firstAnchorId);
      } else {
        setFirstItem(undefined);
      }
    })
  );

  createEffect(
    on(isVisible, () => {
      if (isVisible()) {
        if (!firstLoad()) {
          setFirstLoad(true);
        }
      }
    })
  );

  onMount(() => {
    if (isVisible()) {
      updateActiveSection();
    }
  });

  return (
    <Show when={firstLoad()}>
      <div ref={setContainer} class="d-flex flex-row mt-2">
        <Show when={!isEmpty(menu()) && menu()}>
          {(menuData) => <Menu menu={menuData()} isVisible={props.initialIsVisible} sticky />}
        </Show>
        <div
          class={`d-flex flex-column ${styles.content}`}
          classList={{ 'w-100': props.classify === ClassifyOption.None }}
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

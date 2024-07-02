import { useLocation } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on, onMount, Show } from 'solid-js';

import { CardMenu, ClassifyOption, SortDirection, SortOption } from '../../../types';
import getName from '../../../utils/getName';
import getNormalizedName from '../../../utils/getNormalizedName';
import goToElement from '../../../utils/goToElement';
import isElementInView from '../../../utils/isElementInView';
import ButtonToTopScroll from '../../common/ButtonToTopScroll';
import { useFullDataReady } from '../../stores/fullData';
import styles from './CardCategory.module.css';
import Content from './Content';
import Menu from './Menu';

interface Props {
  initialIsVisible: boolean;
  group: string;
  classify: ClassifyOption;
  sorted: SortOption;
  direction: SortDirection;
  data: unknown;
  menu?: CardMenu;
}

const CardCategory = (props: Props) => {
  const location = useLocation();
  const [firstLoad, setFirstLoad] = createSignal<boolean>(false);
  const [firstItem, setFirstItem] = createSignal<string>();
  const fullDataReady = useFullDataReady();
  const data = () => props.data;
  const isVisible = () => props.initialIsVisible;
  const menu = () => props.menu;

  const isAvailableSelectedSection = (): boolean => {
    const selection = location.hash.replace('#', '');
    if (props.classify === ClassifyOption.Maturity) {
      const status = selection.split('--')[1];
      if (!isUndefined(menu()) && !isUndefined(menu()!.Maturity) && menu()!.Maturity.includes(status)) {
        return true;
      } else {
        return false;
      }
    } else if (props.classify === ClassifyOption.Tag) {
      const tagOpt = selection.split('--')[1];
      if (!isUndefined(menu()) && !isUndefined(menu()!.Tag) && menu()!.Tag.includes(tagOpt)) {
        return true;
      } else {
        return false;
      }
    } else {
      const names = getName(selection);
      if (
        !isUndefined(menu()) &&
        !isNull(names) &&
        Object.keys(menu()!).includes(names.category) &&
        !isUndefined(names.subcategory) &&
        menu()![names.category].includes(names.subcategory)
      ) {
        return true;
      } else {
        return false;
      }
    }
  };

  const updateActiveSection = () => {
    const firstItemInMenu = firstItem();
    if (firstItemInMenu) {
      if (location.hash !== '' && isAvailableSelectedSection()) {
        const cleanHash = location.hash.replace('#', '');
        if (cleanHash !== firstItemInMenu) {
          if (!isElementInView(`btn_${cleanHash}`)) {
            const target = window.document.getElementById(`btn_${cleanHash}`);
            if (target) {
              target.scrollIntoView({ block: 'nearest' });
            }
          }
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
      if (!isUndefined(menu()) && !isEmpty(menu())) {
        const firstTitle = Object.keys(menu()!)[0];
        const firstSubtitle = menu()![firstTitle][0];
        if (!isUndefined(firstSubtitle)) {
          const firstItemInMenu = getNormalizedName({
            title: firstTitle.toLowerCase(),
            subtitle: firstSubtitle,
            grouped: true,
          });
          setFirstItem(firstItemInMenu);
        }
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
      <div class="d-flex flex-row mt-2">
        <Show when={!isUndefined(menu()) && !isEmpty(menu())}>
          <Menu menu={menu()!} isVisible={props.initialIsVisible} sticky />
        </Show>
        <div
          class={`d-flex flex-column ${styles.content}`}
          classList={{ 'w-100': props.classify === ClassifyOption.None }}
        >
          <Show when={fullDataReady() && !isUndefined(data())}>
            <Content
              data={data!}
              classify={props.classify}
              isVisible={props.initialIsVisible}
              sorted={props.sorted}
              direction={props.direction}
            />
          </Show>
          <ButtonToTopScroll />
        </div>
      </div>
    </Show>
  );
};

export default CardCategory;

import { useLocation } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on, Show } from 'solid-js';

import { CardMenu, ClassifiedOption, SortDirection, SortOption } from '../../../types';
import getName from '../../../utils/getName';
import getNormalizedName from '../../../utils/getNormalizedName';
import goToElement from '../../../utils/goToElement';
import isElementInView from '../../../utils/isElementInView';
import scrollToTop from '../../../utils/scrollToTop';
import { useFullDataReady } from '../../stores/fullData';
import styles from './CardCategory.module.css';
import Content from './Content';
import Menu from './Menu';

interface Props {
  initialIsVisible: boolean;
  group: string;
  classified: ClassifiedOption;
  sorted: SortOption;
  direction: SortDirection;
  data: unknown;
  menu?: CardMenu;
  updateHash: (hash?: string) => void;
  finishLoading: () => void;
}

const TITLE_OFFSET = 16;

const CardCategory = (props: Props) => {
  const location = useLocation();
  const [firstLoad, setFirstLoad] = createSignal<boolean>(false);
  const [firstItem, setFirstItem] = createSignal<string>();
  const [initialFullRender, setInitialFullRender] = createSignal<boolean>(false);
  const fullDataReady = useFullDataReady();
  const data = () => props.data;
  const isVisible = () => props.initialIsVisible;
  const menu = () => props.menu;

  const updateRoute = (hash: string) => {
    props.updateHash(hash);
  };

  const isAvailableSelectedSection = (): boolean => {
    const selection = location.hash.replace('#', '');
    if (props.classified === ClassifiedOption.Maturity) {
      const status = selection.split('--')[1];
      if (!isUndefined(menu()) && menu()!.Maturity.includes(status)) {
        return true;
      } else {
        return false;
      }
    } else {
      const names = getName(selection);
      console.log(names);
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
      if (initialFullRender()) {
        updateRoute(firstItemInMenu);
      } else {
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
              goToElement(false, `card_${cleanHash}`, TITLE_OFFSET);
              updateRoute(cleanHash);
            }, 100);
          }
        } else {
          updateRoute(firstItemInMenu);
          scrollToTop(false);
        }
        setInitialFullRender(true);
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
      // Clean prev hash
      if (isUndefined(menu()) || (isEmpty(menu()) && isVisible())) {
        updateRoute('');
      }
    })
  );

  createEffect(
    on(isVisible, () => {
      if (isVisible()) {
        if (!firstLoad()) {
          setFirstLoad(true);
          props.finishLoading();
        }

        if (!isUndefined(menu())) {
          updateActiveSection();
        }
      }
    })
  );

  createEffect(
    on(menu, () => {
      if (isVisible()) {
        updateActiveSection();
      }
    })
  );

  createEffect(
    on(isVisible, () => {
      if (isVisible()) {
        if (!firstLoad()) {
          setFirstLoad(true);
          props.finishLoading();
        }
      }
    })
  );

  return (
    <Show when={firstLoad()}>
      <div class="d-flex flex-row mt-2">
        <Show when={!isUndefined(menu()) && !isEmpty(menu())}>
          <Menu menu={menu()!} isVisible={props.initialIsVisible} sticky />
        </Show>
        <div
          class={`d-flex flex-column ${styles.content}`}
          classList={{ 'w-100': props.classified === ClassifiedOption.None }}
        >
          <Show when={fullDataReady() && !isUndefined(data())}>
            <Content
              data={data!}
              classified={props.classified}
              isVisible={props.initialIsVisible}
              sorted={props.sorted}
              direction={props.direction}
            />
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default CardCategory;

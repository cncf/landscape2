import { useLocation } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on, Show } from 'solid-js';

import { CardMenu } from '../../../types';
import getName from '../../../utils/getName';
import getNormalizedName from '../../../utils/getNormalizedName';
import goToElement from '../../../utils/goToElement';
import isElementInView from '../../../utils/isElementInView';
import { CategoriesData } from '../../../utils/prepareData';
import prepareMenu from '../../../utils/prepareMenu';
import scrollToTop from '../../../utils/scrollToTop';
import { useFullDataReady } from '../../stores/fullData';
import styles from './CardCategory.module.css';
import Content from './Content';
import Menu from './Menu';

interface Props {
  initialIsVisible: boolean;
  data: CategoriesData;
  categories_overridden?: string[];
  updateHash: (hash?: string) => void;
  finishLoading: () => void;
}

const TITLE_OFFSET = 16;

const CardCategory = (props: Props) => {
  const location = useLocation();
  const [firstLoad, setFirstLoad] = createSignal<boolean>(false);
  const [menu, setMenu] = createSignal<CardMenu>({});
  const [firstItem, setFirstItem] = createSignal<string>();
  const [initialFullRender, setInitialFullRender] = createSignal<boolean>(false);
  const fullDataReady = useFullDataReady();
  const data = () => props.data;
  const isVisible = () => props.initialIsVisible;

  const updateRoute = (hash: string) => {
    props.updateHash(hash);
  };

  const isAvailableSelectedSection = (): boolean => {
    const selection = location.hash.replace('#', '');
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

  const onMenuChange = (menuTmp: CardMenu) => {
    if (!isEmpty(menuTmp)) {
      const firstCategory = Object.keys(menuTmp)[0];
      const firstSubcategory = menuTmp[firstCategory][0];
      if (!isUndefined(firstSubcategory)) {
        const firstItemInMenu = getNormalizedName({ cat: firstCategory, subcat: firstSubcategory, grouped: true });
        setFirstItem(firstItemInMenu);
      }
    }
    // Clean prev hash
    if (isEmpty(menuTmp) && isVisible()) {
      updateRoute('');
    }
  };

  createEffect(
    on(isVisible, () => {
      if (isVisible()) {
        if (!firstLoad()) {
          setFirstLoad(true);
          props.finishLoading();
        }

        if (isUndefined(menu())) {
          const menuTmp = prepareMenu(data(), props.categories_overridden);
          onMenuChange(menuTmp);
          setMenu(menuTmp);
        } else {
          updateActiveSection();
        }
      }
    })
  );

  createEffect(
    on(data, () => {
      if (!isUndefined(menu())) {
        const menuTmp = prepareMenu(data(), props.categories_overridden);
        onMenuChange(menuTmp);
        setMenu((prev) => (!isEqual(prev, menuTmp) ? menuTmp : prev));
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

  return (
    <Show when={firstLoad()}>
      <div class="d-flex flex-row mt-2">
        <Show when={!isEmpty(menu())}>
          <Menu menu={menu} isVisible={props.initialIsVisible} sticky />
          <div class={`d-flex flex-column ${styles.content}`}>
            <Show when={fullDataReady()}>
              <Content menu={menu} data={props.data} isVisible={props.initialIsVisible} />
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default CardCategory;

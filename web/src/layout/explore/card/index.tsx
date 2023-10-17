import { useLocation } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on, Show } from 'solid-js';

import { REGEX_PLUS } from '../../../data';
import { CardMenu } from '../../../types';
import convertStringSpaces from '../../../utils/convertStringSpaces';
import goToElement from '../../../utils/goToElement';
import isElementInView from '../../../utils/isElementInView';
import { CategoriesData } from '../../../utils/prepareData';
import prepareMenu from '../../../utils/prepareMenu';
import ButtonToTopScroll from '../../common/ButtonToTopScroll';
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
    const [cat, subcat] = selection.split('/');
    const category = cat.replace(REGEX_PLUS, ' ');
    const subcategory = subcat.replace(REGEX_PLUS, ' ');
    if (!isUndefined(menu()) && Object.keys(menu()!).includes(category) && menu()![category].includes(subcategory)) {
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
              goToElement(`card_${cleanHash}`, TITLE_OFFSET);
            }, 100);
          }
        } else {
          updateRoute(firstItemInMenu);
          window.scrollBy({ top: 0, behavior: 'instant' });
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
        const firstItemInMenu = `${convertStringSpaces(firstCategory)}/${convertStringSpaces(firstSubcategory)}`;
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
            <Show when={!isUndefined(firstItem()) && fullDataReady()}>
              <ButtonToTopScroll firstSection={firstItem()!} />
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default CardCategory;

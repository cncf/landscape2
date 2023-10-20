import { useLocation, useNavigate, useSearchParams } from '@solidjs/router';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on, Show } from 'solid-js';

import { REGEX_PLUS, VIEW_MODE_PARAM } from '../../../data';
import { CardMenu, ViewMode } from '../../../types';
import convertStringSpaces from '../../../utils/convertStringSpaces';
import goToElement from '../../../utils/goToElement';
import { SubcategoryDetails } from '../../../utils/gridCategoryLayout';
import isElementInView from '../../../utils/isElementInView';
import { CategoriesData } from '../../../utils/prepareData';
import ButtonToTopScroll from '../../common/ButtonToTopScroll';
import { useFullDataReady } from '../../stores/fullData';
import styles from './CardCategory.module.css';
import Content from './Content';
import Menu from './Menu';

interface Props {
  initialIsVisible: boolean;
  data: CategoriesData;
  categories_overridden?: string[];
  finishLoading: () => void;
}

const TITLE_OFFSET = 16;

const CardCategory = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [firstLoad, setFirstLoad] = createSignal<boolean>(false);
  const [menu, setMenu] = createSignal<CardMenu>({});
  const [firstItem, setFirstItem] = createSignal<string>();
  const [initialFullRender, setInitialFullRender] = createSignal<boolean>(false);
  const fullDataReady = useFullDataReady();
  const data = () => props.data;
  const isVisible = () => props.initialIsVisible;

  const updateRoute = (hash: string) => {
    // searchParams is not working properly and we are getting 'grid'
    const updatedSearchParams = new URLSearchParams(searchParams);
    updatedSearchParams.set(VIEW_MODE_PARAM, ViewMode.Card);
    navigate(`${location.pathname}?${updatedSearchParams.toString()}#${hash}`, {
      replace: true,
      scroll: false,
    });
  };

  const prepareMenu = (d: CategoriesData): CardMenu => {
    const menuTmp: CardMenu = {};

    Object.keys(d).forEach((cat: string) => {
      const isOverriden = !isUndefined(props.categories_overridden) && props.categories_overridden.includes(cat);

      const subcategories: SubcategoryDetails[] = [];
      const subcategoriesList: string[] = [];
      Object.keys(d[cat]).forEach((subcat: string) => {
        if (props.data[cat][subcat].items.length > 0) {
          subcategoriesList.push(subcat);
          subcategories.push({
            name: subcat,
            itemsCount: props.data[cat][subcat].itemsCount,
            itemsFeaturedCount: props.data[cat][subcat].itemsFeaturedCount,
          });
        }
      });

      if (subcategories.length !== 0) {
        const sortedSubcategories: string[] = isOverriden ? subcategoriesList : subcategoriesList.sort();
        menuTmp[cat] = sortedSubcategories;
      }
    });

    if (!isEmpty(menuTmp)) {
      const firstCategory = Object.keys(menuTmp)[0];
      const firstSubcategory = menuTmp[firstCategory][0];
      if (!isUndefined(firstSubcategory)) {
        const firstItemInMenu = `${convertStringSpaces(firstCategory)}/${convertStringSpaces(firstSubcategory)}`;
        setFirstItem(firstItemInMenu);
      }
    }

    // Clean prev hash
    if (Object.keys(menuTmp).length === 0 && isVisible()) {
      updateRoute('');
    }

    return menuTmp;
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
              goToElement(cleanHash, TITLE_OFFSET);
            }, 100);
          }
        } else {
          updateRoute(firstItemInMenu);
          document.getElementById('landscape')!.scrollBy({ top: 0, behavior: 'instant' });
        }
        setInitialFullRender(true);
      }
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
          const menuTmp = prepareMenu(data());
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
        const menuTmp = prepareMenu(data());
        if (!isEqual(menu(), menuTmp)) {
          setMenu(menuTmp);
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

  return (
    <Show when={firstLoad()}>
      <div class="d-flex flex-row mt-2">
        <Show when={!isEmpty(menu())}>
          <Menu menu={menu} isVisible={props.initialIsVisible} />
          <div class={`d-flex flex-column ${styles.content}`}>
            <Show when={fullDataReady()}>
              <Content menu={menu} data={props.data} isVisible={props.initialIsVisible} />
            </Show>
            <Show when={!isUndefined(firstItem())}>
              <ButtonToTopScroll firstSection={firstItem()!} />
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default CardCategory;

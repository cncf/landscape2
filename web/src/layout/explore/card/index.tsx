import isEqual from 'lodash/isEqual';
import isUndefined from 'lodash/isUndefined';
import { memo, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CardMenu } from '../../../types';
import arePropsEqual from '../../../utils/areEqualProps';
import convertStringSpaces from '../../../utils/convertStringSpaces';
import goToElement from '../../../utils/goToElement';
import { SubcategoryDetails } from '../../../utils/gridCategoryLayout';
import isElementInView from '../../../utils/isElementInView';
import { CategoriesData } from '../../../utils/prepareData';
import ButtonToTopScroll from '../../common/ButtonToTopScroll';
import { FullDataContext, FullDataProps } from '../../context/AppContext';
import styles from './CardCategory.module.css';
import Content from './Content';
import Menu from './Menu';

interface Props {
  isVisible: boolean;
  data: CategoriesData;
  categories_overridden?: string[];
  finishLoading: () => void;
}

const TITLE_OFFSET = 16;

const CardCategory = memo(function CardCategory(props: Props) {
  const { fullDataReady } = useContext(FullDataContext) as FullDataProps;
  const navigate = useNavigate();
  const [firstLoad, setFirstLoad] = useState<boolean>(props.isVisible);
  const [menu, setMenu] = useState<CardMenu | undefined>();
  const [initialFullRender, setInitialFullRender] = useState<boolean>(false);

  const getFirstItem = (): string | null => {
    if (menu && Object.keys(menu).length > 0) {
      const firstCategory = Object.keys(menu)[0];
      const firstSubcategory = menu[firstCategory][0];
      return `${convertStringSpaces(firstCategory)}/${convertStringSpaces(firstSubcategory)}`;
    }
    return null;
  };

  const updateRoute = (hash: string) => {
    navigate(
      { ...location, hash: hash },
      {
        replace: true,
      }
    );
  };

  useEffect(() => {
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

      // Clean prev hash
      if (Object.keys(menuTmp).length === 0) {
        updateRoute('');
      }

      return menuTmp;
    };

    const newMenu = prepareMenu(props.data);

    if (!isEqual(menu, newMenu)) {
      setMenu(newMenu);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.data]);

  useLayoutEffect(() => {
    const isAvailableSelectedSection = (): boolean => {
      const selection = location.hash.replace('#', '');
      const [cat, subcat] = selection.split('/');
      const category = cat.replace(/\+/g, ' ');
      const subcategory = subcat.replace(/\+/g, ' ');
      if (menu && Object.keys(menu).includes(category) && menu[category].includes(subcategory)) {
        return true;
      } else {
        return false;
      }
    };

    if (props.isVisible && menu && fullDataReady) {
      const firstItem = getFirstItem();
      if (firstItem) {
        if (initialFullRender) {
          updateRoute(firstItem);
        } else {
          if (location.hash !== '' && isAvailableSelectedSection()) {
            const cleanHash = location.hash.replace('#', '');
            if (cleanHash !== firstItem) {
              if (!isElementInView(`btn_${cleanHash}`)) {
                const target = window.document.getElementById(`btn_${cleanHash}`);
                if (target) {
                  target.scrollIntoView({ block: 'nearest' });
                }
              }
              goToElement(cleanHash, TITLE_OFFSET);
            }
          } else {
            updateRoute(firstItem);
            window.scrollBy({ top: 0, behavior: 'instant' });
          }
          setInitialFullRender(true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, props.isVisible, fullDataReady]);

  useEffect(() => {
    if (props.isVisible) {
      props.finishLoading();
      if (!firstLoad) {
        setFirstLoad(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isVisible]);

  if (isUndefined(menu)) return null;

  return (
    <>
      {firstLoad && (
        <div className="d-flex flex-row mt-2">
          <Menu menu={menu} isVisible={props.isVisible} />
          <div className={`d-flex flex-column ${styles.content}`}>
            {fullDataReady && <Content menu={menu} data={props.data} isVisible={props.isVisible} />}
            <ButtonToTopScroll firstSection={getFirstItem()} />
          </div>
        </div>
      )}
    </>
  );
}, arePropsEqual);

export default CardCategory;

import classNames from 'classnames';
import { isUndefined, orderBy } from 'lodash';
import { memo, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import { COLORS } from '../../../data';
import { BaseItem, Item, OutletContext, SVGIconKind } from '../../../types';
import arePropsEqual from '../../../utils/areEqualProps';
import { SubcategoryDetails } from '../../../utils/gridCategoryLayout';
import { CategoriesData } from '../../../utils/prepareData';
import { Loading } from '../../common/Loading';
import SVGIcon from '../../common/SVGIcon';
import Card from './Card';
import styles from './CardCategory.module.css';

interface Props {
  fullDataReady: boolean;
  data: CategoriesData;
  categories_overridden?: string[];
  visible: boolean;
}

interface SelectedSection {
  category: string;
  subcategory: string;
}

interface Menu {
  [key: string]: string[];
}

const CardCategory = memo(function CardCategory(props: Props) {
  const { updateActiveItemId } = useOutletContext() as OutletContext;
  const [menu, setMenu] = useState<Menu | undefined>();
  const [selectedSection, setSelectedSection] = useState<SelectedSection | undefined>();
  const [visibleItems, setVisibleItems] = useState<BaseItem[] | undefined>();
  const bgColor = COLORS[0];

  const sortItems = (firstCategory: string, firstSubcategory: string): BaseItem[] => {
    return orderBy(
      props.data[firstCategory][firstSubcategory].items,
      [(item: BaseItem) => item.name.toString()],
      'asc'
    );
  };

  useEffect(() => {
    const prepareMenu = (d: CategoriesData): Menu => {
      const menu: Menu = {};

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
          menu[cat] = sortedSubcategories;
        }
      });

      return menu;
    };

    setMenu(prepareMenu(props.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.data]);

  useEffect(() => {
    if (!isUndefined(menu) && Object.keys(menu).length > 0) {
      let selectedCategory = Object.keys(menu)[0];
      let selectedSubcategory = menu[selectedCategory][0];

      // Use selected section when subcategory has items
      if (
        !isUndefined(selectedSection) &&
        menu[selectedSection.category] &&
        menu[selectedSection.category].includes(selectedSection.subcategory)
      ) {
        selectedCategory = selectedSection.category;
        selectedSubcategory = selectedSection.subcategory;
      }

      setSelectedSection({ category: selectedCategory, subcategory: selectedSubcategory });
      setVisibleItems(sortItems(selectedCategory, selectedSubcategory));
    } else {
      setVisibleItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);

  useEffect(() => {
    if (selectedSection) {
      setVisibleItems(sortItems(selectedSection.category, selectedSection.subcategory));
      // Scroll to top
      setTimeout(() => {
        if (props.visible && !isUndefined(menu)) {
          window.scrollTo(0, 0);
        }
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSection]);

  if (isUndefined(selectedSection) || isUndefined(menu)) return null;

  return (
    <div className="d-flex flex-row mt-2">
      <div className={`d-flex flex-column me-4 ${styles.toc}`}>
        {Object.keys(menu).map((cat: string, index: number) => {
          return (
            <div key={`cat_${cat}`}>
              <div
                className={classNames('text-white border border-3 border-bottom-0 border-white fw-semibold p-2', {
                  'border-top-0': index === 0,
                })}
                style={{ backgroundColor: bgColor }}
              >
                {cat}
              </div>

              <div
                className={classNames(
                  'd-flex flex-column text-start border border-3 py-3 border-white',
                  styles.subcategories,
                  {
                    'border-bottom-0': index !== Object.keys(menu).length - 1,
                  }
                )}
              >
                {menu[cat].map((subcat: string) => {
                  const isSelected =
                    !isUndefined(selectedSection) &&
                    cat === selectedSection.category &&
                    subcat === selectedSection.subcategory;

                  return (
                    <button
                      key={`subcat_${subcat}`}
                      title={subcat}
                      className={classNames(
                        'position-relative btn btn-sm btn-link rounded-0 p-0 ps-3 pe-2 py-1 text-start text-truncate',
                        styles.subcategoryBtn,
                        { [`fw-bold ${styles.selected}`]: isSelected }
                      )}
                      disabled={isSelected}
                      onClick={() => setSelectedSection({ category: cat, subcategory: subcat })}
                    >
                      {isSelected && (
                        <div className={`position-absolute ${styles.arrow}`}>
                          <SVGIcon kind={SVGIconKind.ArrowRight} />
                        </div>
                      )}
                      {subcat}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="d-flex flex-column flex-grow-1">
        {props.fullDataReady ? (
          <>
            {visibleItems && (
              <div className="row g-4 w-100">
                {visibleItems.map((item: Item) => {
                  return (
                    <div
                      key={`card_${item.id}`}
                      className={`col-12 col-lg-6 col-xxl-4 col-xxxl-3 ${styles.cardWrapper}`}
                    >
                      <div className={`card rounded-0 p-3 ${styles.card}`} onClick={() => updateActiveItemId(item.id)}>
                        <Card item={item} className="h-100" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <Loading />
        )}
      </div>
    </div>
  );
}, arePropsEqual);

export default CardCategory;

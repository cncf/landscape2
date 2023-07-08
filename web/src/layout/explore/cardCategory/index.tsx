import { BaseItem } from '../../../types';
import styles from './CardCategory.module.css';
import { CategoriesData } from '../../../utils/prepareBaseData';
import { SubcategoryDetails } from '../../../utils/gridCategoryLayout';
import { Fragment, useEffect, useState } from 'react';
import { COLORS } from '../../../data';
import classNames from 'classnames';
import CardWrapper from './CardWrapper';

interface Props {
  data: CategoriesData;
  onClickItem: (item: BaseItem) => void;
}

interface SelectedSection {
  category: string;
  subcategory: string;
}

const CardCategory = (props: Props) => {
  const [selectedSection, setSelectedSection] = useState<SelectedSection | undefined>();
  const [visibleItems, setVisibleItems] = useState<BaseItem[] | undefined>();
  const bgColor = COLORS[0];

  const sortItems = (firstCategory: string, firstSubcategory: string): BaseItem[] => {
    return props.data[firstCategory][firstSubcategory].items.sort((a: BaseItem, b: BaseItem) =>
      a.name.localeCompare(b.name)
    );
  };

  useEffect(() => {
    const firstCategory = Object.keys(props.data)[0];
    const firstSubcategory = Object.keys(props.data[firstCategory])[0];
    setSelectedSection({ category: firstCategory, subcategory: firstSubcategory });
    setVisibleItems(sortItems(firstCategory, firstSubcategory));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.data]);

  useEffect(() => {
    if (selectedSection) {
      setVisibleItems(sortItems(selectedSection.category, selectedSection.subcategory));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSection]);

  if (selectedSection === undefined) return null;

  return (
    <div className="d-flex flex-row mt-2">
      <div className={`d-flex flex-column me-4 ${styles.toc}`}>
        {Object.keys(props.data).map((cat: string, index: number) => {
          const subcategories: SubcategoryDetails[] = [];
          Object.keys(props.data[cat]).forEach((subcat: string) => {
            if (props.data[cat][subcat].itemsCount !== 0) {
              subcategories.push({
                name: subcat,
                itemsCount: props.data[cat][subcat].itemsCount,
                itemsFeaturedCount: props.data[cat][subcat].itemsFeaturedCount,
              });
            }
          });

          if (subcategories.length === 0) return null;

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
                  'd-flex flex-column text-start border border-3 py-3 px-2 border-white',
                  styles.subcategories,
                  {
                    'border-bottom-0': index !== Object.keys(props.data).length - 1,
                  }
                )}
              >
                {Object.keys(props.data[cat]).map((subcat: string) => {
                  const isSelected =
                    selectedSection !== undefined &&
                    cat === selectedSection.category &&
                    subcat === selectedSection.subcategory;

                  return (
                    <button
                      key={`subcat_${subcat}`}
                      className={classNames(
                        'position-relative btn btn-sm btn-link p-0 ps-2 mb-1 text-start text-truncate',
                        styles.subcategoryBtn,
                        { [`fw-bold ${styles.selected}`]: isSelected }
                      )}
                      disabled={isSelected}
                      onClick={() => setSelectedSection({ category: cat, subcategory: subcat })}
                    >
                      {isSelected && (
                        <div className={`position-absolute ${styles.arrow}`}>
                          <svg
                            stroke="currentColor"
                            fill="currentColor"
                            strokeWidth="0"
                            viewBox="0 0 24 24"
                            height="1em"
                            width="1em"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M10.707 17.707 16.414 12l-5.707-5.707-1.414 1.414L13.586 12l-4.293 4.293z"></path>
                          </svg>
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
      <div className="d-flex flex-column">
        {visibleItems && (
          <div className="row g-4">
            {visibleItems.map((item: BaseItem) => {
              return (
                <Fragment key={`card_${item.id}`}>
                  <CardWrapper id={item.id} onClick={props.onClickItem} />
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardCategory;

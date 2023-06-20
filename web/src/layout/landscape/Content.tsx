import classNames from 'classnames';
import styles from './Content.module.css';
import { Category, DetailedItem, FeatureItem, FeatureItemOption, Item, ViewMode } from '../../types';
import Card from './Card';
import GridItem from './GridItem';
import { Fragment } from 'react';
import generateColorsArray from '../../utils/generateColorsArray';
import { Link } from 'react-router-dom';

interface Props {
  selectedViewMode: ViewMode;
  categoriesList: string[];
  categories: Category[];
  items: Item[];
  featured_items: FeatureItem[];
  categories_overridden?: string[];
  onClickItem: (item: Item) => void;
}

const Content = (props: Props) => {
  const featureItem = (item: Item): DetailedItem => {
    const detailedItem: DetailedItem = { ...item, isFeatured: false };
    props.featured_items.forEach((fItem: FeatureItem) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (detailedItem as any)[fItem.field];
      if (value) {
        fItem.options.map((opt: FeatureItemOption) => {
          if (value === opt.value) {
            detailedItem.isFeatured = true;
            if (opt.order) {
              detailedItem.order = opt.order;
            }
            if (opt.label) {
              detailedItem.label = opt.label;
            }
          }
        });
      }
    });

    return detailedItem;
  };

  const sortItems = (items: Item[]): DetailedItem[] => {
    const formattedItems = items.map((item: Item) => {
      return featureItem(item);
    });

    return formattedItems.sort((a: DetailedItem, b: DetailedItem) => {
      return (a.order || 1000) - (b.order || 1000); // Items with undefined order are last
    });
  };

  const colorsList = generateColorsArray(props.categoriesList.length);

  return (
    <>
      {props.categoriesList.map((cat: string, index: number) => {
        const category = props.categories.find((c: Category) => c.name === cat);
        const isOverriden = props.categories_overridden !== undefined && props.categories_overridden.includes(cat);

        if (category === undefined) return null;

        return (
          <div key={`cat_${cat}`} className="d-flex flex-row">
            <div
              className={classNames(
                'text-dark border border-3 border-white fw-semibold p-2 border-end-0 py-5',
                styles.catTitle,
                { 'border-bottom-0': index !== 0 }
              )}
              style={{ backgroundColor: colorsList[index] }}
            >
              <div className="d-flex flex-row align-items-start justify-content-end">
                <div>{cat}</div>

                <div>
                  <Link to="/guide" className={`btn btn-link text-black mt-2 p-1 ${styles.btnInCatTitle}`}>
                    <svg
                      className={`position-relative ${styles.icon}`}
                      stroke="currentColor"
                      fill="currentColor"
                      strokeWidth="0"
                      viewBox="0 0 24 24"
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M21 4H7C5.89543 4 5 4.89543 5 6C5 7.10457 5.89543 8 7 8H21V21C21 21.5523 20.5523 22 20 22H7C4.79086 22 3 20.2091 3 18V6C3 3.79086 4.79086 2 7 2H20C20.5523 2 21 2.44772 21 3V4ZM5 18C5 19.1046 5.89543 20 7 20H19V10H7C6.27143 10 5.58835 9.80521 5 9.46487V18ZM20 7H7C6.44772 7 6 6.55228 6 6C6 5.44772 6.44772 5 7 5H20V7Z"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            <div className="row g-0 w-100">
              {category.subcategories.map((subcat: string, subcatIndex: number) => {
                const sortedItems: DetailedItem[] = sortItems(
                  props.items.filter((item: Item) => item.category === cat && item.subcategory === subcat)
                );

                return (
                  <Fragment key={`subcat_${subcat}`}>
                    {(() => {
                      switch (props.selectedViewMode) {
                        case ViewMode.Grid:
                          return (
                            <div
                              className={classNames(
                                'col-12 col-xl d-flex flex-column border border-3 border-white border-start-0',
                                { 'border-top-0': index !== 0 },
                                { 'border-bottom-0': (subcatIndex === 0 || isOverriden) && index === 0 },
                                { 'col-xl-12': subcatIndex === 0 || isOverriden }
                              )}
                            >
                              <div
                                className={`d-flex align-items-center text-dark justify-content-center text-center px-2 w-100 fw-semibold ${styles.subcatTitle}`}
                                style={{ backgroundColor: colorsList[index] }}
                              >
                                <div className={styles.ellipsis}>{subcat}</div>
                                <div>
                                  <Link to="/guide" className="btn btn-link text-black ms-2 p-1">
                                    <svg
                                      className={`position-relative ${styles.icon}`}
                                      stroke="currentColor"
                                      fill="currentColor"
                                      strokeWidth="0"
                                      viewBox="0 0 24 24"
                                      height="1em"
                                      width="1em"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path d="M21 4H7C5.89543 4 5 4.89543 5 6C5 7.10457 5.89543 8 7 8H21V21C21 21.5523 20.5523 22 20 22H7C4.79086 22 3 20.2091 3 18V6C3 3.79086 4.79086 2 7 2H20C20.5523 2 21 2.44772 21 3V4ZM5 18C5 19.1046 5.89543 20 7 20H19V10H7C6.27143 10 5.58835 9.80521 5 9.46487V18ZM20 7H7C6.44772 7 6 6.55228 6 6C6 5.44772 6.44772 5 7 5H20V7Z"></path>
                                    </svg>
                                  </Link>
                                </div>
                              </div>
                              <div className={`flex-grow-1 ${styles.itemsContainer}`}>
                                <div className={styles.items}>
                                  {sortedItems.map((item: DetailedItem) => {
                                    return (
                                      <GridItem item={item} key={`item_${item.name}`} onClick={props.onClickItem} />
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        case ViewMode.Card:
                          return (
                            <div
                              className={classNames(
                                'col-12 d-flex flex-column border border-3 border-white border-start-0',
                                { 'border-top-0': index !== 0 },
                                { 'border-bottom-0': subcatIndex === 0 && index === 0 }
                              )}
                            >
                              <div
                                className={`d-flex align-items-center text-dark justify-content-center text-center fw-semibold px-2 w-100 ${styles.subcatTitle}`}
                                style={{ backgroundColor: colorsList[index] }}
                              >
                                <div className={styles.ellipsis}>{subcat}</div>
                                <div>
                                  <Link to="/guide" className="btn btn-link text-black ms-2 p-1">
                                    <svg
                                      className={`position-relative ${styles.icon}`}
                                      stroke="currentColor"
                                      fill="currentColor"
                                      strokeWidth="0"
                                      viewBox="0 0 24 24"
                                      height="1em"
                                      width="1em"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path d="M21 4H7C5.89543 4 5 4.89543 5 6C5 7.10457 5.89543 8 7 8H21V21C21 21.5523 20.5523 22 20 22H7C4.79086 22 3 20.2091 3 18V6C3 3.79086 4.79086 2 7 2H20C20.5523 2 21 2.44772 21 3V4ZM5 18C5 19.1046 5.89543 20 7 20H19V10H7C6.27143 10 5.58835 9.80521 5 9.46487V18ZM20 7H7C6.44772 7 6 6.55228 6 6C6 5.44772 6.44772 5 7 5H20V7Z"></path>
                                    </svg>
                                  </Link>
                                </div>
                              </div>
                              <div className={`flex-grow-1 d-flex flex-wrap ${styles.itemsContainer}`}>
                                {sortedItems.map((item: DetailedItem) => {
                                  return <Card item={item} key={`item_${item.name}`} onClick={props.onClickItem} />;
                                })}
                              </div>
                            </div>
                          );
                      }
                    })()}
                  </Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default Content;

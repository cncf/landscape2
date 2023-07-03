import classNames from 'classnames';
import styles from './Content.module.css';
import { BaseItem, ViewMode } from '../../types';
import OldCard from './OldCard';
import GridItem from './GridItem';
import { Fragment, useEffect, useRef, useState } from 'react';
import generateColorsArray from '../../utils/generateColorsArray';
import { Link } from 'react-router-dom';
import { CategoriesData } from '../../utils/prepareBaseData';
import getGridLayout, { GetGridLayoutOutput } from '../../utils/gridLayout';

interface Props {
  data: CategoriesData;
  selectedViewMode: ViewMode;
  cardWidth: number;
  categories_overridden?: string[];
  onClickItem: (item: BaseItem) => void;
}

const Content = (props: Props) => {
  const container = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const sortItems = (items: BaseItem[]): BaseItem[] => {
    return items.sort((a: BaseItem, b: BaseItem) => {
      return (
        (a.featured && a.featured.order ? a.featured.order : 1000) -
        (b.featured && b.featured.order ? b.featured.order : 1000)
      ); // Items with undefined order are last
    });
  };

  const colorsList = generateColorsArray(Object.keys(props.data).length);

  useEffect(() => {
    if (container && container.current) {
      setContainerWidth(container.current.offsetWidth);
    }
  }, []);

  return (
    <>
      {Object.keys(props.data).map((cat: string, index: number) => {
        const isOverriden = props.categories_overridden !== undefined && props.categories_overridden.includes(cat);
        const subcateories: { name: string; itemsCount: number; itemsFeaturedCount: number }[] = [];
        Object.keys(props.data[cat]).forEach((subcat: string) => {
          if (props.data[cat][subcat].itemsCount !== 0) {
            subcateories.push({
              name: subcat,
              itemsCount: props.data[cat][subcat].itemsCount,
              itemsFeaturedCount: props.data[cat][subcat].itemsFeaturedCount,
            });
          }
        });

        if (subcateories.length === 0) return null;

        const grid: GetGridLayoutOutput = getGridLayout({
          containerWidth: containerWidth,
          itemWidth: props.cardWidth,
          categoryName: cat,
          isOverriden: isOverriden,
          subcategories: subcateories,
        });

        return (
          <div key={`cat_${cat}`} className="d-flex flex-row">
            <div
              className={classNames(
                'text-white border border-3 border-white fw-semibold p-2 border-end-0 py-5',
                styles.catTitle,
                { 'border-bottom-0': index !== 0 }
              )}
              style={{ backgroundColor: colorsList[index] }}
            >
              <div className="d-flex flex-row align-items-start justify-content-end">
                <div>{cat}</div>

                <div>
                  <Link
                    to="/guide"
                    className={`btn btn-link text-white opacity-75 px-0 p-0 mt-2 ${styles.btnIcon} ${styles.btnInCatTitle}`}
                  >
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      strokeWidth="0"
                      viewBox="0 0 16 16"
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M14.5 2H9l-.35.15-.65.64-.65-.64L7 2H1.5l-.5.5v10l.5.5h5.29l.86.85h.7l.86-.85h5.29l.5-.5v-10l-.5-.5zm-7 10.32l-.18-.17L7 12H2V3h4.79l.74.74-.03 8.58zM14 12H9l-.35.15-.14.13V3.7l.7-.7H14v9zM6 5H3v1h3V5zm0 4H3v1h3V9zM3 7h3v1H3V7zm10-2h-3v1h3V5zm-3 2h3v1h-3V7zm0 2h3v1h-3V9z"
                      ></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            <div ref={container} className="w-100">
              {containerWidth !== 0 && (
                <>
                  {grid.layout.map(
                    (
                      row: {
                        subcategoryName: string;
                        percentage: number;
                      }[],
                      rownIndex: number
                    ) => {
                      return (
                        <div className="row g-0 w-100" key={`cat_${index}row_${rownIndex}`}>
                          {row.map(
                            (
                              subcat: {
                                subcategoryName: string;
                                percentage: number;
                              },
                              subcatIndex: number
                            ) => {
                              const sortedItems: BaseItem[] = sortItems(props.data[cat][subcat.subcategoryName].items);
                              return (
                                <Fragment key={`subcat_${subcat.subcategoryName}`}>
                                  {(() => {
                                    switch (props.selectedViewMode) {
                                      case ViewMode.Grid:
                                        return (
                                          <div
                                            className={classNames(
                                              'col d-flex flex-column border border-3 border-white border-start-0',
                                              { 'border-top-0': index !== 0 },
                                              { 'border-bottom-0 col-12': subcat.percentage === 100 }
                                            )}
                                            style={{ maxWidth: `${subcat.percentage}%` }}
                                          >
                                            <div
                                              className={`d-flex align-items-center text-white justify-content-center text-center px-2 w-100 fw-semibold ${styles.subcatTitle}`}
                                              style={{ backgroundColor: colorsList[index] }}
                                            >
                                              <div className="text-truncate">{subcat.subcategoryName}</div>
                                              <div>
                                                <Link
                                                  to="/guide"
                                                  className={`btn btn-link text-white opacity-75 px-2 ${styles.btnIcon}`}
                                                >
                                                  <svg
                                                    stroke="currentColor"
                                                    fill="currentColor"
                                                    strokeWidth="0"
                                                    viewBox="0 0 16 16"
                                                    height="1em"
                                                    width="1em"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                  >
                                                    <path
                                                      fillRule="evenodd"
                                                      clipRule="evenodd"
                                                      d="M14.5 2H9l-.35.15-.65.64-.65-.64L7 2H1.5l-.5.5v10l.5.5h5.29l.86.85h.7l.86-.85h5.29l.5-.5v-10l-.5-.5zm-7 10.32l-.18-.17L7 12H2V3h4.79l.74.74-.03 8.58zM14 12H9l-.35.15-.14.13V3.7l.7-.7H14v9zM6 5H3v1h3V5zm0 4H3v1h3V9zM3 7h3v1H3V7zm10-2h-3v1h3V5zm-3 2h3v1h-3V7zm0 2h3v1h-3V9z"
                                                    ></path>
                                                  </svg>
                                                </Link>
                                              </div>
                                            </div>
                                            <div className={`flex-grow-1 ${styles.itemsContainer}`}>
                                              <div className={styles.items}>
                                                {sortedItems.map((item: BaseItem) => {
                                                  return (
                                                    <GridItem
                                                      item={item}
                                                      key={`item_${item.name}`}
                                                      borderColor={colorsList[index]}
                                                      onClick={props.onClickItem}
                                                    />
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
                                              className={`d-flex align-items-center text-white justify-content-center text-center fw-semibold px-2 w-100 ${styles.subcatTitle}`}
                                              style={{ backgroundColor: colorsList[index] }}
                                            >
                                              <div className={styles.ellipsis}>{subcat.subcategoryName}</div>
                                              <div>
                                                <Link
                                                  to="/guide"
                                                  className={`btn btn-link text-white opacity-75 px-2 ${styles.btnIcon}`}
                                                >
                                                  <svg
                                                    stroke="currentColor"
                                                    fill="currentColor"
                                                    strokeWidth="0"
                                                    viewBox="0 0 16 16"
                                                    height="1em"
                                                    width="1em"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                  >
                                                    <path
                                                      fillRule="evenodd"
                                                      clipRule="evenodd"
                                                      d="M14.5 2H9l-.35.15-.65.64-.65-.64L7 2H1.5l-.5.5v10l.5.5h5.29l.86.85h.7l.86-.85h5.29l.5-.5v-10l-.5-.5zm-7 10.32l-.18-.17L7 12H2V3h4.79l.74.74-.03 8.58zM14 12H9l-.35.15-.14.13V3.7l.7-.7H14v9zM6 5H3v1h3V5zm0 4H3v1h3V9zM3 7h3v1H3V7zm10-2h-3v1h3V5zm-3 2h3v1h-3V7zm0 2h3v1h-3V9z"
                                                    ></path>
                                                  </svg>
                                                </Link>
                                              </div>
                                            </div>
                                            <div className={`flex-grow-1 d-flex flex-wrap ${styles.itemsContainer}`}>
                                              {sortedItems.map((item: BaseItem) => {
                                                return (
                                                  <OldCard
                                                    item={item}
                                                    key={`item_${item.name}`}
                                                    onClick={props.onClickItem}
                                                  />
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                    }
                                  })()}
                                </Fragment>
                              );
                            }
                          )}
                        </div>
                      );
                    }
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default Content;

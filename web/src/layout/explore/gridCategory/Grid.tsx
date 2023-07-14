import classNames from 'classnames';
import { BaseItem, Item } from '../../../types';
import getGridCategoryLayout, {
  GridCategoryLayout,
  LayoutColumn,
  LayoutRow,
  SubcategoryDetails,
  transformGridLayout,
} from '../../../utils/gridCategoryLayout';
import { Link } from 'react-router-dom';
import GridItem from './GridItem';
import styles from './Grid.module.css';
import { SubcategoryData } from '../../../utils/prepareData';
import { useEffect, useState } from 'react';

interface Props {
  fullDataReady: boolean;
  categoryData: { [key: string]: SubcategoryData };
  containerWidth: number;
  itemWidth: number;
  categoryName: string;
  isOverriden: boolean;
  subcategories: SubcategoryDetails[];
  backgroundColor: string;
  categoryIndex: number;
}

const Grid = (props: Props) => {
  const [grid, setGrid] = useState<GridCategoryLayout | undefined>();

  const sortItems = (items: BaseItem[]): BaseItem[] => {
    return items.sort((a: BaseItem, b: BaseItem) => {
      return (
        (a.featured && a.featured.order ? a.featured.order : 1000) -
        (b.featured && b.featured.order ? b.featured.order : 1000)
      ); // Items with undefined order are last
    });
  };

  useEffect(() => {
    if (props.containerWidth > 0) {
      setGrid(
        transformGridLayout({
          grid: getGridCategoryLayout({
            containerWidth: props.containerWidth,
            itemWidth: props.itemWidth,
            categoryName: props.categoryName,
            isOverriden: props.isOverriden,
            subcategories: props.subcategories,
          }),
          itemWidth: props.itemWidth,
          containerWidth: props.containerWidth,
          subcategories: props.subcategories,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.containerWidth, props.itemWidth, props.subcategories]);

  if (grid === undefined) return null;

  return (
    <>
      {grid.map((row: LayoutRow, rowIndex: number) => {
        return (
          <div
            className={classNames('row g-0 w-100', { 'flex-grow-1': rowIndex === grid.length - 1 })}
            key={`cat_${props.categoryIndex}row_${rowIndex}`}
          >
            {row.map((subcat: LayoutColumn) => {
              if (props.categoryData[subcat.subcategoryName].items.length === 0) return null;

              const sortedItems: (BaseItem | Item)[] = sortItems(
                sortItems(props.categoryData[subcat.subcategoryName].items)
              );

              return (
                <div
                  key={`subcat_${subcat.subcategoryName}`}
                  className={classNames(
                    'col d-flex flex-column border border-3 border-white border-start-0',
                    { 'border-top-0': props.categoryIndex !== 0 },
                    { 'border-bottom-0 col-12': subcat.percentage === 100 }
                  )}
                  style={subcat.style ? { ...subcat.style } : { maxWidth: `${subcat.percentage}%` }}
                >
                  <div
                    className={`d-flex align-items-center text-white justify-content-center text-center px-2 w-100 fw-semibold ${styles.subcatTitle}`}
                    style={{ backgroundColor: props.backgroundColor }}
                  >
                    <div className="text-truncate">{subcat.subcategoryName}</div>
                    <div>
                      <Link
                        to="/guide"
                        className={`btn btn-link text-white opacity-75 px-2 disabled ${styles.btnIcon}`}
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
                      {sortedItems.map((item: BaseItem | Item) => {
                        return (
                          <GridItem
                            fullDataReady={props.fullDataReady}
                            item={item}
                            key={`item_${item.name}`}
                            borderColor={props.backgroundColor}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export default Grid;

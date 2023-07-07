import classNames from 'classnames';
import { BaseItem } from '../../../types';
import getGridCategoryLayout, {
  GridCategoryLayout,
  LayoutColumn,
  LayoutRow,
  SubcategoryDetails,
} from '../../../utils/gridCategoryLayout';
import { Link } from 'react-router-dom';
import GridItem from './GridItem';
import styles from './Grid.module.css';
import { CategoriesData, SubcategoryData } from '../../../utils/prepareBaseData';
import { CSSProperties, useEffect, useState } from 'react';

interface Props {
  data: CategoriesData;
  containerWidth: number;
  itemWidth: number;
  categoryName: string;
  isOverriden: boolean;
  subcategories: SubcategoryDetails[];
  backgroundColor: string;
  categoryIndex: number;
  onClickItem: (item: BaseItem) => void;
}

interface GridDimensions {
  sizes: {
    columns: number;
    rows: number;
    spaces: number;
  }[];
  maxRowsIndex?: number;
  forceWidthIndex: number[];
}

const PADDING = 18;
const GAP = 5;

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

  const calculateItemsPerRow = (percentage: number): number => {
    return Math.floor((props.containerWidth * (percentage / 100) - PADDING - GAP) / (props.itemWidth + GAP));
  };

  const allEqual = (arr: number[]): boolean => arr.every((v) => v === arr[0]);

  const calculateHighestSubcategory = (row: LayoutRow): GridDimensions => {
    let maxRowsIndex: number | undefined;
    const rowsInSub: number[] = [];
    const forceWidthIndex: number[] = [];

    const sizes = row.map((subcat: LayoutColumn, index: number) => {
      const itemsPerRow = calculateItemsPerRow(subcat.percentage);
      const subcatData: SubcategoryData = props.data[props.categoryName][subcat.subcategoryName];
      const totalSpaces: number =
        subcatData.itemsCount - subcatData.itemsFeaturedCount + subcatData.itemsFeaturedCount * 4;
      const totalRows = totalSpaces / itemsPerRow;
      rowsInSub.push(Math.ceil(totalRows));
      if (itemsPerRow % 2 !== 0 && itemsPerRow < subcatData.itemsFeaturedCount * 2) {
        forceWidthIndex.push(index);
      }
      return { columns: itemsPerRow, rows: totalRows, spaces: totalSpaces };
    });

    if (!allEqual(rowsInSub)) {
      const max = Math.max(...rowsInSub);
      const items = rowsInSub.filter((element) => max === element);
      if (items.length === 1) {
        maxRowsIndex = rowsInSub.indexOf(max);
      }
    }

    return { sizes: sizes, maxRowsIndex: maxRowsIndex, forceWidthIndex: forceWidthIndex };
  };

  const calculateWidthInPx = (columnsNumber: number): string => {
    return `${columnsNumber * (props.itemWidth + 5) + PADDING}px`;
  };

  useEffect(() => {
    if (props.containerWidth !== 0) {
      setGrid(
        getGridCategoryLayout({
          containerWidth: props.containerWidth,
          itemWidth: props.itemWidth,
          categoryName: props.categoryName,
          isOverriden: props.isOverriden,
          subcategories: props.subcategories,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.containerWidth, props.itemWidth]);

  if (grid === undefined) return null;

  return (
    <>
      {grid.map((row: LayoutRow, rownIndex: number) => {
        const gridDimensions = calculateHighestSubcategory(row);

        return (
          <div
            className={classNames('row g-0 w-100', { 'flex-grow-1': rownIndex === grid.length - 1 })}
            key={`cat_${props.categoryIndex}row_${rownIndex}`}
          >
            {row.map((subcat: LayoutColumn, subcatIndex: number) => {
              const sortedItems: BaseItem[] = sortItems(
                sortItems(props.data[props.categoryName][subcat.subcategoryName].items)
              );

              let style: CSSProperties = { maxWidth: `${subcat.percentage}%` };

              if (gridDimensions.forceWidthIndex.length > 0) {
                // Use an even number of columns to prevent featured items from leaving a gap
                if (gridDimensions.forceWidthIndex.includes(subcatIndex)) {
                  const width = calculateWidthInPx(gridDimensions.sizes[subcatIndex].columns + 1);
                  style = { maxWidth: width, minWidth: width };
                }
              } else {
                if (
                  gridDimensions.sizes[subcatIndex].columns % 2 !== 0 &&
                  gridDimensions.sizes[subcatIndex].columns <
                    props.data[props.categoryName][subcat.subcategoryName].itemsFeaturedCount * 2
                ) {
                  const width = calculateWidthInPx(gridDimensions.sizes[subcatIndex].columns + 1);
                  style = { maxWidth: width, minWidth: width };
                }
              }

              return (
                <div
                  key={`subcat_${subcat.subcategoryName}`}
                  className={classNames(
                    'col d-flex flex-column border border-3 border-white border-start-0',
                    { 'border-top-0': props.categoryIndex !== 0 },
                    { 'border-bottom-0 col-12': subcat.percentage === 100 }
                  )}
                  style={style}
                >
                  <div
                    className={`d-flex align-items-center text-white justify-content-center text-center px-2 w-100 fw-semibold ${styles.subcatTitle}`}
                    style={{ backgroundColor: props.backgroundColor }}
                  >
                    <div className="text-truncate">{subcat.subcategoryName}</div>
                    <div>
                      <Link to="/guide" className={`btn btn-link text-white opacity-75 px-2 ${styles.btnIcon}`}>
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
                            borderColor={props.backgroundColor}
                            onClick={props.onClickItem}
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

export default Grid;

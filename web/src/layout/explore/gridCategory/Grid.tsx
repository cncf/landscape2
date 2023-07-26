import classNames from 'classnames';
import { BaseItem, Item, SVGIconKind } from '../../../types';
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
import SVGIcon from '../../common/SVGIcon';

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
                        <SVGIcon kind={SVGIconKind.Guide} />
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

export default Grid;

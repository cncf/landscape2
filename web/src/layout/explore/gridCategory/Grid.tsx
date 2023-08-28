import classNames from 'classnames';
import { isUndefined } from 'lodash';
import { memo, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { BaseItem, Item, SVGIconKind } from '../../../types';
import arePropsEqual from '../../../utils/areEqualProps';
import getGridCategoryLayout, {
  GridCategoryLayout,
  LayoutColumn,
  LayoutRow,
  SubcategoryDetails,
  transformGridLayout,
} from '../../../utils/gridCategoryLayout';
import { SubcategoryData } from '../../../utils/prepareData';
import sortItemsByOrderValue from '../../../utils/sortItemsByOrderValue';
import SVGIcon from '../../common/SVGIcon';
import { AppContext, Context } from '../../context/AppContext';
import styles from './Grid.module.css';
import GridItem from './GridItem';

interface Props {
  categoryData: { [key: string]: SubcategoryData };
  containerWidth: number;
  itemWidth: number;
  categoryName: string;
  isOverriden: boolean;
  subcategories: SubcategoryDetails[];
  backgroundColor: string;
  categoryIndex: number;
}

const Grid = memo(function Grid(props: Props) {
  const { updateActiveSection } = useContext(AppContext) as Context;
  const [grid, setGrid] = useState<GridCategoryLayout | undefined>();

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

  if (isUndefined(grid)) return null;

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

              const sortedItems: (BaseItem | Item)[] = sortItemsByOrderValue(
                props.categoryData[subcat.subcategoryName].items
              );

              return (
                <div
                  key={`subcat_${subcat.subcategoryName}`}
                  className={classNames(
                    'col d-flex flex-column border border-3 border-white border-start-0',
                    { 'border-top-0': props.categoryIndex !== 0 },
                    { 'border-bottom-0 col-12': subcat.percentage === 100 }
                  )}
                  style={
                    subcat.style && !props.isOverriden ? { ...subcat.style } : { maxWidth: `${subcat.percentage}%` }
                  }
                >
                  <div
                    className={`d-flex align-items-center text-white justify-content-center text-center px-2 w-100 fw-semibold ${styles.subcatTitle}`}
                    style={{ backgroundColor: props.backgroundColor }}
                  >
                    <div className="text-truncate">{subcat.subcategoryName}</div>
                    <div>
                      <Link
                        to="/guide"
                        className={`btn btn-link text-white opacity-75 ps-2 pe-1 disabled ${styles.btnIcon}`}
                      >
                        <SVGIcon kind={SVGIconKind.Guide} />
                      </Link>
                    </div>

                    <div>
                      <button
                        onClick={() =>
                          updateActiveSection({
                            category: props.categoryName,
                            subcategory: subcat.subcategoryName,
                            bgColor: props.backgroundColor,
                          })
                        }
                        className={`btn btn-link text-white ps-1 pe-2 ${styles.btnIcon}`}
                      >
                        <SVGIcon kind={SVGIconKind.MagnifyingGlass} />
                      </button>
                    </div>
                  </div>
                  <div className={`flex-grow-1 ${styles.itemsContainer}`}>
                    <div className={styles.items}>
                      {sortedItems.map((item: BaseItem | Item) => {
                        return (
                          <GridItem
                            item={item}
                            key={`item_${item.name}`}
                            borderColor={props.backgroundColor}
                            showMoreInfo
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
}, arePropsEqual);

export default Grid;

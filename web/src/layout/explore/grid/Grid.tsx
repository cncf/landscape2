import classNames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { memo, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ZOOM_LEVELS } from '../../../data';
import { BaseItem, Item, SVGIconKind } from '../../../types';
import arePropsEqual from '../../../utils/areEqualProps';
import calculateGridItemsPerRow from '../../../utils/calculateGridItemsPerRow';
import getGridCategoryLayout, {
  GridCategoryLayout,
  LayoutColumn,
  LayoutRow,
  SubcategoryDetails,
} from '../../../utils/gridCategoryLayout';
import ItemIterator from '../../../utils/itemsIterator';
import { SubcategoryData } from '../../../utils/prepareData';
import sortItemsByOrderValue from '../../../utils/sortItemsByOrderValue';
import SVGIcon from '../../common/SVGIcon';
import { ActionsContext, AppActionsContext, ZoomLevelContext, ZoomLevelProps } from '../../context/AppContext';
import styles from './Grid.module.css';
import GridItem from './GridItem';

interface Props {
  categoryData: { [key: string]: SubcategoryData };
  containerWidth: number;
  categoryName: string;
  isOverriden: boolean;
  subcategories: SubcategoryDetails[];
  backgroundColor: string;
  categoryIndex: number;
}

interface ItemsListProps {
  items: (BaseItem | Item)[];
  itemsPerRow: number;
  borderColor: string;
}

const MIN_ITEMS_PER_ROW = 4;

const ItemsList = (props: ItemsListProps) => {
  const [itemsPerRow, setItemsPerRow] = useState(props.itemsPerRow <= 0 ? MIN_ITEMS_PER_ROW : props.itemsPerRow);

  useEffect(() => {
    if (props.itemsPerRow >= MIN_ITEMS_PER_ROW) {
      setItemsPerRow(props.itemsPerRow);
    }
  }, [props.itemsPerRow]);

  return (
    <div className={styles.items}>
      {(() => {
        const items = [];
        for (const item of new ItemIterator(props.items, itemsPerRow)) {
          if (item) {
            items.push(<GridItem key={`item_${item.name}`} item={item} borderColor={props.borderColor} showMoreInfo />);
          }
        }
        return items;
      })()}
    </div>
  );
};

const Grid = memo(function Grid(props: Props) {
  const { zoomLevel } = useContext(ZoomLevelContext) as ZoomLevelProps;
  const { updateActiveSection } = useContext(AppActionsContext) as ActionsContext;
  const [grid, setGrid] = useState<GridCategoryLayout | undefined>();
  const itemWidth = ZOOM_LEVELS[zoomLevel][0];

  useEffect(() => {
    if (props.containerWidth > 0) {
      setGrid(
        getGridCategoryLayout({
          containerWidth: props.containerWidth,
          itemWidth: itemWidth,
          categoryName: props.categoryName,
          isOverriden: props.isOverriden,
          subcategories: props.subcategories,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.containerWidth, itemWidth, props.subcategories]);

  if (isUndefined(grid)) return null;

  return (
    <>
      {grid.map((row: LayoutRow, rowIndex: number) => {
        return (
          <div
            className={classNames('d-flex flex-nowrap w-100', { 'flex-grow-1': rowIndex === grid.length - 1 })}
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
                  style={{ maxWidth: `${subcat.percentage}%` }}
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
                    <ItemsList
                      borderColor={props.backgroundColor}
                      items={sortedItems}
                      itemsPerRow={calculateGridItemsPerRow(subcat.percentage, props.containerWidth, itemWidth)}
                    />
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

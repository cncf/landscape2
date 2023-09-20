import isUndefined from 'lodash/isUndefined';
import throttle from 'lodash/throttle';
import { useEffect, useRef, useState } from 'react';

import { COLORS } from '../../data';
import { BaseItem, Item } from '../../types';
import calculateGridItemsPerRow from '../../utils/calculateGridItemsPerRow';
import ItemIterator from '../../utils/itemsIterator';
import GridItem from '../explore/grid/GridItem';
import styles from './SubcategoryGrid.module.css';

interface Props {
  items?: (BaseItem | Item)[];
}

const SubcategoryGrid = (props: Props) => {
  const container = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    const checkContainerWidth = throttle(() => {
      if (container && container.current) {
        setContainerWidth(container.current.offsetWidth);
      }
    }, 400);
    window.addEventListener('resize', checkContainerWidth);

    if (container && container.current) {
      setContainerWidth(container.current.offsetWidth);
    }

    return () => window.removeEventListener('resize', checkContainerWidth);
  }, []);

  if (isUndefined(props.items)) return null;

  return (
    <div ref={container} className={`my-4 ${styles.grid}`}>
      {(() => {
        const items = [];
        const itemsPerRow = calculateGridItemsPerRow(100, containerWidth, 75, true);
        for (const item of new ItemIterator(props.items, itemsPerRow)) {
          if (item) {
            items.push(<GridItem key={`item_${item.name}`} item={item} borderColor={COLORS[0]} showMoreInfo />);
          }
        }
        return items;
      })()}
    </div>
  );
};

export default SubcategoryGrid;

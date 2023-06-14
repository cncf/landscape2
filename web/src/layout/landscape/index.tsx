import classNames from 'classnames';
import { Category, Item, Subcategory, Landscape as LandscapeData } from '../../types';
import Card from './Card';
import { COLORS } from '../../data';
import styles from './Landscape.module.css';
import { useState } from 'react';
import Filters from '../filters';
import { Modal } from './Modal';

interface Props {
  data: LandscapeData;
}

const ZOOM_LEVELS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5];
const MATURITY_LEVELS = ['graduated', 'incubating', 'sandbox', 'archived']; // TODO - remove sandbox and archived from sort?

const Landscape = (props: Props) => {
  const [levelZoom, setLevelZoom] = useState<number>(5);
  const [activeItem, setActiveItem] = useState<Item | undefined>();

  const sortItems = (): LandscapeData => {
    const data = props.data.categories.map((cat: Category) => {
      const subcategories = cat.subcategories.map((subcat: Subcategory) => {
        const items = subcat.items.sort((a: Item, b: Item) => {
          const aMaturity = a.project ? MATURITY_LEVELS.indexOf(a.project) : MATURITY_LEVELS.length;
          const bMaturity = b.project ? MATURITY_LEVELS.indexOf(b.project) : MATURITY_LEVELS.length;
          return aMaturity - bMaturity || a.name.localeCompare(b.name);
        });
        return {
          ...subcat,
          items: items,
        };
      });
      return {
        ...cat,
        subcategories: subcategories.sort((a: Subcategory, b: Subcategory) => b.items.length - a.items.length),
      };
    });
    return { categories: data };
  };

  const onClickItem = (item: Item) => {
    setActiveItem(item);
  };

  const data: LandscapeData = sortItems();

  return (
    <>
      <div className="d-flex flex-row justify-content-end pe-3 py-2">
        <button disabled={levelZoom === 0} onClick={() => setLevelZoom(levelZoom - 1)}>
          -
        </button>
        <div className="px-3">Zoom</div>
        <button disabled={levelZoom === 10} onClick={() => setLevelZoom(levelZoom + 1)}>
          +
        </button>
      </div>
      <div className="d-flex flex-row p-4">
        <div className={styles.filters}>
          <Filters />
        </div>
        <div className="d-flex flex-column flex-grow-1" style={{ zoom: ZOOM_LEVELS[levelZoom] }}>
          {data.categories.map((category: Category, index: number) => {
            return (
              <div key={`cat_${category.name}`} className="d-flex flex-row">
                <div
                  className={classNames(
                    'text-white text-center border border-3 border-white fw-semibold p-2',
                    styles.catTitle,
                    { 'border-bottom-0': index !== 0 }
                  )}
                  style={{ backgroundColor: COLORS[index] }}
                >
                  {category.name}
                </div>
                <div className="row g-0 w-100">
                  {category.subcategories.map((subcategory: Subcategory, subcatIndex: number) => {
                    return (
                      <div
                        key={`subcat_${subcategory.name}`}
                        className={classNames(
                          'col-12 col-xl d-flex flex-column border border-3 border-white border-start-0',
                          { 'border-top-0': index !== 0 },
                          { 'col-xl-12': subcatIndex === 0 }
                        )}
                      >
                        <div
                          className={`d-flex align-items-start align-items-xl-center text-white justify-content-center text-center px-2 w-100 ${styles.subcatTitle}`}
                          style={{ backgroundColor: COLORS[index] }}
                        >
                          <div className={styles.ellipsis}>{subcategory.name}</div>
                        </div>
                        <div className={`flex-grow-1 p-2 ${styles.itemsContainer}`}>
                          <div className={styles.items}>
                            {subcategory.items.map((item: Item) => {
                              return <Card item={item} key={`item_${item.name}`} onClick={onClickItem} />;
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Modal item={activeItem} onClose={() => setActiveItem(undefined)} />
    </>
  );
};

export default Landscape;

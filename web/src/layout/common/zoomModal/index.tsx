import isUndefined from 'lodash/isUndefined';
import throttle from 'lodash/throttle';
import { useContext, useEffect, useRef, useState } from 'react';

import { COLORS, ZOOM_LEVELS } from '../../../data';
import { BaseItem, Item } from '../../../types';
import calculateGridItemsPerRow from '../../../utils/calculateGridItemsPerRow';
import calculateGridWidthInPx from '../../../utils/calculateGridWidthInPx';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import sortItemsByOrderValue from '../../../utils/sortItemsByOrderValue';
import {
  ActionsContext,
  AppActionsContext,
  FullDataContext,
  FullDataProps,
  ZoomContext,
  ZoomProps,
} from '../../context/AppContext';
import GridItem from '../../explore/grid/GridItem';
import FullScreenModal from '../FullScreenModal';
import { Loading } from '../Loading';
import styles from './ZoomModal.module.css';

const GAP = 96 + 40; // Padding | Title
const CARD_WIDTH = ZOOM_LEVELS[10][0];

const ZoomModal = () => {
  const { visibleZoomView } = useContext(ZoomContext) as ZoomProps;
  const { fullDataReady } = useContext(FullDataContext) as FullDataProps;
  const { updateActiveSection } = useContext(AppActionsContext) as ActionsContext;
  const modal = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Item[] | undefined | null>();
  const [containerWidth, setContainerWidth] = useState<string>('');

  const checkNumColumns = (containerWidth: number): string => {
    const numItems = calculateGridItemsPerRow(100, containerWidth, CARD_WIDTH);
    if (containerWidth > 0) {
      if (numItems % 2 === 0) {
        return calculateGridWidthInPx(numItems - 1, CARD_WIDTH);
      } else {
        return calculateGridWidthInPx(numItems, CARD_WIDTH);
      }
    }
    return '';
  };

  useEffect(() => {
    async function fetchItems() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        setItems(await itemsDataGetter.filterItemsBySection(visibleZoomView!));
      } catch {
        setItems(null);
      }
    }

    if (visibleZoomView && fullDataReady) {
      fetchItems();
    } else {
      setItems(undefined);
    }
  }, [visibleZoomView, fullDataReady]);

  useEffect(() => {
    if (container && container.current && visibleZoomView) {
      setContainerWidth(checkNumColumns(container.current.offsetWidth - GAP));
    }
  }, [container, visibleZoomView]);

  useEffect(() => {
    const checkContainerWidth = throttle(() => {
      if (container && container.current) {
        setContainerWidth(checkNumColumns(container.current.offsetWidth - GAP));
      }
    }, 400);
    window.addEventListener('resize', checkContainerWidth);

    if (container && container.current) {
      setContainerWidth(checkNumColumns(container.current.offsetWidth - GAP));
    }

    return () => window.removeEventListener('resize', checkContainerWidth);
  }, []);

  if (isUndefined(visibleZoomView)) return null;

  return (
    <FullScreenModal open refs={[modal]} onClose={() => updateActiveSection()}>
      <div className="h-100" ref={container}>
        {items ? (
          <div className="d-flex flex-column p-5 h-100">
            <div
              ref={modal}
              className={`d-flex flex-row m-auto ${styles.wrapper}`}
              style={{ width: containerWidth !== '' ? containerWidth : '100%', maxWidth: '100%' }}
            >
              <div
                className={`text-white border border-3 border-white fw-semibold p-2 py-5 ${styles.catTitle}`}
                style={{ backgroundColor: visibleZoomView.bgColor }}
              >
                <div className="d-flex flex-row align-items-start justify-content-end">
                  <div>{visibleZoomView.category}</div>
                </div>
              </div>

              <div className="d-flex flex-column align-items-stretch w-100">
                <div
                  className={'col-12 d-flex flex-column border border-3 border-white border-start-0 border-bottom-0'}
                >
                  <div
                    className={`d-flex align-items-center text-white justify-content-center text-center px-2 w-100 fw-semibold ${styles.subcatTitle}`}
                    style={{ backgroundColor: visibleZoomView.bgColor }}
                  >
                    <div className="text-truncate">{visibleZoomView.subcategory}</div>
                  </div>
                </div>
                <div className={`h-100 overflow-auto ${styles.content}`}>
                  <div className={styles.grid}>
                    {sortItemsByOrderValue(items).map((item: BaseItem | Item) => {
                      return (
                        <GridItem item={item} key={`item_${item.name}`} borderColor={COLORS[0]} showMoreInfo={false} />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={`d-flex flex-column p-5 ${styles.loadingWrapper}`}>
            <Loading transparentBg />
          </div>
        )}
      </div>
    </FullScreenModal>
  );
};

export default ZoomModal;

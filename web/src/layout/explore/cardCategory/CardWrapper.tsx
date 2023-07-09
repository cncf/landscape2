import { BaseItem, Item } from '../../../types';
import styles from './CardWrapper.module.css';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import Card from './Card';
import { useEffect, useState } from 'react';

interface Props {
  id: string;
  onClick: (item: BaseItem) => void;
}

const CardWrapper = (props: Props) => {
  const [itemInfo, setItemInfo] = useState<Item | null | undefined>(undefined);

  useEffect(() => {
    async function fetchItemInfo() {
      try {
        setItemInfo(await itemsDataGetter.get(props.id));
      } catch {
        setItemInfo(null);
      }
    }

    fetchItemInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (itemInfo === undefined || itemInfo === null) return null;

  return (
    <div className={`col-12 col-lg-6 col-xxl-4 col-xxxl-3 ${styles.cardWrapper}`}>
      <div className={`card rounded-0 p-3 ${styles.card}`} onClick={() => props.onClick(itemInfo as BaseItem)}>
        <Card item={itemInfo} className="h-100" />
      </div>
    </div>
  );
};

export default CardWrapper;

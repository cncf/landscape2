import { DetailedItem, Item } from '../../types';
import styles from './SummaryItem.module.css';

interface Props {
  item: DetailedItem;
  index: number;
  onClick: (item: Item) => void;
}

const SummaryItem = (props: Props) => {
  return (
    <button
      className={`border rounded-circle bg-light overflow-hidden position-relative ${styles.logoWrapper}`}
      style={{ left: `-${8 * props.index}px` }}
      onClick={() => props.onClick(props.item)}
    >
      <img
        alt={`${props.item.name} logo`}
        className={styles.logo}
        src={import.meta.env.MODE === 'development' ? `../../static/${props.item.logo}` : `${props.item.logo}`}
      />
    </button>
  );
};

export default SummaryItem;

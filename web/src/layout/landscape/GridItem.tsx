import classNames from 'classnames';
import { DetailedItem, Item } from '../../types';
import styles from './GridItem.module.css';

interface Props {
  item: DetailedItem;
  onClick: (item: Item) => void;
}

const GridItem = (props: Props) => {
  return (
    <button
      className={classNames(
        'card rounded-0',
        styles.card,
        { [styles.bigCard]: props.item.isFeatured },
        { [styles.noRepo]: !props.item.has_repositories }
      )}
      onClick={() => props.onClick(props.item)}
    >
      <img
        alt={`${props.item.name} logo`}
        className={`m-auto ${styles.logo}`}
        src={import.meta.env.MODE === 'development' ? `../../static/${props.item.logo}` : `${props.item.logo}`}
      />
      {props.item.label && (
        <div
          className={`text-center text-uppercase text-dark border-top position-absolute start-0 end-0 bottom-0 ${styles.legend}`}
        >
          {props.item.label}
        </div>
      )}
    </button>
  );
};

export default GridItem;

import classNames from 'classnames';
import { Item } from '../../types';
import styles from './Card.module.css';

interface Props {
  item: Item;
  onClick: (item: Item) => void;
}

const Card = (props: Props) => {
  const isBigCard = props.item.project && ['incubating', 'graduated'].includes(props.item.project);

  return (
    <button
      className={classNames('card rounded-0', styles.card, { [styles.bigCard]: isBigCard }, { 'p-1': !isBigCard })}
      onClick={() => props.onClick(props.item)}
    >
      <img
        alt={`${props.item.name} logo`}
        className={`m-auto ${styles.logo}`}
        src={import.meta.env.MODE === 'development' ? `../../static/${props.item.logo}` : `${props.item.logo}`}
      />
      {isBigCard && (
        <div
          className={`text-center text-uppercase bg-dark text-light position-absolute start-0 end-0 bottom-0 ${styles.legend}`}
        >
          {props.item.project}
        </div>
      )}
    </button>
  );
};

export default Card;

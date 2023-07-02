import classNames from 'classnames';
import { BaseItem } from '../../types';
import styles from './OldCard.module.css';

interface Props {
  item: BaseItem;
  onClick: (item: BaseItem) => void;
}

const OldCard = (props: Props) => {
  return (
    <button
      className={classNames('card rounded-0 p-0', styles.card, { [styles.noRepo]: !props.item.has_repositories })}
      onClick={() => props.onClick(props.item)}
    >
      <div className="d-flex flex-column h-100 w-100">
        <div className="flex-grow-1 d-flex align-items-center h-75 p-2">
          <img
            alt={`${props.item.name} logo`}
            className={`m-auto ${styles.logo}`}
            src={import.meta.env.MODE === 'development' ? `../../static/${props.item.logo}` : `${props.item.logo}`}
          />
        </div>

        <div className="w-100 border-top p-2">
          <h6 className="text-muted text-center fw-semibold text-truncate mb-0">{props.item.name}</h6>
        </div>
      </div>
    </button>
  );
};

export default OldCard;

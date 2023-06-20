import { Item } from '../../types';
import Modal from '../common/Modal';
import styles from './ItemModal.module.css';

interface Props {
  activeItem?: Item;
  removeActiveItem: () => void;
}

const ItemModal = (props: Props) => {
  if (props.activeItem === undefined) return null;

  return (
    <Modal
      header={
        <div className="d-flex flex-row">
          <img
            alt={`${props.activeItem.name} logo`}
            className={styles.logo}
            src={
              import.meta.env.MODE === 'development'
                ? `../../static/${props.activeItem.logo}`
                : `${props.activeItem.logo}`
            }
          />
          <div className="text-truncate ms-3">{props.activeItem.name}</div>
        </div>
      }
      open
      onClose={() => props.removeActiveItem()}
    >
      <div>{props.activeItem.name}</div>
    </Modal>
  );
};

export default ItemModal;

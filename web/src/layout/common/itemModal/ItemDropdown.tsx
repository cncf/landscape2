// import BadgeModal from './BadgeModal';
import { createSignal } from 'solid-js';

import { useOutsideClick } from '../../../hooks/useOutsideClick';
import { SVGIconKind } from '../../../types';
import SVGIcon from '../SVGIcon';
import BadgeModal from './BadgeModal';
import styles from './ItemDropdown.module.css';

interface Props {
  itemId: string;
}

const ItemDropdown = (props: Props) => {
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [openStatus, setOpenStatus] = createSignal<boolean>(false);
  useOutsideClick([ref], visibleDropdown, () => setVisibleDropdown(false));

  const onCloseModal = () => {
    setOpenStatus(false);
  };

  return (
    <>
      <div ref={setRef} class={`position-absolute ${styles.wrapper}`}>
        <button
          type="button"
          class={`btn btn-md p-0 rounded-0 lh-1 ${styles.btn}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setVisibleDropdown(!visibleDropdown());
          }}
        >
          <SVGIcon kind={SVGIconKind.ThreeBars} />
        </button>

        <ul
          role="complementary"
          class={`dropdown-menu rounded-0 ${styles.dropdown}`}
          classList={{ show: visibleDropdown() }}
        >
          <li>
            <button
              class="dropdown-item"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                setVisibleDropdown(false);
                setOpenStatus(true);
              }}
            >
              Get badge
            </button>
          </li>
        </ul>
      </div>

      <BadgeModal itemId={props.itemId} openStatus={openStatus()} onCloseModal={onCloseModal} />
    </>
  );
};

export default ItemDropdown;

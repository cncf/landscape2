// import BadgeModal from './BadgeModal';
import { createSignal } from 'solid-js';
import { css } from 'solid-styled-components';

import { BANNER_ID } from '../data/data';
import { useOutsideClick } from '../hooks';
import { SVGIconKind } from '../types/types';
import { BadgeModal } from './BadgeModal';
import { SVGIcon } from './SVGIcon';

interface Props {
  itemId: string;
  foundation: string;
  basePath: string;
}

const Wrapper = css`
  top: 3rem;
  right: 5rem;
`;

const Btn = css`
  background: transparent;
  border: 0;
  opacity: 0.5;
  font-size: 1.5rem;

  @media (hover: hover) {
    &:hover {
      opacity: 0.75;
    }
  }
`;

const Dropdown = css`
  right: 0;
  font-size: 0.9rem;
`;

export const ItemDropdown = (props: Props) => {
  const [ref, setRef] = createSignal<HTMLDivElement>();
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [openStatus, setOpenStatus] = createSignal<boolean>(false);
  useOutsideClick([ref], [BANNER_ID], visibleDropdown, () => setVisibleDropdown(false));

  const onCloseModal = () => {
    setOpenStatus(false);
  };

  return (
    <>
      <div ref={setRef} class={`position-absolute ${Wrapper}`}>
        <button
          type="button"
          class={`btn btn-md p-0 rounded-0 lh-1 ${Btn}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setVisibleDropdown(!visibleDropdown());
          }}
        >
          <SVGIcon kind={SVGIconKind.ThreeBars} />
        </button>

        <ul role="complementary" class={`dropdown-menu rounded-0 ${Dropdown}`} classList={{ show: visibleDropdown() }}>
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

      <BadgeModal
        itemId={props.itemId}
        foundation={props.foundation}
        basePath={props.basePath}
        openStatus={openStatus()}
        onCloseModal={onCloseModal}
      />
    </>
  );
};

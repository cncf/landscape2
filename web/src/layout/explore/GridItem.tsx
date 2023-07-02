// import classNames from 'classnames';
// import { BaseItem } from '../../types';
// import styles from './GridItem.module.css';
// import DropdownOnHover from '../common/DropdownOnHover';

// interface Props {
//   item: BaseItem;
//   onClick: (item: BaseItem) => void;
// }

// const GridItem = (props: Props) => {
//   return (
//     <DropdownOnHover
//       width={350}
//       dropdownClassName={styles.dropdown}
//       className={classNames(
//         'card rounded-0 position-relative p-0',
//         styles.card,
//         { [styles.bigCard]: props.item.featured },
//         { [styles.noRepo]: !props.item.has_repositories }
//       )}
//       linkContent={
//         <button className={`btn w-100 h-100 ${styles.cardContent}`} onClick={() => props.onClick(props.item)}>
//           <img
//             alt={`${props.item.name} logo`}
//             className={`m-auto ${styles.logo}`}
//             src={import.meta.env.MODE === 'development' ? `../../static/${props.item.logo}` : `${props.item.logo}`}
//           />
//           {props.item.featured && props.item.featured.label && (
//             <div
//               className={`text-center text-uppercase text-dark border-top position-absolute start-0 end-0 bottom-0 ${styles.legend}`}
//             >
//               {props.item.featured.label}
//             </div>
//           )}
//         </button>
//       }
//       tooltipStyle
//     >
//       <div className="p-2">
//         <div className="d-flex flex-row">
//           <div className={`d-flex align-items-center justify-content-center me-3 ${styles.dropdownLogoWrapper}`}>
//             <img
//               alt={`${props.item.name} logo`}
//               className={`m-auto ${styles.dropdownLogo}`}
//               src={import.meta.env.MODE === 'development' ? `../../static/${props.item.logo}` : `${props.item.logo}`}
//             />
//           </div>

//           <div className={`flex-grow-1 p-3 ${styles.itemInfo}`}>
//             <div className="fw-semibold">{props.item.name}</div>
//             <div>{props.item.project && <div className="badge rounded-0 bg-primary">CNCF</div>}</div>
//           </div>
//         </div>
//         <div className={`mt-2 text-muted ${styles.description}`}>
//           Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
//         </div>
//       </div>
//     </DropdownOnHover>
//   );
// };

// export default GridItem;

import { useEffect, useRef, useState } from 'react';

import { useOutsideClick } from '../../hooks/useOutsideClick';
import styles from './GridItem.module.css';
import { BaseItem, Item } from '../../types';
import classNames from 'classnames';
import itemsDataGetter from '../../utils/itemsDataGetter';
import Card from './Card';

interface Props {
  item: BaseItem;
  borderColor?: string;
  onClick: (item: BaseItem) => void;
}

const FETCH_DELAY = 1 * 100; // 100ms
const DEFAULT_DROPDOWN_WIDTH = 350;
const DEFAULT_MARGIN = 30;

const GridItem = (props: Props) => {
  const ref = useRef(null);
  const wrapper = useRef<HTMLDivElement | null>(null);
  const [itemInfo, setItemInfo] = useState<Item | null | undefined>(undefined);
  const [openStatus, setOpenStatus] = useState(false);
  const [onLinkHover, setOnLinkHover] = useState(false);
  const [onDropdownHover, setOnDropdownHover] = useState(false);
  const [fetchTimeout, setFetchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [tooltipAlignment, setTooltipAlignment] = useState<'right' | 'left' | 'center'>('center');
  const [elWidth, setElWidth] = useState<number>(0);

  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  async function fetchItemInfo() {
    try {
      setItemInfo(await itemsDataGetter.get(props.item.id));
    } catch {
      setItemInfo(null);
    }
  }

  const openItemInfo = () => {
    if (itemInfo === undefined) {
      setFetchTimeout(
        setTimeout(() => {
          fetchItemInfo();
        }, FETCH_DELAY)
      );
    }
  };

  const cleanFetchTimeout = () => {
    if (fetchTimeout) {
      clearTimeout(fetchTimeout);
    }
  };

  useEffect(() => {
    const calculateTooltipPosition = () => {
      if (wrapper && wrapper.current) {
        const windowWidth = window.innerWidth;
        const bounding = wrapper.current.getBoundingClientRect();
        setElWidth(bounding.width);
        const overflowTooltip = (DEFAULT_DROPDOWN_WIDTH - elWidth) / 2;
        if (
          DEFAULT_MARGIN + bounding.right + overflowTooltip < windowWidth &&
          bounding.left - overflowTooltip - DEFAULT_MARGIN > 0
        ) {
          setTooltipAlignment('center');
        } else if (windowWidth - bounding.right - DEFAULT_MARGIN < DEFAULT_DROPDOWN_WIDTH - bounding.width) {
          setTooltipAlignment('right');
        } else {
          setTooltipAlignment('left');
        }
      }
    };

    let timeout: NodeJS.Timeout;
    if (itemInfo && !openStatus && (onLinkHover || onDropdownHover)) {
      timeout = setTimeout(() => {
        calculateTooltipPosition();
        setOpenStatus(true);
      }, 100);
    }
    if (openStatus && !onLinkHover && !onDropdownHover) {
      timeout = setTimeout(() => {
        // Delay to hide the dropdown to avoid hide it if user changes from link to dropdown
        setOpenStatus(false);
      }, 50);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      cleanFetchTimeout();
    };
  }, [onLinkHover, onDropdownHover, itemInfo, openStatus]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <div
      style={props.item.featured ? { border: `1px solid ${props.borderColor}` } : {}}
      className={classNames(
        'card rounded-0 position-relative p-0',
        styles.card,
        { [styles.bigCard]: props.item.featured },
        { [styles.noRepo]: !props.item.has_repositories }
      )}
    >
      <div className="position-absolute">
        <div
          ref={ref}
          role="complementary"
          className={classNames('dropdown-menu rounded-0 p-3', styles.dropdown, styles[`${tooltipAlignment}Aligned`], {
            ['popover show']: openStatus,
          })}
          style={{
            minWidth: `${DEFAULT_DROPDOWN_WIDTH}px`,
            left: tooltipAlignment === 'center' ? `${-(DEFAULT_DROPDOWN_WIDTH - elWidth) / 2}px` : 'auto',
          }}
          onMouseEnter={() => setOnDropdownHover(true)}
          onMouseLeave={() => setOnDropdownHover(false)}
        >
          {itemInfo && <Card item={itemInfo} />}
        </div>
      </div>

      <div ref={wrapper} className="w-100 h-100">
        <button
          className={`btn border-0 w-100 h-100 ${styles.cardContent}`}
          onClick={(e) => {
            e.preventDefault();
            props.onClick(props.item);
          }}
          onMouseEnter={(e) => {
            e.preventDefault();
            setOnLinkHover(true);
            openItemInfo();
          }}
          onMouseLeave={() => {
            setFetchTimeout(null);
            cleanFetchTimeout();
            setOnLinkHover(false);
          }}
          aria-label="Item info"
          aria-expanded={openStatus}
          aria-hidden="true"
          tabIndex={-1}
        >
          <img
            alt={`${props.item.name} logo`}
            className={`m-auto ${styles.logo}`}
            src={import.meta.env.MODE === 'development' ? `../../static/${props.item.logo}` : `${props.item.logo}`}
          />
          {props.item.featured && props.item.featured.label && (
            <div
              className={`text-center text-uppercase text-dark position-absolute start-0 end-0 bottom-0 ${styles.legend}`}
              style={props.item.featured ? { borderTop: `1px solid ${props.borderColor}` } : {}}
            >
              {props.item.featured.label}
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default GridItem;

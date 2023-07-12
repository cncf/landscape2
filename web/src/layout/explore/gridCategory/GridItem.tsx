import { useEffect, useRef, useState } from 'react';

import { useOutsideClick } from '../../../hooks/useOutsideClick';
import styles from './GridItem.module.css';
import { BaseItem, Item } from '../../../types';
import classNames from 'classnames';
import Card from '../cardCategory/Card';
import Image from '../../common/Image';

interface Props {
  fullDataReady: boolean;
  item: BaseItem | Item;
  borderColor?: string;
  onClickItem: (itemId: string) => void;
}

const DEFAULT_DROPDOWN_WIDTH = 450;
const DEFAULT_MARGIN = 30;

const GridItem = (props: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const [openStatus, setOpenStatus] = useState(false);
  const [onLinkHover, setOnLinkHover] = useState(false);
  const [onDropdownHover, setOnDropdownHover] = useState(false);
  const [tooltipAlignment, setTooltipAlignment] = useState<'right' | 'left' | 'center'>('center');
  const [elWidth, setElWidth] = useState<number>(0);

  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

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
    if (!openStatus && (onLinkHover || onDropdownHover)) {
      timeout = setTimeout(() => {
        calculateTooltipPosition();
        setOpenStatus(true);
      }, 200);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLinkHover, onDropdownHover, props.fullDataReady, openStatus]);

  return (
    <div
      style={props.item.project !== undefined ? { border: `1px solid ${props.borderColor}` } : {}}
      className={classNames(
        'card rounded-0 position-relative p-0',
        styles.card,
        { [`border-2 ${styles.bigCard}`]: props.item.featured },
        { [styles.withLabel]: props.item.featured && props.item.featured.label },
        {
          [styles.withRepo]:
            (props.item.has_repositories !== undefined && props.item.has_repositories) ||
            (props.item.has_repositories === undefined && 'repositories' in props.item),
        }
      )}
    >
      <div className="position-absolute">
        {openStatus && (
          <div
            ref={ref}
            role="complementary"
            className={`dropdown-menu rounded-0 p-3 popover show ${styles.dropdown} ${
              styles[`${tooltipAlignment}Aligned`]
            }`}
            style={{
              minWidth: `${DEFAULT_DROPDOWN_WIDTH}px`,
              left: tooltipAlignment === 'center' ? `${-(DEFAULT_DROPDOWN_WIDTH - elWidth) / 2}px` : 'auto',
            }}
            onMouseEnter={() => setOnDropdownHover(true)}
            onMouseLeave={() => setOnDropdownHover(false)}
          >
            <div className={`d-block position-absolute ${styles.arrow}`} />
            {!props.fullDataReady ? <>Loading</> : <Card item={props.item} />}
          </div>
        )}
      </div>

      <div ref={wrapper} className="w-100 h-100">
        <button
          className={`btn border-0 w-100 h-100 d-flex flex-row align-items-center ${styles.cardContent}`}
          onClick={(e) => {
            e.preventDefault();
            props.onClickItem(props.item.id);
            setOnLinkHover(false);
            setOpenStatus(false);
          }}
          onMouseEnter={(e) => {
            e.preventDefault();
            setOnLinkHover(true);
          }}
          onMouseLeave={() => {
            setOnLinkHover(false);
          }}
          aria-label="Item info"
          aria-expanded={openStatus}
          aria-hidden="true"
          tabIndex={-1}
        >
          <Image name={props.item.name} className={`m-auto ${styles.logo}`} logo={props.item.logo} />

          {props.item.featured && props.item.featured.label && (
            <div
              className={`text-center text-uppercase text-dark position-absolute start-0 end-0 bottom-0 ${styles.legend}`}
              style={props.item.featured ? { borderTop: `2px solid ${props.borderColor}` } : {}}
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

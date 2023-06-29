import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';

import { useOutsideClick } from '../../hooks/useOutsideClick';
import styles from './DropdownOnHover.module.css';

interface Props {
  linkContent: JSX.Element | string;
  children: JSX.Element;
  className?: string;
  dropdownClassName?: string;
  arrowClassName?: string;
  width?: number;
  tooltipStyle?: boolean;
  onClose?: () => void;
}

const DEFAULT_TOOLTIP_WIDTH = 200;
const DEFAULT_MARGIN = 30;

const DropdownOnHover = (props: Props) => {
  const ref = useRef(null);
  const tooltipWidth: number = props.width || DEFAULT_TOOLTIP_WIDTH;
  const wrapper = useRef<HTMLDivElement | null>(null);
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
        const overflowTooltip = (tooltipWidth - elWidth) / 2;
        if (
          DEFAULT_MARGIN + bounding.right + overflowTooltip < windowWidth &&
          bounding.left - overflowTooltip - DEFAULT_MARGIN > 0
        ) {
          setTooltipAlignment('center');
        } else if (windowWidth - bounding.right - DEFAULT_MARGIN < tooltipWidth - bounding.width) {
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
      }, 100);
    }
    if (openStatus && !onLinkHover && !onDropdownHover) {
      timeout = setTimeout(() => {
        if (props.onClose) {
          props.onClose();
        }
        // Delay to hide the dropdown to let some time for changing between dropdown and link
        setOpenStatus(false);
      }, 50);
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [onLinkHover, onDropdownHover, openStatus]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <div className={props.className}>
        <div className="position-absolute">
          <div ref={ref} onMouseEnter={() => setOnDropdownHover(true)} onMouseLeave={() => setOnDropdownHover(false)}>
            <div
              role="complementary"
              className={classNames(
                'dropdown-menu rounded-0 text-wrap',
                styles.dropdown,
                props.dropdownClassName,
                { [`tooltipDropdown ${styles.tooltip}`]: props.tooltipStyle },
                styles[`${tooltipAlignment}Aligned`],
                {
                  ['popover show']: openStatus,
                }
              )}
              style={{
                minWidth: props.width ? `${props.width}px` : `${DEFAULT_TOOLTIP_WIDTH}px`,
                left: tooltipAlignment === 'center' ? `${-(tooltipWidth - elWidth) / 2}px` : 'auto',
              }}
            >
              {props.tooltipStyle && <div className={`popover-arrow ${styles.arrow} ${props.arrowClassName}`} />}
              <div className="ps-3 pe-2 pt-1">{props.children}</div>
            </div>
          </div>
        </div>

        <div
          ref={wrapper}
          className="cursorDefault h-100 w-100"
          onMouseEnter={(e) => {
            e.preventDefault();
            setOnLinkHover(true);
          }}
          onMouseLeave={() => {
            setOnLinkHover(false);
          }}
          // Prevent going to a different page when clicking on the link
          onClick={(e) => {
            e.stopPropagation();
          }}
          aria-expanded={openStatus}
        >
          {props.linkContent}
        </div>
      </div>
    </>
  );
};

export default DropdownOnHover;

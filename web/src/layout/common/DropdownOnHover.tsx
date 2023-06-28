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

const DropdownOnHover = (props: Props) => {
  const ref = useRef(null);
  const [openStatus, setOpenStatus] = useState(false);
  const [onLinkHover, setOnLinkHover] = useState(false);
  const [onDropdownHover, setOnDropdownHover] = useState(false);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!openStatus && (onLinkHover || onDropdownHover)) {
      timeout = setTimeout(() => {
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
                {
                  show: openStatus,
                }
              )}
              style={{
                width: props.width ? `${props.width}px` : 'auto',
              }}
            >
              {props.tooltipStyle && (
                <div className={`arrow ${styles.arrow} ${props.arrowClassName}`} data-testid="dropdown-arrow" />
              )}
              <div className="ps-3 pe-2 pt-1">{props.children}</div>
            </div>
          </div>
        </div>

        <div
          className="cursorDefault"
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

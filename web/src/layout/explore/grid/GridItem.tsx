import classNames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { memo, useContext, useEffect, useRef, useState } from 'react';

import { BaseItem, Item } from '../../../types';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import Image from '../../common/Image';
import { Loading } from '../../common/Loading';
import { ActionsContext, AppActionsContext, FullDataContext, FullDataProps } from '../../context/AppContext';
import Card from '../card/Card';
import styles from './GridItem.module.css';

interface Props {
  item: BaseItem | Item;
  borderColor?: string;
  showMoreInfo: boolean;
}

interface DropdownProps {
  id: string;
}

const DEFAULT_DROPDOWN_WIDTH = 450;
const DEFAULT_MARGIN = 30;

const DropdwonContent = (props: DropdownProps) => {
  const { fullDataReady } = useContext(FullDataContext) as FullDataProps;
  const [item, setItem] = useState<Item | undefined>();

  useEffect(() => {
    setItem(itemsDataGetter.findById(props.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullDataReady]);

  return <>{isUndefined(item) ? <Loading /> : <Card item={item} />}</>;
};

const GridItem = memo(
  function GridItem(props: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const wrapper = useRef<HTMLDivElement>(null);
    const { updateActiveItemId } = useContext(AppActionsContext) as ActionsContext;
    const [visibleDropdown, setVisibleDropdown] = useState(false);
    const [onLinkHover, setOnLinkHover] = useState(false);
    const [onDropdownHover, setOnDropdownHover] = useState(false);
    const [tooltipAlignment, setTooltipAlignment] = useState<'right' | 'left' | 'center'>('center');
    const [elWidth, setElWidth] = useState<number>(0);

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
      if (!visibleDropdown && (onLinkHover || onDropdownHover)) {
        timeout = setTimeout(() => {
          calculateTooltipPosition();
          setVisibleDropdown(true);
        }, 200);
      }
      if (visibleDropdown && !onLinkHover && !onDropdownHover) {
        timeout = setTimeout(() => {
          // Delay to hide the dropdown to avoid hide it if user changes from link to dropdown
          setVisibleDropdown(false);
        }, 50);
      }

      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onLinkHover, onDropdownHover, visibleDropdown]);

    return (
      <div
        style={!isUndefined(props.item.maturity) ? { border: `1px solid ${props.borderColor}` } : {}}
        className={classNames(
          'card rounded-0 position-relative p-0',
          styles.card,
          { [`border-2 ${styles.bigCard}`]: props.item.featured },
          { [styles.withLabel]: props.item.featured && props.item.featured.label },
          {
            [styles.withRepo]: 'repositories' in props.item || props.item.has_repositories,
          }
        )}
      >
        <div className="position-absolute">
          {visibleDropdown && (
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
              onMouseEnter={() => {
                setOnDropdownHover(true);
              }}
              onMouseLeave={() => {
                setOnDropdownHover(false);
              }}
            >
              <div className={`d-block position-absolute ${styles.arrow}`} />
              <DropdwonContent id={props.item.id} />
            </div>
          )}
        </div>

        <div ref={wrapper} className="w-100 h-100">
          <button
            className={`btn border-0 w-100 h-100 d-flex flex-row align-items-center ${styles.cardContent}`}
            onClick={(e) => {
              e.preventDefault();
              if (props.showMoreInfo) {
                updateActiveItemId(props.item.id);
                setOnLinkHover(false);
                setVisibleDropdown(false);
              }
            }}
            onMouseEnter={(e) => {
              e.preventDefault();
              setOnLinkHover(true);
            }}
            onMouseLeave={() => {
              setOnLinkHover(false);
            }}
            aria-label={`${props.item.name} info`}
            aria-expanded={visibleDropdown}
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
  },
  // Force not re-render component
  () => true
);

export default GridItem;

import { getItemDescription, Image, Loading } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createSignal, on, onCleanup, Show } from 'solid-js';

import { BaseItem, Item } from '../../../types';
import isTouchDevice from '../../../utils/isTouchDevice';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { useUpdateActiveItemId } from '../../stores/activeItem';
import { useFullDataReady } from '../../stores/fullData';
import Card from '../card/Card';
import styles from './GridItem.module.css';

interface Props {
  item: BaseItem | Item;
  borderColor?: string;
  showMoreInfo: boolean;
  activeDropdown: boolean;
  enableLazyLoad?: boolean;
  container?: HTMLDivElement;
}

const DEFAULT_DROPDOWN_WIDTH = 450;
const DEFAULT_HEADER = 72;
const DEFAULT_DROPDOWN_HEIGHT = 213 + 10; // Height + arrow with gap
const DEFAULT_MARGIN = 35;

const GridItem = (props: Props) => {
  let ref;
  const fullDataReady = useFullDataReady();
  const [wrapper, setWrapper] = createSignal<HTMLDivElement>();
  const updateActiveItemId = useUpdateActiveItemId();
  const [visibleDropdown, setVisibleDropdown] = createSignal(false);
  const [onLinkHover, setOnLinkHover] = createSignal(false);
  const [onDropdownHover, setOnDropdownHover] = createSignal(false);
  const [tooltipAlignment, setTooltipAlignment] = createSignal<'right' | 'left' | 'center'>('center');
  const [tooltipVerticalAlignment, setTooltipVerticalAlignment] = createSignal<'top' | 'bottom'>('bottom');
  const [dropdownTimeout, setDropdownTimeout] = createSignal<number>();
  const [elWidth, setElWidth] = createSignal<number>(0);
  const [item, setItem] = createSignal<Item | undefined>();
  const description = () => getItemDescription(props.item);
  const containerWidth = () => (!isUndefined(props.container) ? props.container.clientWidth : window.innerWidth);
  const containerHeight = () => (!isUndefined(props.container) ? props.container.clientHeight : window.innerHeight);
  const touchDevice = () => isTouchDevice();
  // Only show dropdown on hover if it's not a touch device and activeDropdown prop is true
  const activeDropdown = () => (touchDevice() ? false : props.activeDropdown);

  createEffect(
    on(fullDataReady, () => {
      if (fullDataReady()) {
        setItem(itemsDataGetter.getItemById(props.item.id));
      }
    })
  );

  const calculateTooltipPosition = () => {
    if (!isUndefined(wrapper())) {
      const bounding = wrapper()!.getBoundingClientRect();
      setElWidth(bounding.width);
      const overflowTooltip = (DEFAULT_DROPDOWN_WIDTH - bounding.width) / 2;
      const margin = !isUndefined(props.container) ? props.container?.getBoundingClientRect().x : DEFAULT_MARGIN;
      const marginTop = !isUndefined(props.container)
        ? props.container.getBoundingClientRect().y + DEFAULT_MARGIN
        : DEFAULT_HEADER;
      const dropdownHeight = description().length > 68 ? DEFAULT_DROPDOWN_HEIGHT + 17 : DEFAULT_DROPDOWN_HEIGHT;
      // Horizontal positioning
      if (
        margin + bounding.right + overflowTooltip < containerWidth() &&
        bounding.left - overflowTooltip - margin > 0
      ) {
        setTooltipAlignment('center');
      } else if (containerWidth() + margin - bounding.x > DEFAULT_DROPDOWN_WIDTH) {
        setTooltipAlignment('left');
      } else {
        setTooltipAlignment('right');
      }
      // Vertical positioning
      if (containerHeight() - bounding.bottom > dropdownHeight) {
        setTooltipVerticalAlignment('bottom');
      } else if (bounding.top - marginTop > dropdownHeight) {
        setTooltipVerticalAlignment('top');
      }
    }
  };

  createEffect(() => {
    if (props.activeDropdown) {
      if (!visibleDropdown() && (onLinkHover() || onDropdownHover())) {
        setDropdownTimeout(
          setTimeout(() => {
            if (onLinkHover() || onDropdownHover()) {
              calculateTooltipPosition();
              setVisibleDropdown(true);
            }
          }, 200)
        );
      }
      if (visibleDropdown() && !onLinkHover() && !onDropdownHover()) {
        setDropdownTimeout(
          setTimeout(() => {
            if (!onLinkHover() && !onDropdownHover()) {
              // Delay to hide the dropdown to avoid hide it if user changes from link to dropdown
              setVisibleDropdown(false);
            }
          }, 50)
        );
      }
    }
  });

  onCleanup(() => {
    if (!isUndefined(dropdownTimeout())) {
      clearTimeout(dropdownTimeout());
    }
  });

  return (
    <Show
      when={activeDropdown()}
      fallback={
        <div
          style={props.item.featured && props.item.featured.label ? { border: `2px solid ${props.borderColor}` } : {}}
          class={`card rounded-0 position-relative p-0 ${styles.card}`}
          classList={{
            bigCard: !isUndefined(props.item.featured),
            withLabel: !isUndefined(props.item.featured) && !isUndefined(props.item.featured.label),
            whithoutRepo: isUndefined(props.item.oss) || !props.item.oss,
            archived: !isUndefined(props.item.maturity) && props.item.maturity === 'archived',
          }}
          onClick={() => {
            if (props.showMoreInfo) {
              updateActiveItemId(props.item.id);
            }
          }}
        >
          <div class="w-100 h-100">
            <div
              class={`btn border-0 w-100 h-100 d-flex flex-row align-items-center ${styles.cardContent}`}
              classList={{ noCursor: !props.activeDropdown && !props.showMoreInfo }}
            >
              <Image name={props.item.name} class={`m-auto ${styles.logo}`} logo={props.item.logo} />

              <Show when={props.item.featured && props.item.featured.label}>
                <div
                  class={`text-center text-uppercase text-dark position-absolute start-0 end-0 bottom-0 text-truncate px-1 ${styles.legend}`}
                  style={props.item.featured ? { 'border-top': `2px solid ${props.borderColor}` } : {}}
                >
                  {props.item.featured!.label}
                </div>
              </Show>
            </div>
          </div>
        </div>
      }
    >
      <div
        style={props.item.featured && props.item.featured.label ? { border: `2px solid ${props.borderColor}` } : {}}
        class={`card rounded-0 position-relative p-0 ${styles.card}`}
        classList={{
          bigCard: !isUndefined(props.item.featured),
          withLabel: !isUndefined(props.item.featured) && !isUndefined(props.item.featured.label),
          whithoutRepo: isUndefined(props.item.oss) || !props.item.oss,
          archived: !isUndefined(props.item.maturity) && props.item.maturity === 'archived',
        }}
      >
        <div class="position-absolute opacity-100">
          <Show when={visibleDropdown()}>
            <div
              ref={ref}
              role="complementary"
              class={`dropdown-menu rounded-0 p-3 popover show ${styles.dropdown} ${
                styles[`${tooltipAlignment()}Aligned`]
              } ${styles[`${tooltipVerticalAlignment()}Aligned`]}`}
              style={{
                'min-width': `${DEFAULT_DROPDOWN_WIDTH}px`,
                'max-width': !isUndefined(props.container) && props.container.clientWidth < 750 ? '300px' : 'auto',
                left: tooltipAlignment() === 'center' ? `${-(DEFAULT_DROPDOWN_WIDTH - elWidth()) / 2}px` : 'auto',
              }}
              onMouseEnter={() => {
                setOnDropdownHover(true);
              }}
              onMouseLeave={() => {
                setOnDropdownHover(false);
              }}
            >
              <div class={`d-block position-absolute ${styles.arrow}`} />
              <Show when={!isUndefined(item())} fallback={<Loading />}>
                <Card item={item()!} />
              </Show>
            </div>
          </Show>
        </div>

        <div ref={setWrapper} class="w-100 h-100">
          <button
            class={`btn border-0 w-100 h-100 d-flex flex-row align-items-center ${styles.cardContent}`}
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
            aria-expanded={visibleDropdown()}
            aria-hidden="true"
            tabIndex={-1}
          >
            <Image
              name={props.item.name}
              class={`m-auto ${styles.logo}`}
              logo={props.item.logo}
              enableLazyLoad={!isUndefined(props.enableLazyLoad) ? props.enableLazyLoad : true}
            />

            <Show when={props.item.featured && props.item.featured.label}>
              <div
                class={`text-center text-uppercase text-dark position-absolute start-0 end-0 bottom-0 text-truncate px-1 ${styles.legend}`}
                style={props.item.featured ? { 'border-top': `2px solid ${props.borderColor}` } : {}}
              >
                {props.item.featured!.label}
              </div>
            </Show>
          </button>
        </div>
      </div>
    </Show>
  );
};

export default GridItem;

import { DEFAULT_ITEM_DESCRIPTION, Image, Loading } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createMemo, createSignal, Match, onCleanup, Show, Switch } from 'solid-js';

import { Item, LandscapeItem } from '../../../types';
import isTouchDevice from '../../../utils/isTouchDevice';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { useUpdateActiveItemId } from '../../stores/activeItem';
import { useFeaturedItems } from '../../stores/featuredItems';
import { useFullDataReady, useFullDataStatus } from '../../stores/fullData';
import Card from '../card/Card';
import styles from './GridItem.module.css';

interface Props {
  item: LandscapeItem;
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
  const fullDataReady = useFullDataReady();
  const fullDataStatus = useFullDataStatus();
  const { getEffectiveFeatured } = useFeaturedItems();
  const [wrapper, setWrapper] = createSignal<HTMLDivElement>();
  const updateActiveItemId = useUpdateActiveItemId();
  const [visibleDropdown, setVisibleDropdown] = createSignal(false);
  const [onLinkHover, setOnLinkHover] = createSignal(false);
  const [onDropdownHover, setOnDropdownHover] = createSignal(false);
  const [tooltipAlignment, setTooltipAlignment] = createSignal<'right' | 'left' | 'center'>('center');
  const [tooltipVerticalAlignment, setTooltipVerticalAlignment] = createSignal<'top' | 'bottom'>('bottom');
  const [dropdownTimeout, setDropdownTimeout] = createSignal<ReturnType<typeof setTimeout>>();
  const [elWidth, setElWidth] = createSignal<number>(0);
  const description = () => props.item.description ?? DEFAULT_ITEM_DESCRIPTION;
  const containerWidth = () => (!isUndefined(props.container) ? props.container.clientWidth : window.innerWidth);
  const containerHeight = () => (!isUndefined(props.container) ? props.container.clientHeight : window.innerHeight);
  const touchDevice = () => isTouchDevice();

  // Only show dropdown on hover if it's not a touch device and activeDropdown prop is true
  const activeDropdown = () => (touchDevice() ? false : props.activeDropdown);

  // Get featured data considering group exclusions
  const effectiveFeatured = createMemo(() => getEffectiveFeatured(props.item));

  // The full item is only needed by the dropdown, so it is resolved when the dropdown opens
  const item = createMemo<Item | undefined>(() =>
    visibleDropdown() && fullDataReady() ? itemsDataGetter.getItemById(props.item.id) : undefined
  );

  const calculateTooltipPosition = () => {
    const wrapperEl = wrapper();
    if (!isUndefined(wrapperEl)) {
      const bounding = wrapperEl.getBoundingClientRect();
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

  // Logo and featured label of the item rendered without dropdown (touch devices and tablets)
  const fallbackContent = () => (
    <>
      <Image name={props.item.name} class={`m-auto ${styles.logo}`} logo={props.item.logo} />

      <Show when={effectiveFeatured()?.label}>
        <div
          class={`text-center text-uppercase text-dark position-absolute start-0 end-0 bottom-0 text-truncate px-1 ${styles.legend}`}
          style={effectiveFeatured() ? { 'border-top': `2px solid ${props.borderColor}` } : {}}
        >
          {effectiveFeatured()!.label}
        </div>
      </Show>
    </>
  );

  return (
    <Show
      when={activeDropdown()}
      fallback={
        <div
          role="listitem"
          style={effectiveFeatured()?.label ? { border: `2px solid ${props.borderColor}` } : {}}
          class={`card rounded-0 position-relative p-0 ${styles.card}`}
          classList={{
            bigCard: !isUndefined(effectiveFeatured()),
            withLabel: !isUndefined(effectiveFeatured()?.label),
            withoutRepo: isUndefined(props.item.oss) || !props.item.oss,
            archived: !isUndefined(props.item.maturity) && props.item.maturity === 'archived',
          }}
        >
          <div class="w-100 h-100">
            <Show
              when={props.showMoreInfo}
              fallback={
                <div
                  class={`btn border-0 w-100 h-100 d-flex flex-row align-items-center ${styles.cardContent}`}
                  classList={{ noCursor: !props.activeDropdown }}
                >
                  {fallbackContent()}
                </div>
              }
            >
              <button
                type="button"
                class={`btn border-0 w-100 h-100 d-flex flex-row align-items-center ${styles.cardContent}`}
                onClick={() => updateActiveItemId(props.item.id)}
                aria-label={`Open ${props.item.name} details`}
              >
                {fallbackContent()}
              </button>
            </Show>
          </div>
        </div>
      }
    >
      <div
        role="listitem"
        style={effectiveFeatured()?.label ? { border: `2px solid ${props.borderColor}` } : {}}
        class={`card rounded-0 position-relative p-0 ${styles.card}`}
        classList={{
          bigCard: !isUndefined(effectiveFeatured()),
          withLabel: !isUndefined(effectiveFeatured()?.label),
          withoutRepo: isUndefined(props.item.oss) || !props.item.oss,
          archived: !isUndefined(props.item.maturity) && props.item.maturity === 'archived',
        }}
        aria-label={props.item.name}
      >
        <div class="position-absolute opacity-100">
          <Show when={visibleDropdown()}>
            <div
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
              <Switch fallback={<Loading />}>
                <Match when={item()}>{(fullItem) => <Card item={fullItem()} />}</Match>
                {/* The full data failed to load (the Explore page offers to retry), or has no such item */}
                <Match when={fullDataStatus() === 'error' || fullDataReady()}>
                  <div class="position-absolute top-0 bottom-0 start-0 end-0 d-flex align-items-center justify-content-center text-muted text-center p-3">
                    We couldn't load the item details.
                  </div>
                </Match>
              </Switch>
            </div>
          </Show>
        </div>

        <div ref={setWrapper} class="w-100 h-100">
          <button
            type="button"
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
          >
            <Image
              name={props.item.name}
              class={`m-auto ${styles.logo}`}
              logo={props.item.logo}
              enableLazyLoad={!isUndefined(props.enableLazyLoad) ? props.enableLazyLoad : true}
            />

            <Show when={effectiveFeatured()?.label}>
              <div
                class={`text-center text-uppercase text-dark position-absolute start-0 end-0 bottom-0 text-truncate px-1 ${styles.legend}`}
                style={effectiveFeatured() ? { 'border-top': `2px solid ${props.borderColor}` } : {}}
                aria-label={effectiveFeatured()!.label}
              >
                {effectiveFeatured()!.label}
              </div>
            </Show>
          </button>
        </div>
      </div>
    </Show>
  );
};

export default GridItem;

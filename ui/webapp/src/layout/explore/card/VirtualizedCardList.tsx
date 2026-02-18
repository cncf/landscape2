import { useBreakpointDetect } from 'common';
import isUndefined from 'lodash/isUndefined';
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';

import { BaseItem, Breakpoint, Item, SortDirection, SortOption } from '../../../types';
import sortItems from '../../../utils/sortItems';
import { useUpdateActiveItemId } from '../../stores/activeItem';
import Card from './Card';

const DESKTOP_ESTIMATED_ROW_HEIGHT = 237;
const MOBILE_ESTIMATED_ROW_HEIGHT = 250;
const OVERSCAN_ROWS = 8;
const VIRTUALIZATION_THRESHOLD = 200;

interface Props {
  archivedClassName: string;
  cardClassName: string;
  cardContentClassName: string;
  colClassName: string;
  direction: SortDirection;
  isVisible: boolean;
  items: (BaseItem | Item)[];
  logoClassName: string;
  rowClassName: string;
  rowSpacingPx: number;
  sorted: SortOption;
  variant: 'desktop' | 'mobile';
  wrapperClassName: string;
}

const getColumnsPerRow = (point: Breakpoint | undefined, variant: 'desktop' | 'mobile'): number => {
  if (variant === 'mobile') {
    return point === Breakpoint.SM ? 2 : 1;
  }

  switch (point) {
    case Breakpoint.XXXL:
      return 4;
    case Breakpoint.XXL:
      return 3;
    case Breakpoint.XL:
    case Breakpoint.LG:
      return 2;
    default:
      return 1;
  }
};

const VirtualizedCardList = (props: Props) => {
  const updateActiveItemId = useUpdateActiveItemId();
  const { point } = useBreakpointDetect();
  const [listContainer, setListContainer] = createSignal<HTMLDivElement>();
  const [measuredRowHeight, setMeasuredRowHeight] = createSignal<number>();
  const [visibleRange, setVisibleRange] = createSignal<{ end: number; start: number }>({
    end: 0,
    start: 0,
  });
  const [scrollTarget, setScrollTarget] = createSignal<Window | HTMLElement>();

  const sortedItems = createMemo(() => sortItems(props.items, props.sorted, props.direction));
  const columnsPerRow = () => getColumnsPerRow(point(), props.variant);
  const shouldVirtualize = () => sortedItems().length > VIRTUALIZATION_THRESHOLD;
  const estimatedRowHeight = () =>
    props.variant === 'desktop' ? DESKTOP_ESTIMATED_ROW_HEIGHT : MOBILE_ESTIMATED_ROW_HEIGHT;
  const rowSize = () => (measuredRowHeight() || estimatedRowHeight()) + props.rowSpacingPx;
  const rows = createMemo(() => {
    const currentRows: (BaseItem | Item)[][] = [];
    const columns = Math.max(1, columnsPerRow());
    const items = sortedItems();

    for (let index = 0; index < items.length; index += columns) {
      currentRows.push(items.slice(index, index + columns));
    }

    return currentRows;
  });

  const requestVisibleRangeUpdate = () => {
    requestAnimationFrame(() => {
      const target = scrollTarget();
      const container = listContainer();

      if (isUndefined(target) || isUndefined(container)) {
        return;
      }

      const rowsCount = rows().length;
      if (!props.isVisible || !shouldVirtualize() || rowsCount === 0) {
        setVisibleRange({
          end: rowsCount,
          start: 0,
        });
        return;
      }

      const rowHeight = rowSize();
      let scrollPosition = 0;
      let viewportHeight = 0;
      let listTop = 0;

      if (target instanceof Window) {
        scrollPosition = window.scrollY;
        viewportHeight = window.innerHeight;
        listTop = container.getBoundingClientRect().top + window.scrollY;
      } else {
        const targetRect = target.getBoundingClientRect();
        scrollPosition = target.scrollTop;
        viewportHeight = target.clientHeight;
        listTop = container.getBoundingClientRect().top - targetRect.top + target.scrollTop;
      }

      const visibleStartPx = scrollPosition - listTop;
      const visibleEndPx = visibleStartPx + viewportHeight;

      const start = Math.max(0, Math.floor(visibleStartPx / rowHeight) - OVERSCAN_ROWS);
      const end = Math.min(rowsCount, Math.ceil(visibleEndPx / rowHeight) + OVERSCAN_ROWS);

      setVisibleRange({
        end: Math.max(start, end),
        start,
      });
    });
  };

  const measureRow = (rowElement: HTMLDivElement) => {
    const nextMeasuredHeight = rowElement.offsetHeight;
    if (nextMeasuredHeight > 0 && nextMeasuredHeight !== measuredRowHeight()) {
      setMeasuredRowHeight(nextMeasuredHeight);
      requestVisibleRangeUpdate();
    }
  };

  const beforeHeight = () => visibleRange().start * rowSize();
  const afterHeight = () => (rows().length - visibleRange().end) * rowSize();
  const visibleRows = () => rows().slice(visibleRange().start, visibleRange().end);

  createEffect(() => {
    rows();
    point();
    const isVisible = props.isVisible;
    if (!isVisible) {
      setVisibleRange({
        end: rows().length,
        start: 0,
      });
      return;
    }
    requestVisibleRangeUpdate();
  });

  onMount(() => {
    const nextTarget =
      props.variant === 'desktop' ? (document.getElementById('landscape') as HTMLElement) || window : window;
    setScrollTarget(nextTarget);

    const handleScroll = () => {
      requestVisibleRangeUpdate();
    };

    nextTarget.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    requestVisibleRangeUpdate();

    onCleanup(() => {
      nextTarget.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    });
  });

  const renderItem = (item: BaseItem | Item) => {
    return (
      <div class={props.colClassName} role="listitem">
        <div
          class={`card rounded-0 p-3 ${props.cardClassName}`}
          classList={{
            [props.archivedClassName]: !isUndefined(item.maturity) && item.maturity === 'archived',
          }}
          onClick={() => updateActiveItemId(item.id)}
        >
          <Card
            item={item as Item}
            logoClass={props.logoClassName}
            class={`h-100 ${props.cardContentClassName}`}
            isVisible={props.isVisible}
          />
        </div>
      </div>
    );
  };

  return (
    <Show
      when={shouldVirtualize()}
      fallback={
        <div class={props.wrapperClassName} role="list">
          <For each={sortedItems()}>{(item: BaseItem | Item) => renderItem(item)}</For>
        </div>
      }
    >
      <div ref={setListContainer} role="list">
        <Show when={beforeHeight() > 0}>
          <div style={{ height: `${beforeHeight()}px` }} />
        </Show>
        <For each={visibleRows()}>
          {(row: (BaseItem | Item)[]) => {
            return (
              <div
                ref={(rowElement) => measureRow(rowElement)}
                class={props.rowClassName}
                style={{
                  'margin-bottom': `${props.rowSpacingPx}px`,
                }}
              >
                <For each={row}>{(item: BaseItem | Item) => renderItem(item)}</For>
              </div>
            );
          }}
        </For>
        <Show when={afterHeight() > 0}>
          <div style={{ height: `${afterHeight()}px` }} />
        </Show>
      </div>
    </Show>
  );
};

export default VirtualizedCardList;

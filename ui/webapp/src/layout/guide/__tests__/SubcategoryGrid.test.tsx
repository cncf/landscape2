import { render, screen } from '@solidjs/testing-library';
import { createItem } from 'common/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LandscapeItem } from '../../../types';
import SubcategoryGrid from '../SubcategoryGrid';

/** Items of the subcategory. */
const ITEMS: LandscapeItem[] = [
  createItem({ id: 'item-1', name: 'Item 1' }),
  createItem({ id: 'item-2', name: 'Item 2' }),
  createItem({ id: 'item-3', name: 'Item 3' }),
];

vi.mock('../../explore/grid/GridItem', () => ({
  default: (props: { item: LandscapeItem }) => <div>Grid item {props.item.name}</div>,
}));
vi.mock('../../stores/activeItem', () => ({ useUpdateActiveItemId: () => vi.fn() }));

/** Observers created by the component, with the elements each one observes. */
const resizeObservers: MockResizeObserver[] = [];

/** Width the grid container reports. */
let containerWidth = 0;

describe('SubcategoryGrid', () => {
  beforeEach(() => {
    containerWidth = 0;
    resizeObservers.length = 0;
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ height: 100, width: containerWidth }) as DOMRect
    );
  });

  it('leaves no resize listener on the window after unmounting', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');

    // Mount and unmount the grid
    const { unmount } = render(() => <SubcategoryGrid items={ITEMS} />);
    unmount();

    // Verify every resize listener added was removed
    const added = resizeListeners(addEventListener.mock.calls);
    const removed = resizeListeners(removeEventListener.mock.calls);
    expect(added.filter((listener) => !removed.includes(listener))).toEqual([]);
  });

  it('renders no grid item until the container has a width', () => {
    render(() => <SubcategoryGrid items={ITEMS} />);
    expect(screen.queryByText('Grid item Item 1')).not.toBeInTheDocument();

    resizeContainer(400);
    expect(screen.getByText('Grid item Item 1')).toBeInTheDocument();
    expect(screen.getByText('Grid item Item 3')).toBeInTheDocument();
  });

  it('keeps the same grid item nodes when a width change keeps the items per row', () => {
    // Render the grid with five items per row
    render(() => <SubcategoryGrid items={ITEMS} />);
    resizeContainer(400);
    const gridItem = screen.getByText('Grid item Item 1');

    // Widen the container a little, still with five items per row
    resizeContainer(410);

    // Verify the grid item was not created again
    expect(screen.getByText('Grid item Item 1')).toBe(gridItem);
  });
});

// Helpers.

/** `ResizeObserver` the tests trigger by hand through `resizeContainer`. */
class MockResizeObserver implements ResizeObserver {
  /** Elements being observed. */
  targets: Set<Element> = new Set();

  constructor(private callback: ResizeObserverCallback) {
    resizeObservers.push(this);
  }

  disconnect(): void {
    this.targets.clear();
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  /** Reports a size change of every observed element. */
  trigger(): void {
    if (this.targets.size === 0) return;
    const entries = [...this.targets].map((target) => ({ target }) as ResizeObserverEntry);
    this.callback(entries, this);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }
}

/** Sets the width the grid container reports and notifies the resize observers. */
const resizeContainer = (width: number) => {
  containerWidth = width;
  resizeObservers.forEach((observer) => observer.trigger());
};

/** Returns the listeners of the `resize` events among the listener calls provided. */
const resizeListeners = (calls: unknown[][]) =>
  calls.filter(([type]) => type === 'resize').map(([, listener]) => listener);

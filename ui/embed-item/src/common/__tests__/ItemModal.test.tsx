import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import type { Item } from 'common';
import { createItem, setViewportWidth } from 'common/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ItemModal, { type ItemLoadStatus } from '../ItemModal';

const DESKTOP_ONLY_TEXT = 'End user';
const INITIAL_VIEWPORT_WIDTH = window.innerWidth;

describe('ItemModal', () => {
  afterEach(() => {
    setViewportWidth(INITIAL_VIEWPORT_WIDTH);
  });

  it('shows the loading indicator while the item loads', () => {
    renderItemModal({ itemLoadStatus: 'loading' });

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('shows the error and retries with "Try again"', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    // Render the error state
    renderItemModal({ itemLoadStatus: 'error', onRetry });
    expect(screen.getByText("We couldn't load this item.")).toBeInTheDocument();

    // Retry and verify the callback runs
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the not-found text when the item is not in the dataset', () => {
    renderItemModal({ itemLoadStatus: 'not-found' });

    expect(screen.getByText("We couldn't find this item.")).toBeInTheDocument();
  });

  it('renders the desktop content on a 1000 px wide viewport', () => {
    // Use a large (lg) viewport, outside the small devices breakpoints
    setViewportWidth(1000);

    renderItemModal({ itemInfo: createItem({ enduser: true }), itemLoadStatus: 'ready' });

    expect(screen.getByText(DESKTOP_ONLY_TEXT)).toBeInTheDocument();
  });

  it('renders the mobile content on an 800 px wide viewport', () => {
    // Use a medium (md) viewport, one of the small devices breakpoints
    setViewportWidth(800);

    renderItemModal({ itemInfo: createItem({ enduser: true }), itemLoadStatus: 'ready' });

    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.queryByText(DESKTOP_ONLY_TEXT)).not.toBeInTheDocument();
  });
});

// Helpers.

/** Props of the item modal that the tests set. */
interface RenderOptions {
  itemLoadStatus: ItemLoadStatus;
  itemInfo?: Item;
  onRetry?: () => void;
}

/** Renders the item modal with the given state and no-op callbacks by default. */
const renderItemModal = (options: RenderOptions) =>
  render(() => (
    <ItemModal
      foundation="CNCF"
      itemInfo={options.itemInfo}
      itemLoadStatus={options.itemLoadStatus}
      onClose={vi.fn()}
      onRetry={options.onRetry ?? vi.fn()}
    />
  ));

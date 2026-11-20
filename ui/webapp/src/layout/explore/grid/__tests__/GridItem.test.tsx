import { screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createItem, flushPromises, tabTo } from 'common/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { renderWithExploreStores } from '../../../../test-utils/render';
import itemsDataGetter from '../../../../utils/itemsDataGetter';
import GridItem from '../GridItem';

// jsdom exposes touch events, so the dropdown would never be active
vi.mock('../../../../utils/isTouchDevice', () => ({ default: () => false }));

describe('GridItem', () => {
  it('resolves the full item only when its dropdown opens', async () => {
    const user = userEvent.setup();

    // Render an item while the full data is ready
    const item = createItem({ description: 'Full item description', id: 'item', name: 'Item' });
    vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue('ready');
    const getItemById = vi.spyOn(itemsDataGetter, 'getItemById').mockReturnValue(item);
    renderWithExploreStores(() => <GridItem item={item} showMoreInfo activeDropdown />);
    await flushPromises();

    // Check the full item is not looked up before the dropdown opens
    expect(getItemById).not.toHaveBeenCalled();

    // Hover the item and check the dropdown shows the full item
    await user.hover(screen.getByRole('button', { name: 'Item info' }));
    expect(await screen.findByText('Full item description')).toBeInTheDocument();
    expect(getItemById).toHaveBeenCalledWith('item');
  });

  it('shows a spinner in the dropdown while the full data is loading', async () => {
    const user = userEvent.setup();

    // Render an item while the full data is loading
    const item = createItem({ id: 'item', name: 'Item' });
    vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue('loading');
    renderWithExploreStores(() => <GridItem item={item} showMoreInfo activeDropdown />);

    // Hover the item and check the dropdown shows the spinner
    await user.hover(screen.getByRole('button', { name: 'Item info' }));
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByText("We couldn't load the item details.")).not.toBeInTheDocument();
  });

  it('shows an error in the dropdown when the full data failed to load', async () => {
    const user = userEvent.setup();

    // Render an item after the full data failed to load
    const item = createItem({ id: 'item', name: 'Item' });
    vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue('error');
    renderWithExploreStores(() => <GridItem item={item} showMoreInfo activeDropdown />);

    // Hover the item and check the dropdown shows the error instead of a spinner
    await user.hover(screen.getByRole('button', { name: 'Item info' }));
    expect(await screen.findByText("We couldn't load the item details.")).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows an error in the dropdown when the full data has no such item', async () => {
    const user = userEvent.setup();

    // Render an item missing from the full data
    const item = createItem({ id: 'item', name: 'Item' });
    vi.spyOn(itemsDataGetter, 'getStatus').mockReturnValue('ready');
    vi.spyOn(itemsDataGetter, 'getItemById').mockReturnValue(undefined);
    renderWithExploreStores(() => <GridItem item={item} showMoreInfo activeDropdown />);
    await flushPromises();

    // Hover the item and check the dropdown shows the error instead of a spinner
    await user.hover(screen.getByRole('button', { name: 'Item info' }));
    expect(await screen.findByText("We couldn't load the item details.")).toBeInTheDocument();
  });

  it('opens the item with the keyboard when rendered without dropdown', async () => {
    const user = userEvent.setup();
    const item = createItem({ id: 'item', name: 'Item' });

    // Render the item without dropdown, as on touch devices and tablets
    const { history } = renderWithExploreStores(() => <GridItem item={item} showMoreInfo activeDropdown={false} />);

    // Tab to the item and open it with Enter
    await tabTo(user, screen.getByRole('button', { name: 'Open Item details' }));
    await user.keyboard('{Enter}');

    // Check the item is open
    expect(new URL(history.get(), 'http://localhost').searchParams.get('item')).toBe('item');
  });

  it('renders no button without dropdown when the item details are not available', () => {
    const item = createItem({ id: 'item', name: 'Item' });

    renderWithExploreStores(() => <GridItem item={item} showMoreInfo={false} activeDropdown={false} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

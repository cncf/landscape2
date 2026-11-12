import { screen, waitFor } from '@solidjs/testing-library';
import { describe, expect, it, vi } from 'vitest';

import { renderWithRouter } from '../../../test-utils/render';
import itemsDataGetter from '../../../utils/itemsDataGetter';
import { ActiveItemProvider, useActiveItemId, useUpdateActiveItemId } from '../activeItem';
import { FullDataProvider } from '../fullData';
import { GroupActiveProvider, useGroupActive } from '../groupActive';
import { useViewMode, ViewModeProvider } from '../viewMode';

describe('ActiveItemProvider', () => {
  it('restores exactly the previous URL after opening and closing an item', async () => {
    // Render the store on a URL with a repeated filter and a hash
    const initialUrl = '/?view-mode=card&project=a&project=b#x';
    const { history, updateActiveItem } = renderActiveItem(initialUrl);

    // Open an item and verify only the item param is added
    updateActiveItem('item-1');
    await waitFor(() => expect(screen.getByText('item: item-1')).toBeInTheDocument());
    expect(history.get()).toBe('/?view-mode=card&project=a&project=b&item=item-1#x');

    // Close the item and verify the URL is restored as it was
    updateActiveItem();
    await waitFor(() => expect(screen.getByText('item: none')).toBeInTheDocument());
    expect(history.get()).toBe(initialUrl);
  });

  it('pushes a history entry when an item is opened, so going back closes it', async () => {
    // Render the store and open an item
    const { history, updateActiveItem } = renderActiveItem('/?group=g1');
    updateActiveItem('item-1');
    await waitFor(() => expect(screen.getByText('item: item-1')).toBeInTheDocument());

    // Go back and verify the item is closed on the previous entry
    history.back();
    await waitFor(() => expect(screen.getByText('item: none')).toBeInTheDocument());
    expect(history.get()).toBe('/?group=g1');
  });

  it('replaces the entry when closing a deep-linked item instead of going back', async () => {
    // Render the store and arrive at a deep-linked item from another page
    const { history, updateActiveItem } = renderActiveItem('/stats');
    history.set({ value: '/?project=p&item=item-1' });
    await waitFor(() => expect(screen.getByText('item: item-1')).toBeInTheDocument());

    // Close the item and verify the entry is replaced without the item
    updateActiveItem();
    await waitFor(() => expect(screen.getByText('item: none')).toBeInTheDocument());
    expect(history.get()).toBe('/?project=p');

    // Verify the previous entry is still the page the user came from
    history.back();
    await waitFor(() => expect(history.get()).toBe('/stats'));
  });

  it('gives no item for a repeated item param', () => {
    renderActiveItem('/?item=a&item=b');

    expect(screen.getByText('item: none')).toBeInTheDocument();
  });

  it('opens the item of a link navigated to after the store is created', async () => {
    // Render the store without an item
    const { history } = renderActiveItem('/guide');

    // Navigate to a URL with an item and verify the store follows it
    history.set({ value: '/guide?item=item-1' });
    await waitFor(() => expect(screen.getByText('item: item-1')).toBeInTheDocument());
  });

  it('follows Back and Forward together with the view mode and group stores', async () => {
    // Render the three stores on a first entry
    vi.spyOn(itemsDataGetter, 'getGroups').mockReturnValue(['g1', 'g2']);
    const { history } = renderWithRouter(
      () => (
        <FullDataProvider>
          <ActiveItemProvider>
            <ViewModeProvider>
              <GroupActiveProvider>
                <StoresProbe />
              </GroupActiveProvider>
            </ViewModeProvider>
          </ActiveItemProvider>
        </FullDataProvider>
      ),
      { url: '/?group=g1&view-mode=grid' }
    );
    expect(screen.getByText('group: g1, view mode: grid, item: none')).toBeInTheDocument();

    // Push a second entry with a different group, view mode and item
    history.set({ value: '/?group=g2&view-mode=card&item=item-1' });
    await waitFor(() => expect(screen.getByText('group: g2, view mode: card, item: item-1')).toBeInTheDocument());

    // Go back and verify every store follows the first entry
    history.back();
    await waitFor(() => expect(screen.getByText('group: g1, view mode: grid, item: none')).toBeInTheDocument());

    // Go forward and verify every store follows the second entry again
    history.forward();
    await waitFor(() => expect(screen.getByText('group: g2, view mode: card, item: item-1')).toBeInTheDocument());
  });
});

// Helpers.

/** Renders the active item store at the URL provided, returning the history and its updater. */
const renderActiveItem = (url: string) => {
  let updateActiveItem: ((itemId?: string) => void) | undefined;
  const ActiveItemProbe = () => {
    const itemId = useActiveItemId();
    updateActiveItem = useUpdateActiveItemId();
    return <span>item: {itemId() ?? 'none'}</span>;
  };

  const { history } = renderWithRouter(
    () => (
      <ActiveItemProvider>
        <ActiveItemProbe />
      </ActiveItemProvider>
    ),
    { url }
  );

  return { history, updateActiveItem: updateActiveItem! };
};

/** Displays the group, view mode and item stores in one line. */
const StoresProbe = () => {
  const group = useGroupActive();
  const viewMode = useViewMode();
  const itemId = useActiveItemId();
  return (
    <span>
      group: {group()}, view mode: {viewMode()}, item: {itemId() ?? 'none'}
    </span>
  );
};

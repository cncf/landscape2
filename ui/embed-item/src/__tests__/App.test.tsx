import { render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import type { Item, LandscapeColors } from 'common';
import { createDeferred, createItem, flushPromises } from 'common/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

const COLORS: LandscapeColors = {
  color1: 'rgba(1, 1, 1, 1)',
  color2: 'rgba(2, 2, 2, 1)',
  color3: 'rgba(3, 3, 3, 1)',
  color4: 'rgba(4, 4, 4, 0.5)',
  color5: 'rgba(5, 5, 5, 0.5)',
  color6: 'rgba(6, 6, 6, 0.5)',
  color7: 'rgb(7, 7, 7)',
};

const ITEM_DETAILS_DIALOG = { name: 'Embeddable item details modal' };

const SHOW_ITEM_DETAILS = {
  classifyBy: 'category',
  foundation: 'CNCF',
  itemId: 'item-a',
  key: 'category-1',
  type: 'showItemDetails',
};

const { mockFetchItems, mockGetItemById, mockGetItemByName } = vi.hoisted(() => ({
  mockFetchItems: vi.fn<(classifyBy: string, key: string, categories?: string[]) => Promise<void>>(),
  mockGetItemById: vi.fn<(classifyBy: string, key: string, id: string) => Item | undefined>(),
  mockGetItemByName: vi.fn<(classifyBy: string, key: string, name: string) => Item | undefined>(),
}));

vi.mock('../utils/itemsDataGetter', () => ({
  default: {
    fetchItems: mockFetchItems,
    getItemById: mockGetItemById,
    getItemByName: mockGetItemByName,
  },
}));

describe('App', () => {
  beforeEach(() => {
    mockFetchItems.mockReset();
    mockGetItemById.mockReset();
    mockGetItemByName.mockReset();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('shows the error, then retries', async () => {
    const user = userEvent.setup();

    // Request an item whose data fails to load
    mockFetchItems.mockRejectedValueOnce(new Error('Unavailable'));
    render(() => <App />);
    postShowItemDetails(SHOW_ITEM_DETAILS);
    await flushPromises();
    expect(screen.getByText("We couldn't load this item.")).toBeInTheDocument();

    // Retry and check the item is requested again and shown
    mockFetchItems.mockResolvedValueOnce(undefined);
    mockGetItemById.mockReturnValueOnce(createItem({ id: 'item-a', name: 'Item A' }));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await flushPromises();
    expect(mockFetchItems).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.queryByText("We couldn't load this item.")).not.toBeInTheDocument();
  });

  it('shows the item when ready', async () => {
    // Request an item and keep its data loading
    const request = createDeferred<void>();
    mockFetchItems.mockReturnValueOnce(request.promise);
    mockGetItemById.mockReturnValueOnce(createItem({ id: 'item-a', name: 'Item A' }));
    render(() => <App />);
    postShowItemDetails({ ...SHOW_ITEM_DETAILS, categories: ['category-1'] });
    expect(screen.getByRole('dialog', ITEM_DETAILS_DIALOG)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');

    // Load the data and check the item is shown
    request.resolve();
    await flushPromises();
    expect(mockFetchItems).toHaveBeenCalledExactlyOnceWith('category', 'category-1', ['category-1']);
    expect(mockGetItemById).toHaveBeenCalledExactlyOnceWith('category', 'category-1', 'item-a');
    expect(screen.getByText('Item A')).toBeInTheDocument();
  });

  it('shows the parent project of a subproject found in the loaded dataset', async () => {
    // Request a subproject whose parent is in the dataset
    mockFetchItems.mockResolvedValueOnce(undefined);
    mockGetItemById.mockReturnValueOnce(createItem({ id: 'item-a', name: 'Item A', parent_project: 'Parent' }));
    mockGetItemByName.mockReturnValueOnce(createItem({ id: 'parent', maturity: 'graduated', name: 'Parent' }));
    render(() => <App />);
    postShowItemDetails(SHOW_ITEM_DETAILS);
    await flushPromises();

    // Check the parent item is looked up by name and described as a foundation project
    expect(mockGetItemByName).toHaveBeenCalledExactlyOnceWith('category', 'category-1', 'Parent');
    expect(screen.getByRole('heading', { name: 'Parent project' })).toBeInTheDocument();
    expect(screen.getByText(/Item A is a subproject of Parent/)).toHaveTextContent(
      'Item A is a subproject of Parent, a CNCF project.'
    );
  });

  it('shows not-found when the item is not in the dataset', async () => {
    mockFetchItems.mockResolvedValueOnce(undefined);
    mockGetItemById.mockReturnValueOnce(undefined);

    render(() => <App />);
    postShowItemDetails(SHOW_ITEM_DETAILS);
    await flushPromises();

    expect(screen.getByText("We couldn't find this item.")).toBeInTheDocument();
  });

  it('ignores messages from another source, with the wrong type or with invalid fields', async () => {
    // Setup an iframe whose window is not the host page
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    render(() => <App />);

    // Post the messages that must be ignored
    postShowItemDetails(SHOW_ITEM_DETAILS, iframe.contentWindow);
    postShowItemDetails({ ...SHOW_ITEM_DETAILS, type: 'hideItemDetails' });
    postShowItemDetails({ ...SHOW_ITEM_DETAILS, classifyBy: 'unknown' });
    postShowItemDetails({ ...SHOW_ITEM_DETAILS, itemId: 42 });
    postShowItemDetails({ ...SHOW_ITEM_DETAILS, key: '../data' });
    await flushPromises();

    // Check no item was requested nor shown
    expect(mockFetchItems).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    iframe.remove();
  });

  it('posts hideItemDetails when the host page asks for an item with an invalid message', async () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage');
    render(() => <App />);

    // Request an item with an invalid key, as the host page has already shown the iframe
    postShowItemDetails({ ...SHOW_ITEM_DETAILS, key: '../data' });
    await flushPromises();

    // Check the host page is told to hide the iframe again
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'hideItemDetails' }, '*');
    expect(mockFetchItems).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not post hideItemDetails for other messages from the host page', async () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage');
    render(() => <App />);

    // Post messages that are not item requests
    postShowItemDetails({ type: 'other' });
    postShowItemDetails({ ...SHOW_ITEM_DETAILS, type: 'hideItemDetails' });
    await flushPromises();

    expect(postMessage).not.toHaveBeenCalled();
  });

  it('posts hideItemDetails on close and does not reopen on a late fetch result', async () => {
    const user = userEvent.setup();
    const postMessage = vi.spyOn(window.parent, 'postMessage');

    // Request an item and keep its data loading
    const request = createDeferred<void>();
    mockFetchItems.mockReturnValueOnce(request.promise);
    mockGetItemById.mockReturnValue(createItem({ id: 'item-a', name: 'Item A' }));
    render(() => <App />);
    postShowItemDetails(SHOW_ITEM_DETAILS);

    // Close the item details and check the host page is told to hide them
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'hideItemDetails' }, '*');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Load the data late and check the item details stay closed
    request.resolve();
    await flushPromises();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockGetItemById).not.toHaveBeenCalled();
  });

  it('keeps showing the latest item when an older request resolves', async () => {
    // Request two items in a row
    const firstRequest = createDeferred<void>();
    const secondRequest = createDeferred<void>();
    mockFetchItems.mockReturnValueOnce(firstRequest.promise).mockReturnValueOnce(secondRequest.promise);
    mockGetItemById.mockReturnValueOnce(createItem({ id: 'item-b', name: 'Item B' }));
    render(() => <App />);
    postShowItemDetails(SHOW_ITEM_DETAILS);
    postShowItemDetails({ ...SHOW_ITEM_DETAILS, itemId: 'item-b' });

    // Resolve the latest request
    secondRequest.resolve();
    await flushPromises();
    expect(screen.getByText('Item B')).toBeInTheDocument();

    // Resolve the older request and check the latest item stays visible
    firstRequest.resolve();
    await flushPromises();
    expect(screen.getByText('Item B')).toBeInTheDocument();
    expect(mockGetItemById).toHaveBeenCalledTimes(1);
  });

  it('applies the window colors as the --color1 to --color7 variables', () => {
    vi.stubGlobal('colors', COLORS);

    render(() => <App />);

    const style = document.documentElement.style;
    for (const [name, value] of Object.entries(COLORS)) {
      expect(style.getPropertyValue(`--${name}`)).toBe(value);
    }
  });

  it('keeps the stylesheet colors when the window has none', () => {
    vi.stubGlobal('colors', undefined);

    render(() => <App />);

    expect(document.documentElement.style.getPropertyValue('--color1')).toBe('');
  });
});

// Helpers.

/** Dispatches a message event, sent by the host page (the parent window) unless another source is given. */
const postShowItemDetails = (data: Record<string, unknown>, source: Window | null = window.parent) => {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
};

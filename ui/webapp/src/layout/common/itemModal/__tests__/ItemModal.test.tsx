import { screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createItem, setViewportWidth } from 'common/test-utils';
import { createSignal } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithRouter } from '../../../../test-utils/render';
import itemsDataGetter from '../../../../utils/itemsDataGetter';
import { ActiveItemProvider, useUpdateActiveItemId } from '../../../stores/activeItem';
import ItemModal from '..';

const DESKTOP_WIDTH = 1400;
const MOBILE_WIDTH = 400;

const { mockRetryFullData } = vi.hoisted(() => ({ mockRetryFullData: vi.fn() }));
const [mockFullDataStatus, mockSetFullDataStatus] = createSignal<'error' | 'loading' | 'ready'>('ready');
const mockFullDataReady = () => mockFullDataStatus() === 'ready';

vi.mock('../../../../data', async (importOriginal) => ({
  ...(await importOriginal()),
  BASE_PATH: '',
  FOUNDATION: 'Foundation',
  HIDE_ORGANIZATION_SECTION_IN_PROJECTS: false,
}));
vi.mock('../../../../utils/itemsDataGetter', () => ({
  default: {
    getItemById: vi.fn(),
    getItemByName: vi.fn(),
  },
}));
vi.mock('../../../stores/fullData', () => ({
  useFullDataReady: () => mockFullDataReady,
  useFullDataStatus: () => mockFullDataStatus,
  useRetryFullData: () => mockRetryFullData,
}));
vi.mock('../../../stores/upcomingEvent', () => ({
  useEventVisibleContent: () => () => false,
}));

const getItemByIdMock = vi.mocked(itemsDataGetter.getItemById);
const getItemByNameMock = vi.mocked(itemsDataGetter.getItemByName);

describe('ItemModal', () => {
  beforeEach(() => {
    mockSetFullDataStatus('ready');
    mockRetryFullData.mockReset();
    getItemByIdMock.mockReset();
    getItemByNameMock.mockReset();
    getItemByIdMock.mockReturnValue(createItem({ id: 'item', name: 'Loaded Item' }));
    setViewportWidth(DESKTOP_WIDTH);
  });

  afterEach(() => {
    setViewportWidth(DESKTOP_WIDTH);
  });

  it('renders nothing when no item is selected', () => {
    renderItemModal('/');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getItemByIdMock).not.toHaveBeenCalled();
  });

  it('keeps Loading while the full data is not ready, then shows the item', () => {
    // Render the modal while the full data is loading
    mockSetFullDataStatus('loading');
    renderItemModal('/?item=item');
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    expect(getItemByIdMock).not.toHaveBeenCalled();

    // Check Loading stays while the full data keeps loading
    mockSetFullDataStatus('loading');
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    expect(screen.queryByText('Loaded Item')).toBeNull();

    // Make the full data ready and check the item is shown
    mockSetFullDataStatus('ready');
    expect(screen.getByText('Loaded Item')).toBeInTheDocument();
    expect(getItemByIdMock).toHaveBeenCalledWith('item');
  });

  it('shows the desktop content with the item options on large screens', () => {
    renderItemModal('/?item=item');

    expect(screen.getByText('Loaded Item')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Item options' })).toBeInTheDocument();
  });

  it('shows the mobile content on small screens', () => {
    setViewportWidth(MOBILE_WIDTH);

    renderItemModal('/?item=item');

    expect(screen.getByText('Loaded Item')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Item options' })).toBeNull();
  });

  it('passes the parent project information of a subproject', () => {
    // Return a subproject and its parent project
    getItemByIdMock.mockReturnValue(createItem({ id: 'item', name: 'Subproject', parent_project: 'Parent' }));
    getItemByNameMock.mockReturnValue(createItem({ id: 'parent', maturity: 'graduated', name: 'Parent' }));

    // Render the modal for the subproject
    renderItemModal('/?item=item');

    // Check the parent project is looked up and described
    expect(getItemByNameMock).toHaveBeenCalledWith('Parent');
    expect(screen.getByText('Parent project')).toBeInTheDocument();
    expect(screen.getByText(/Subproject is a subproject of Parent/)).toHaveTextContent(
      'Subproject is a subproject of Parent, a Foundation project.'
    );
  });

  it('shows the missing item message for an unknown id, then the next selected item', async () => {
    const user = userEvent.setup();
    getItemByIdMock.mockImplementation((id) => (id === 'item' ? createItem({ id, name: 'Loaded Item' }) : undefined));

    // Render the modal for an unknown item
    renderItemModal('/?item=missing');
    expect(screen.getByText("We couldn't find this item.")).toBeInTheDocument();

    // Open a known item and check it replaces the message
    await user.click(screen.getByRole('button', { name: 'Open item' }));
    expect(screen.getByText('Loaded Item')).toBeInTheDocument();
    expect(screen.queryByText("We couldn't find this item.")).not.toBeInTheDocument();
  });

  it('shows the load error with a retry when the full data fails to load', async () => {
    const user = userEvent.setup();

    // Render the modal after the full data failed to load
    mockSetFullDataStatus('error');
    renderItemModal('/?item=item');
    expect(screen.getByText("We couldn't load the item details.")).toBeInTheDocument();

    // Click "Try again" and check the full data load is retried
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRetryFullData).toHaveBeenCalledTimes(1);
  });

  it('removes the item from the URL when a deep-linked item is closed', async () => {
    const user = userEvent.setup();

    // Render the modal from a deep link
    const { history } = renderItemModal('/?group=g1&item=item#section');
    expect(screen.getByText('Loaded Item')).toBeInTheDocument();

    // Close it through the modal close button
    await user.click(screen.getByRole('button', { name: 'Close' }));

    // Check the item param is gone and the other params and the hash are kept
    expect(history.get()).toBe('/?group=g1#section');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('goes back to the previous entry when an item opened in the app is closed', async () => {
    const user = userEvent.setup();

    // Open an item from the app
    const { history } = renderItemModal('/?group=g1');
    await user.click(screen.getByRole('button', { name: 'Open item' }));
    expect(history.get()).toBe('/?group=g1&item=item');
    expect(screen.getByText('Loaded Item')).toBeInTheDocument();

    // Close it through the modal close button
    await user.click(screen.getByRole('button', { name: 'Close' }));

    // Check the entry the item was opened from is back
    await vi.waitFor(() => expect(history.get()).toBe('/?group=g1'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

// Helpers.

/** Button that opens the `item` item from the app, as the explore items do. */
const OpenItemButton = () => {
  const updateActiveItemId = useUpdateActiveItemId();
  return (
    <button type="button" onClick={() => updateActiveItemId('item')}>
      Open item
    </button>
  );
};

/** Renders the modal and a button that opens an item, inside the router and the active item store. */
const renderItemModal = (url: string) =>
  renderWithRouter(
    () => (
      <ActiveItemProvider>
        <OpenItemButton />
        <ItemModal />
      </ActiveItemProvider>
    ),
    { url }
  );

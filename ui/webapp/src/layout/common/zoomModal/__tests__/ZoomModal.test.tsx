import { render, screen, within } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createItem } from 'common/test-utils';
import { createSignal } from 'solid-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LandscapeItem } from '../../../../types';
import itemsDataGetter from '../../../../utils/itemsDataGetter';
import ZoomModal from '../index';

const [mockFullDataStatus, mockSetFullDataStatus] = createSignal<'error' | 'loading' | 'ready'>('ready');
const mockFullDataReady = () => mockFullDataStatus() === 'ready';
const mockSetVisibleZoom = vi.hoisted(() => vi.fn());

vi.mock('../../../../utils/itemsDataGetter', () => ({
  default: {
    getItemsBySection: vi.fn(),
  },
}));
vi.mock('../../../explore/grid/GridItem', () => ({
  default: (props: { item: LandscapeItem }) => <div>{props.item.name}</div>,
}));
vi.mock('../../../stores/fullData', () => ({
  useFullDataReady: () => mockFullDataReady,
  useFullDataStatus: () => mockFullDataStatus,
  useRetryFullData: () => vi.fn(),
}));
vi.mock('../../../stores/visibleZoomSection', () => ({
  useSetVisibleZoom: () => mockSetVisibleZoom,
  useVisibleZoom: () => () => ({
    bgColor: '#000',
    category: 'Category',
    subcategory: 'Subcategory',
  }),
}));

const getItemsBySectionMock = vi.mocked(itemsDataGetter.getItemsBySection);

describe('ZoomModal', () => {
  beforeEach(() => {
    mockSetFullDataStatus('ready');
    mockSetVisibleZoom.mockReset();
    getItemsBySectionMock.mockReset();
    getItemsBySectionMock.mockReturnValue([createItem()]);
  });

  it('is titled after the category and subcategory of the section', () => {
    render(() => <ZoomModal />);

    const dialog = screen.getByRole('dialog', { name: 'Category / Subcategory modal' });
    expect(within(dialog).getByText('Category')).toBeInTheDocument();
    expect(within(dialog).getByText('Subcategory')).toBeInTheDocument();
  });

  it('lists the section items sorted by their featured order', () => {
    // Return the section items out of featured order
    getItemsBySectionMock.mockReturnValue([
      createItem({ id: 'plain', name: 'Plain' }),
      createItem({ featured: { order: 2 }, id: 'second', name: 'Second' }),
      createItem({ featured: { order: 1 }, id: 'first', name: 'First' }),
    ]);

    // Render the modal for the visible zoom section
    render(() => <ZoomModal />);

    // Check the items of that section are requested
    expect(getItemsBySectionMock).toHaveBeenCalledWith({
      bgColor: '#000',
      category: 'Category',
      subcategory: 'Subcategory',
    });

    // Check featured items come first, in their featured order
    const names = ['First', 'Second', 'Plain'].map((name) => screen.getByText(name));
    expect(names[0].compareDocumentPosition(names[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(names[1].compareDocumentPosition(names[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows NoData when the section has no items', () => {
    getItemsBySectionMock.mockReturnValue([]);

    render(() => <ZoomModal />);

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't find any items in this section.");
  });

  it('shows the load error with a retry when the full data fails to load', () => {
    mockSetFullDataStatus('error');

    render(() => <ZoomModal />);

    expect(screen.getByText("We couldn't load the items of this section.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('clears the visible zoom section when closed', async () => {
    const user = userEvent.setup();
    render(() => <ZoomModal />);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(mockSetVisibleZoom).toHaveBeenCalledTimes(1);
    expect(mockSetVisibleZoom).toHaveBeenCalledWith();
  });

  it('closes on a click outside of the section, but not inside it', async () => {
    const user = userEvent.setup();
    render(() => <ZoomModal />);

    // Click an item inside the section
    await user.click(screen.getByText('Test Item'));
    expect(mockSetVisibleZoom).not.toHaveBeenCalled();

    // Click the backdrop around the section
    await user.click(screen.getByRole('dialog'));
    expect(mockSetVisibleZoom).toHaveBeenCalledTimes(1);
  });
});

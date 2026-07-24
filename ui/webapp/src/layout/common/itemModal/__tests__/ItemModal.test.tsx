import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';

import type { Item } from '../../../../types';
import itemsDataGetter from '../../../../utils/itemsDataGetter';
import ItemModal from '..';

const mockUpdateActiveItemId = jest.fn();
const [mockVisibleItemId, mockSetVisibleItemId] = createSignal<string>();

jest.mock('../../../../data', () => ({
  BASE_PATH: '',
  FOUNDATION: 'Foundation',
  HIDE_ORGANIZATION_SECTION_IN_PROJECTS: false,
  ITEM_VIEW: 'item-view',
  SMALL_DEVICES_BREAKPOINTS: [],
}));
jest.mock('../../../../utils/itemsDataGetter', () => ({
  __esModule: true,
  default: {
    getItemById: jest.fn(),
    getItemByName: jest.fn(),
  },
}));
jest.mock('../../../stores/activeItem', () => ({
  useActiveItemId: () => mockVisibleItemId,
  useUpdateActiveItemId: () => mockUpdateActiveItemId,
}));
jest.mock('../../../stores/fullData', () => ({
  useFullDataReady: () => () => true,
}));
jest.mock('../../../stores/upcomingEventData', () => ({
  useEventVisibleContent: () => () => undefined,
}));

const getItemByIdMock = itemsDataGetter.getItemById as unknown as jest.MockedFunction<
  (itemId: string) => Promise<Item | undefined>
>;

describe('ItemModal', () => {
  let container: HTMLDivElement;
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    dispose = undefined;
    getItemByIdMock.mockReset();
    mockSetVisibleItemId(undefined);
    mockUpdateActiveItemId.mockReset();
  });

  afterEach(() => {
    dispose?.();
    document.body.replaceChildren();
  });

  it('should distinguish loading, missing, and subsequent valid items', async () => {
    const missingItem = createDeferredPromise<Item | undefined>();
    getItemByIdMock.mockReturnValueOnce(missingItem.promise).mockResolvedValueOnce({ id: 'valid' } as Item);
    mockSetVisibleItemId('missing');
    dispose = render(() => <ItemModal />, container);

    expect(container.textContent).toContain('Loading...');

    missingItem.resolve(undefined);
    await flushPromises();
    expect(container.textContent).toContain("We couldn't find this item.");

    mockSetVisibleItemId('valid');
    expect(container.textContent).toContain('Loading...');
    await flushPromises();

    expect(container.textContent).toContain('Item content');
    expect(container.textContent).not.toContain("We couldn't find this item.");
  });

  it('should ignore an older item request after the selection changes', async () => {
    const firstItem = createDeferredPromise<Item | undefined>();
    const secondItem = createDeferredPromise<Item | undefined>();
    getItemByIdMock.mockReturnValueOnce(firstItem.promise).mockReturnValueOnce(secondItem.promise);
    mockSetVisibleItemId('first');
    dispose = render(() => <ItemModal />, container);

    mockSetVisibleItemId('second');
    secondItem.resolve({ id: 'second' } as Item);
    await flushPromises();
    expect(container.textContent).toContain('Item content');

    firstItem.resolve(undefined);
    await flushPromises();
    expect(container.textContent).toContain('Item content');
    expect(container.textContent).not.toContain("We couldn't find this item.");
  });
});

const createDeferredPromise = <Value,>() => {
  let resolvePromise!: (value: Value) => void;
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

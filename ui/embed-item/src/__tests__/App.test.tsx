import { render } from 'solid-js/web';

import App from '../App';

const mockFetchItems = jest.fn<Promise<void>, unknown[]>();
const mockGetItemById = jest.fn();

jest.mock('../utils/itemsDataGetter', () => ({
  __esModule: true,
  default: {
    fetchItems: (...arguments_: unknown[]) => mockFetchItems(...arguments_),
    getItemById: (...arguments_: unknown[]) => mockGetItemById(...arguments_),
  },
}));

jest.mock('../common/ItemModal', () => {
  const { createEffect } = jest.requireActual<typeof import('solid-js')>('solid-js');

  return {
    __esModule: true,
    default: (props: {
      activeItemId: string;
      itemInfo?: { id: string };
      itemLoadStatus: string;
      onClose: () => void;
      onRetry: () => void;
    }) => {
      const wrapper = globalThis.document.createElement('div');
      const status = globalThis.document.createElement('div');
      const itemId = globalThis.document.createElement('div');
      const retryButton = globalThis.document.createElement('button');
      const closeButton = globalThis.document.createElement('button');

      status.dataset.testid = 'status';
      itemId.dataset.testid = 'item-id';
      retryButton.textContent = 'Retry';
      retryButton.addEventListener('click', () => props.onRetry());
      closeButton.textContent = 'Close';
      closeButton.addEventListener('click', () => props.onClose());
      wrapper.append(status, itemId, retryButton, closeButton);

      createEffect(() => {
        status.textContent = props.itemLoadStatus;
        itemId.textContent = props.itemInfo?.id ?? '';
      });

      return wrapper;
    },
  };
});

describe('embed item App', () => {
  let container: HTMLDivElement;
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    dispose = render(() => <App />, container);
    mockFetchItems.mockReset();
    mockGetItemById.mockReset();
  });

  afterEach(() => {
    dispose?.();
    document.body.replaceChildren();
  });

  it('should expose recoverable loading, error, and not-found states', async () => {
    mockFetchItems.mockRejectedValueOnce(new Error('Unavailable'));
    showItem('item-a');

    expect(getStatus()).toBe('loading');
    await flushPromises();
    expect(getStatus()).toBe('error');

    mockFetchItems.mockResolvedValueOnce(undefined);
    mockGetItemById.mockReturnValueOnce({ id: 'item-a' });
    clickButton('Retry');
    expect(getStatus()).toBe('loading');
    await flushPromises();
    expect(getStatus()).toBe('ready');
    expect(getItemId()).toBe('item-a');

    mockFetchItems.mockResolvedValueOnce(undefined);
    mockGetItemById.mockReturnValueOnce(undefined);
    showItem('missing-item');
    expect(getStatus()).toBe('loading');
    await flushPromises();
    expect(getStatus()).toBe('not-found');
  });

  it('should ignore stale requests after another item is selected', async () => {
    const firstRequest = createDeferred<void>();
    const secondRequest = createDeferred<void>();
    mockFetchItems.mockReturnValueOnce(firstRequest.promise).mockReturnValueOnce(secondRequest.promise);

    showItem('item-a');
    showItem('item-b');
    mockGetItemById.mockReturnValueOnce({ id: 'item-b' });

    secondRequest.resolve();
    await flushPromises();
    expect(getStatus()).toBe('ready');
    expect(getItemId()).toBe('item-b');

    firstRequest.resolve();
    await flushPromises();
    expect(getStatus()).toBe('ready');
    expect(getItemId()).toBe('item-b');
    expect(mockGetItemById).toHaveBeenCalledTimes(1);
  });
});

const showItem = (itemId: string) => {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: {
        basePath: '/landscape',
        classifyBy: 'category',
        foundation: 'cncf',
        itemId,
        key: 'key',
        type: 'showItemDetails',
      },
      source: window,
    })
  );
};

const getStatus = () => document.querySelector<HTMLElement>('[data-testid="status"]')?.textContent;

const getItemId = () => document.querySelector<HTMLElement>('[data-testid="item-id"]')?.textContent;

const clickButton = (text: string) => {
  const button = Array.from(document.querySelectorAll('button')).find((element) => element.textContent === text);
  button?.click();
};

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

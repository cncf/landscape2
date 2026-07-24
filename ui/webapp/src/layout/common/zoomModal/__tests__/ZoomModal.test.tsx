import { Accessor, JSXElement } from 'solid-js';
import { render } from 'solid-js/web';

import itemsDataGetter from '../../../../utils/itemsDataGetter';
import ZoomModal from '../index';

let mockInitialRefs: Accessor<HTMLElement>[] | undefined;

jest.mock(
  '@solid-primitives/resize-observer',
  () => ({
    createElementSize: () => ({ width: null }),
  }),
  { virtual: true }
);
jest.mock('../../../../data', () => ({
  ITEM_VIEW: 'item-view',
  ZOOM_LEVELS: { 10: [100, 100] },
}));
jest.mock('../../../../utils/itemsDataGetter', () => ({
  __esModule: true,
  default: {
    getItemsBySection: jest.fn(),
  },
}));
jest.mock('../../../explore/grid/GridItem', () => ({
  __esModule: true,
  default: () => globalThis.document.createElement('div'),
}));
jest.mock('../../../stores/fullData', () => ({
  useFullDataReady: () => () => true,
}));
jest.mock('../../../stores/visibleZoomSection', () => ({
  useSetVisibleZoom: () => jest.fn(),
  useVisibleZoom: () => () => ({
    bgColor: '#000',
    category: 'Category',
    subcategory: 'Subcategory',
  }),
}));
jest.mock('../../FullScreenModal', () => ({
  __esModule: true,
  default: (props: { children: JSXElement; initialRefs?: Accessor<HTMLElement>[] }) => {
    mockInitialRefs = props.initialRefs;
    return <>{props.children}</>;
  },
}));

const getItemsBySectionMock = itemsDataGetter.getItemsBySection as jest.MockedFunction<
  typeof itemsDataGetter.getItemsBySection
>;

describe('ZoomModal', () => {
  let container: HTMLDivElement;
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    dispose = undefined;
    mockInitialRefs = undefined;
    getItemsBySectionMock.mockReset();
    getItemsBySectionMock.mockReturnValue([]);
  });

  afterEach(() => {
    dispose?.();
    document.body.replaceChildren();
  });

  it('should provide an outside-click ref before the modal content mounts', async () => {
    dispose = render(() => <ZoomModal />, container);
    await flushPromises();

    expect(mockInitialRefs).toHaveLength(1);
    expect(mockInitialRefs![0]()).toBeInstanceOf(HTMLDivElement);
  });
});

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

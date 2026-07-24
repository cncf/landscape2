import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';

import Layout from '..';

const [mockFullDataStatus, mockSetFullDataStatus] = createSignal<'error' | 'loading' | 'ready'>('loading');

jest.mock('../common/itemModal', () => ({ __esModule: true, default: () => mockCreateElement('Item modal') }));
jest.mock('../common/zoomModal', () => ({ __esModule: true, default: () => mockCreateElement('Zoom modal') }));
jest.mock('../navigation/Header', () => ({ __esModule: true, default: () => mockCreateElement('Header') }));
jest.mock('../navigation/MobileHeader', () => ({
  __esModule: true,
  default: () => mockCreateElement('Mobile header'),
}));
jest.mock('../stores/activeItem', () => ({ ActiveItemProvider: mockProvider }));
jest.mock('../stores/financesData', () => ({ FinancesDataProvider: mockProvider }));
jest.mock('../stores/fullData', () => ({
  FullDataProvider: mockProvider,
  useFullDataStatus: () => mockFullDataStatus,
  useRetryFullData: () => jest.fn(),
}));
jest.mock('../stores/gridWidth', () => ({ GridWidthProvider: mockProvider }));
jest.mock('../stores/groupActive', () => ({ GroupActiveProvider: mockProvider }));
jest.mock('../stores/guideFile', () => ({ GuideFileProvider: mockProvider }));
jest.mock('../stores/mobileTOC', () => ({ MobileTOCProvider: mockProvider }));
jest.mock('../stores/upcomingEventData', () => ({ EventsProvider: mockProvider }));
jest.mock('../stores/viewMode', () => ({ ViewModeProvider: mockProvider }));
jest.mock('../stores/visibleZoomSection', () => ({ VisibleZoomSectionProvider: mockProvider }));
jest.mock('../stores/zoom', () => ({ ZoomProvider: mockProvider }));
jest.mock('../upcomingEvents', () => ({ __esModule: true, default: () => mockCreateElement('Upcoming events') }));

describe('Layout', () => {
  let container: HTMLDivElement;
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    dispose = undefined;
    window.statsDS = {};
    mockSetFullDataStatus('loading');
  });

  afterEach(() => {
    dispose?.();
    document.body.replaceChildren();
  });

  it('should hide full-data modals when loading fails', () => {
    dispose = render(
      () => (
        <Layout>
          <div>Route content</div>
        </Layout>
      ),
      container
    );

    expect(container.textContent).toContain('Route content');
    expect(container.textContent).toContain('Item modal');
    expect(container.textContent).toContain('Zoom modal');

    mockSetFullDataStatus('error');

    expect(container.textContent).toContain("We couldn't load the landscape data.");
    expect(container.textContent).not.toContain('Route content');
    expect(container.textContent).not.toContain('Item modal');
    expect(container.textContent).not.toContain('Zoom modal');
    expect(container.textContent).toContain('Header');
  });
});

function mockProvider(props: { children: unknown }) {
  return <>{props.children}</>;
}

function mockCreateElement(text: string) {
  const element = document.createElement('div');
  element.textContent = text;
  return element;
}

import { screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { createSignal } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../../../test-utils/fixtures';
import { renderWithRouter } from '../../../../test-utils/render';
import { CardMenu } from '../../../../types';
import Menu from '../Menu';
import styles from '../Menu.module.css';

const resizeObservers: MockResizeObserver[] = [];
// jsdom has no scrollIntoView, which Menu uses to keep the selected option visible on shrink
const scrollIntoViewMock = vi.fn();

describe('Menu', () => {
  let landscape: HTMLElement;
  let footer: HTMLElement;
  let frames: FrameRequestCallback[];
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    // Setup the page elements the sticky menu measures and a manual animation frame queue
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    window.baseDS = createBaseData({
      categories: [
        {
          name: 'Category 1',
          normalized_name: 'category-1',
          subcategories: [
            { name: 'Sub 1', normalized_name: 'sub-1' },
            { name: 'Sub 2', normalized_name: 'sub-2' },
          ],
        },
      ],
    });
    landscape = document.createElement('div');
    landscape.id = 'landscape';
    footer = document.createElement('footer');
    footer.setAttribute('role', 'contentinfo');
    document.body.append(landscape, footer);
    frames = [];
    resizeObservers.length = 0;
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => frames.push(callback))
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    landscape.remove();
    footer.remove();
    document.body.classList.remove('motd-visible');
    document.documentElement.style.removeProperty('--motd-height');
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
    scrollIntoViewMock.mockReset();
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it('updates its height once per frame and only on its own element', () => {
    const { container } = renderWithRouter(() => <Menu menu={{ 'Category 1': ['Sub 1'] }} isVisible sticky />);
    const menu = container.firstElementChild as HTMLElement;

    // Scroll several times before the next frame
    landscape.dispatchEvent(new Event('scroll'));
    landscape.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));

    // Check the updates share one frame and the height is set on the menu
    expect(frames).toHaveLength(1);
    menu.style.removeProperty('--menu-max-height');
    frames[0](0);
    expect(menu.style.getPropertyValue('--menu-max-height')).not.toBe('');
    expect(document.documentElement.style.getPropertyValue('--menu-max-height')).toBe('');
    expect(screen.getByRole('button', { name: 'Sub 1' })).toBeInTheDocument();
  });

  it('measures from the sticky root instead of the scrolled inner list and only contains overscroll when overflowing', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(rectWithTop(2000));

    const { container } = renderWithRouter(() => <Menu menu={{ 'Category 1': ['Sub 1'] }} isVisible sticky />);
    const menuRoot = container.firstElementChild as HTMLElement;
    const menuContent = container.querySelector('#menu') as HTMLElement;
    const innerSection = menuContent.firstElementChild as HTMLElement;

    // Simulate a tall sticky menu stuck at 88px whose internal list has scrolled 1200px upward
    menuRoot.style.top = '88px';
    vi.spyOn(menuRoot, 'getBoundingClientRect').mockReturnValue(rectWithTop(88));
    vi.spyOn(innerSection, 'getBoundingClientRect').mockReturnValue(rectWithTop(-1112));
    let contentScrollHeight = 1400;
    Object.defineProperty(menuContent, 'scrollHeight', { configurable: true, get: () => contentScrollHeight });

    landscape.dispatchEvent(new Event('scroll'));
    frames.shift()!(0);

    // Check max-height uses the sticky root top (900 - 88 - 16 = 796) and enables overscroll containment
    expect(menuRoot.style.getPropertyValue('--menu-max-height')).toBe('796px');
    expect(menuContent).toHaveClass(styles.content);
    expect(menuContent).toHaveClass(styles.containOverscroll);

    // A short menu that fits inside max-height keeps overflow-y: auto but releases overscroll containment
    contentScrollHeight = 140;
    landscape.dispatchEvent(new Event('scroll'));
    frames.shift()!(0);
    expect(menuContent).toHaveClass(styles.content);
    expect(menuContent).not.toHaveClass(styles.containOverscroll);
  });

  it('shrinks to fit between the sticky offset and the footer margin even below 200px', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    footer.style.marginTop = '24px';
    let footerTop = 500;
    vi.spyOn(footer, 'getBoundingClientRect').mockImplementation(() => rectWithTop(footerTop));

    const { container } = renderWithRouter(() => <Menu menu={{ 'Category 1': ['Sub 1'] }} isVisible sticky />);
    const menuRoot = container.firstElementChild as HTMLElement;

    // Simulate jumping to the bottom so the sticky box is momentarily pushed above its 88px top offset
    menuRoot.style.top = '88px';
    vi.spyOn(menuRoot, 'getBoundingClientRect').mockReturnValue(rectWithTop(-200));

    landscape.dispatchEvent(new Event('scroll'));
    frames.shift()!(0);

    // Check max-height accounts for the footer's 24px top margin (500 - 24 - 88 = 388)
    expect(menuRoot.style.getPropertyValue('--menu-max-height')).toBe('388px');

    // In a short viewport where less than 200px remains above the footer, shrink below 200px instead of sliding under the header
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 450 });
    menuRoot.style.top = '132px';
    footerTop = 230;
    landscape.dispatchEvent(new Event('scroll'));
    frames.shift()!(0);
    expect(menuRoot.style.getPropertyValue('--menu-max-height')).toBe('74px');

    // When the footer top scrolls past 0 on a short viewport, stay collapsed at 0px instead of jumping back to 200px
    footerTop = -50;
    landscape.dispatchEvent(new Event('scroll'));
    frames.shift()!(0);
    expect(menuRoot.style.getPropertyValue('--menu-max-height')).toBe('0px');

    // Transition smoothly once the footer's 24px top margin enters the viewport bottom
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    menuRoot.style.top = '88px';
    footerTop = 900;
    landscape.dispatchEvent(new Event('scroll'));
    frames.shift()!(0);
    expect(menuRoot.style.getPropertyValue('--menu-max-height')).toBe('788px');
  });

  it('keeps the selected option in view when the menu shrinks above the footer', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    footer.style.marginTop = '24px';
    let footerTop = 2000;
    vi.spyOn(footer, 'getBoundingClientRect').mockImplementation(() => rectWithTop(footerTop));

    const { container } = renderWithRouter(
      () => <Menu menu={{ 'Category 1': ['Sub 1', 'Sub 2'] }} isVisible sticky />,
      { url: '/#category-1--sub-2' }
    );
    const menuRoot = container.firstElementChild as HTMLElement;
    menuRoot.style.top = '88px';
    vi.spyOn(menuRoot, 'getBoundingClientRect').mockReturnValue(rectWithTop(88));

    // Initial scroll with footer out of view does not shrink from a previous value
    landscape.dispatchEvent(new Event('scroll'));
    frames.shift()!(0);
    expect(menuRoot.style.getPropertyValue('--menu-max-height')).toBe('796px');
    scrollIntoViewMock.mockClear();

    // Footer enters view and shrinks the menu: the selected button is scrolled into view
    footerTop = 600;
    landscape.dispatchEvent(new Event('scroll'));
    frames.shift()!(0);
    expect(menuRoot.style.getPropertyValue('--menu-max-height')).toBe('488px');
    const selectedButton = screen.getByRole('button', { name: 'Sub 2' });
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: 'nearest' });
    expect(scrollIntoViewMock.mock.contexts).toContain(selectedButton);
  });

  it('re-checks overflow when menu entries change without a scroll or resize event', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(rectWithTop(2000));
    const [menuData, setMenuData] = createSignal<CardMenu>({ 'Category 1': ['Sub 1'] });

    const { container } = renderWithRouter(() => <Menu menu={menuData()} isVisible sticky />);
    const menuRoot = container.firstElementChild as HTMLElement;
    const menuContent = container.querySelector('#menu') as HTMLElement;
    menuRoot.style.top = '88px';
    vi.spyOn(menuRoot, 'getBoundingClientRect').mockReturnValue(rectWithTop(88));
    let contentScrollHeight = 140;
    Object.defineProperty(menuContent, 'scrollHeight', { configurable: true, get: () => contentScrollHeight });

    // Start short: no overscroll containment
    expect(menuContent).not.toHaveClass(styles.containOverscroll);

    // Menu entries grow without any scroll or resize event
    contentScrollHeight = 1400;
    setMenuData({ 'Category 1': ['Sub 1', 'Sub 2'] });
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(menuContent).toHaveClass(styles.containOverscroll);
  });

  it('re-measures when layout changes without a scroll event, even with a leading MOTD banner', async () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    let footerTop = 300;
    vi.spyOn(footer, 'getBoundingClientRect').mockImplementation(() => rectWithTop(footerTop));

    // Place a fixed banner ahead of the layout inside #landscape, matching App.tsx when MOTD/overlay is active
    landscape.remove();
    renderWithRouter(() => (
      <div id="landscape" data-testid="landscape">
        <div data-testid="banner" />
        <main>
          <div data-testid="filters" />
          <div class="d-flex">
            <Menu menu={{ 'Category 1': ['Sub 1'] }} isVisible sticky />
            <div data-testid="cards" />
          </div>
        </main>
      </div>
    ));
    const mountedLandscape = screen.getByTestId('landscape');
    const banner = screen.getByTestId('banner');
    const filters = screen.getByTestId('filters');
    const cards = screen.getByTestId('cards');
    const menuRoot = cards.previousElementSibling as HTMLElement;
    menuRoot.style.top = '88px';
    let rootTop = 180;
    vi.spyOn(menuRoot, 'getBoundingClientRect').mockImplementation(() => rectWithTop(rootTop));

    // Check the observer watches the real layout siblings and not the leading banner or menu root
    expect(resizeObservers[0].targets).toContain(mountedLandscape);
    expect(resizeObservers[0].targets).toContain(footer);
    expect(resizeObservers[0].targets).toContain(filters);
    expect(resizeObservers[0].targets).toContain(cards);
    expect(resizeObservers[0].targets).not.toContain(banner);
    expect(resizeObservers[0].targets).not.toContain(menuRoot);

    // Cards finish loading and push the footer below the viewport
    footerTop = 5000;
    resizeObservers[0].trigger(cards);
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(menuRoot.style.getPropertyValue('--menu-max-height')).toBe('704px');

    // Filter badges wrap and shift the sticky box down without changing card height
    rootTop = 240;
    resizeObservers[0].trigger(filters);
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(menuRoot.style.getPropertyValue('--menu-max-height')).toBe('644px');

    // MOTD banner appears and updates --motd-height on documentElement
    rootTop = 280;
    document.body.classList.add('motd-visible');
    await Promise.resolve();
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(menuRoot.style.getPropertyValue('--menu-max-height')).toBe('604px');

    rootTop = 300;
    document.documentElement.style.setProperty('--motd-height', '60px');
    await Promise.resolve();
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(menuRoot.style.getPropertyValue('--menu-max-height')).toBe('584px');
  });

  it('cancels the pending frame when unmounted', () => {
    const { unmount } = renderWithRouter(() => <Menu menu={{ 'Category 1': ['Sub 1'] }} isVisible sticky />);

    // Schedule an update and unmount before the frame runs
    landscape.dispatchEvent(new Event('scroll'));
    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(resizeObservers[0].disconnected).toBe(true);
  });

  it('stops scheduling updates from listeners and observers after unmount', async () => {
    const { unmount } = renderWithRouter(() => <Menu menu={{ 'Category 1': ['Sub 1'] }} isVisible sticky />);

    // Unmount with no pending frame so any leaked listener or observer would queue a new frame
    unmount();

    landscape.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    document.body.classList.add('motd-visible');
    document.documentElement.style.setProperty('--motd-height', '44px');
    await Promise.resolve();

    expect(resizeObservers[0].disconnected).toBe(true);
    expect(frames).toHaveLength(0);
  });

  it('does not apply sticky scroll classes when sticky is false', () => {
    const { container } = renderWithRouter(() => <Menu menu={{ 'Category 1': ['Sub 1'] }} isVisible sticky={false} />);
    const menuContent = container.querySelector('#menu') as HTMLElement;

    expect(menuContent).not.toHaveClass(styles.content);
    expect(menuContent).not.toHaveClass(styles.containOverscroll);
  });

  it('marks the section of a percent-encoded non-ASCII hash as selected', async () => {
    const user = userEvent.setup();
    // The second "о" of "adоpter" is Cyrillic (U+043E), as in the OSPO landscape
    window.baseDS = createBaseData({
      categories: [
        {
          name: 'OSPO Adopter',
          normalized_name: 'ospo-adopter',
          subcategories: [
            { name: 'First', normalized_name: 'first' },
            { name: 'OSPO Adоpter', normalized_name: 'ospo-adоpter' },
          ],
        },
      ],
    });

    // Render the menu at the section hash, percent-encoded as the browser gives it
    const { history } = renderWithRouter(
      () => <Menu menu={{ 'OSPO Adopter': ['First', 'OSPO Adоpter'] }} isVisible sticky />,
      { url: '/#ospo-adopter--ospo-ad%D0%BEpter' }
    );

    // Check its option is the selected one
    expect(screen.getByRole('button', { name: 'OSPO Adоpter' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'First' })).toBeEnabled();

    // Select the first subcategory and check the hash and the selection follow
    await user.click(screen.getByRole('button', { name: 'First' }));
    expect(new URL(history.get(), 'http://localhost').hash).toBe('#ospo-adopter--first');
    expect(screen.getByRole('button', { name: 'First' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'OSPO Adоpter' })).toBeEnabled();
  });

  it('renders fallback subcategories of declared categories and omits unanchored entries', () => {
    // Render a menu with a declared category's undeclared subcategory, an empty-normalizing one, and an unknown category
    renderWithRouter(
      () => (
        <Menu
          menu={{
            'Category 1': ['Sub 1', 'Undeclared Sub', '---'],
            'Only Unknown': ['Unknown Sub'],
          }}
          isVisible
          sticky
        />
      ),
      { url: '/' }
    );

    // Check declared and fallback entries are rendered while unanchored entries are omitted
    expect(screen.getByText('Category 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sub 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undeclared Sub' })).toHaveAttribute(
      'id',
      'btn_category-1--undeclared-sub'
    );
    expect(screen.queryByRole('button', { name: '---' })).not.toBeInTheDocument();
    expect(screen.queryByText('Only Unknown')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unknown Sub' })).not.toBeInTheDocument();
  });

  it('renders nothing when no menu entry resolves to an anchor', () => {
    // Render a menu whose only category has no defined anchor
    const { container } = renderWithRouter(() => <Menu menu={{ 'Only Unknown': ['Unknown Sub'] }} isVisible sticky />, {
      url: '/',
    });

    // Check the sidebar container is not rendered
    expect(container).toBeEmptyDOMElement();
  });
});

/** `ResizeObserver` the tests trigger by hand. */
class MockResizeObserver implements ResizeObserver {
  public disconnected = false;
  public readonly targets = new Set<Element>();

  constructor(private callback: ResizeObserverCallback) {
    resizeObservers.push(this);
  }

  public disconnect() {
    this.disconnected = true;
    this.targets.clear();
  }

  public observe(target: Element) {
    this.targets.add(target);
  }

  public trigger(target?: Element) {
    if (this.targets.size === 0) return;
    const targets = target ? (this.targets.has(target) ? [target] : []) : [...this.targets];
    if (targets.length === 0) return;
    const entries = targets.map((el) => ({ target: el }) as ResizeObserverEntry);
    this.callback(entries, this);
  }

  public unobserve(target: Element) {
    this.targets.delete(target);
  }
}

/** Builds a minimal `DOMRect` with the given top offset and height. */
const rectWithTop = (top: number, height = 200): DOMRect =>
  ({
    bottom: top + height,
    height,
    left: 0,
    right: 0,
    toJSON: () => ({}),
    top,
    width: 0,
    x: 0,
    y: top,
  }) as DOMRect;

import { fireEvent, render, screen } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import { Breakpoint } from 'common';
import { createSignal, type Setter } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import scrollToTop from '../../../utils/scrollToTop';
import ButtonToTopScroll from '../ButtonToTopScroll';

/** Scroll offset past which the button shows (`NAV_HEIGHT` in the component). */
const THRESHOLD = 200;

/** Breakpoint accessor the mocked `useBreakpointDetect` returns, replaced before each test. */
const breakpoint = vi.hoisted(() => ({ point: (): string => 'xl' }));

vi.mock('common', async (importOriginal) => ({
  ...(await importOriginal()),
  useBreakpointDetect: () => ({ point: breakpoint.point }),
}));
vi.mock('../../../utils/scrollToTop', () => ({ default: vi.fn() }));

describe('ButtonToTopScroll', () => {
  let landscape: HTMLDivElement;
  let setPoint: Setter<Breakpoint>;

  beforeEach(() => {
    const [point, setter] = createSignal<Breakpoint>(Breakpoint.XL);
    breakpoint.point = point;
    setPoint = setter;
    landscape = document.createElement('div');
    landscape.id = 'landscape';
    document.body.appendChild(landscape);
  });

  afterEach(() => {
    landscape.remove();
    scrollWindow(0);
  });

  it('shows the button only when the landscape container is scrolled past the threshold', () => {
    render(() => <ButtonToTopScroll />);
    const wrapper = buttonWrapper();
    expect(wrapper).toHaveClass('d-none');

    // Scroll below the threshold
    scrollElement(landscape, THRESHOLD);
    expect(wrapper).toHaveClass('d-none');

    // Scroll above the threshold
    scrollElement(landscape, THRESHOLD + 1);
    expect(wrapper).not.toHaveClass('d-none');
  });

  it('shows the button only when the window is scrolled past the threshold on small devices', () => {
    setPoint(Breakpoint.SM);
    render(() => <ButtonToTopScroll />);

    // Scroll below the threshold
    scrollWindow(THRESHOLD);
    expect(buttonWrapper()).toHaveClass('d-none');

    // Scroll above the threshold
    scrollWindow(THRESHOLD + 1);
    expect(buttonWrapper()).not.toHaveClass('d-none');
  });

  it('follows a breakpoint change for the scroll target and the scrollToTop argument', async () => {
    const user = userEvent.setup();
    render(() => <ButtonToTopScroll />);

    // Scroll to top on a large device
    scrollElement(landscape, THRESHOLD + 1);
    await user.click(screen.getByRole('button', { name: 'Scroll to top' }));
    expect(scrollToTop).toHaveBeenLastCalledWith(false);
    scrollElement(landscape, 0);

    // Move to a small device, where the window scrolls
    setPoint(Breakpoint.XS);
    expect(buttonWrapper()).toHaveClass('d-none');
    scrollWindow(THRESHOLD + 1);
    expect(buttonWrapper()).not.toHaveClass('d-none');

    // Scroll to top on the small device
    await user.click(screen.getByRole('button', { name: 'Scroll to top' }));
    expect(scrollToTop).toHaveBeenLastCalledWith(true);
  });
});

// Helpers.

/** Returns the sticky wrapper of the button, which carries the visibility class. */
const buttonWrapper = (): HTMLElement =>
  screen.getByRole('button', { name: 'Scroll to top' }).closest('.sticky-bottom') as HTMLElement;

/** Sets the scroll offset of an element and dispatches `scroll` on it. */
const scrollElement = (element: HTMLElement, top: number) => {
  Object.defineProperty(element, 'scrollTop', { configurable: true, value: top });
  fireEvent.scroll(element);
};

/**
 * Sets the window scroll offset and dispatches `scroll` on the window. Under Vitest's
 * jsdom, `window instanceof Window` is false, so `createScrollPosition` reads the
 * window offset from `scrollTop`, as for an element; both are set.
 */
const scrollWindow = (top: number) => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: top });
  Object.defineProperty(window, 'scrollTop', { configurable: true, value: top });
  fireEvent.scroll(window);
};

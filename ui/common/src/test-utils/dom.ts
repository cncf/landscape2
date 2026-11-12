/** Creates an element holding the given text, for `vi.mock` component stubs. */
export const createTextElement = (text: string, tag = 'div'): HTMLElement => {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
};

/**
 * Installs no-op versions of the browser APIs that jsdom lacks: `ResizeObserver`,
 * `window.scrollTo` and `Element.prototype.scrollTo`. Real implementations are left
 * untouched. jsdom's `window.scrollTo` only reports "Not implemented", so it counts
 * as missing.
 */
export const installBrowserStubs = (): void => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = NoopResizeObserver;
  }
  if (typeof window.scrollTo !== 'function' || isJsdom()) {
    window.scrollTo = noop;
  }
  if (typeof Element.prototype.scrollTo !== 'function') {
    Element.prototype.scrollTo = noop;
  }
};

/** Sets the viewport width and dispatches `resize`, so width-driven hooks react to it. */
export const setViewportWidth = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width, writable: true });
  window.dispatchEvent(new Event('resize'));
};

/** `ResizeObserver` that never reports a size change. */
class NoopResizeObserver implements ResizeObserver {
  disconnect(): void {}

  observe(): void {}

  unobserve(): void {}
}

/** Checks whether the code runs under jsdom, whose user agent names it. */
const isJsdom = (): boolean => navigator.userAgent.includes('jsdom');

/** Accepts any arguments and does nothing. */
const noop = (): void => {};

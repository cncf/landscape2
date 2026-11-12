// The script registers its message listener once, when it is loaded
import '../../public/embed-item.js';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const LANDSCAPE_ORIGIN = 'https://landscape.example';

const SHOW_ITEM_DETAILS = {
  classifyBy: 'category',
  foundation: 'CNCF',
  itemId: 'item-a',
  key: 'category',
  type: 'showItemDetails',
};

describe('embed-item host script', () => {
  let embedIframe: HTMLIFrameElement;
  let embedItemIframe: HTMLIFrameElement;

  beforeEach(() => {
    // Add an embed view and the embed-item iframe to the host page
    embedIframe = addIframe('embed', `${LANDSCAPE_ORIGIN}/embed/embed.html`);
    embedItemIframe = addIframe('embed-item', `${LANDSCAPE_ORIGIN}/embed/embed-item.html`);
    embedItemIframe.style.setProperty('display', 'none');
  });

  afterEach(() => {
    // Close the item details, so the script saves the next host overflow-y, and reset the page
    postMessage({ type: 'hideItemDetails' }, LANDSCAPE_ORIGIN, embedItemIframe.contentWindow);
    document.body.replaceChildren();
    document.body.removeAttribute('style');
  });

  it('ignores a null message without throwing', () => {
    // Setup an error listener: dispatchEvent reports listener exceptions as window errors, it does not throw
    const onError = vi.fn((event: ErrorEvent) => event.preventDefault());
    window.addEventListener('error', onError);

    // Run
    postMessage(null, LANDSCAPE_ORIGIN, embedIframe.contentWindow);
    window.removeEventListener('error', onError);

    // Check
    expect(onError).not.toHaveBeenCalled();
    expect(embedItemIframe.style.display).toBe('none');
  });

  it('ignores showItemDetails from a source that is not an iframe on the page', () => {
    // Setup
    const forward = vi.spyOn(embedItemIframe.contentWindow!, 'postMessage');

    // Run
    postMessage(SHOW_ITEM_DETAILS, LANDSCAPE_ORIGIN, window);

    // Check
    expect(embedItemIframe.style.display).toBe('none');
    expect(forward).not.toHaveBeenCalled();
  });

  it('ignores showItemDetails from another origin', () => {
    // Setup
    const forward = vi.spyOn(embedItemIframe.contentWindow!, 'postMessage');

    // Run
    postMessage(SHOW_ITEM_DETAILS, 'https://evil.example', embedIframe.contentWindow);

    // Check
    expect(embedItemIframe.style.display).toBe('none');
    expect(forward).not.toHaveBeenCalled();
  });

  it('shows the iframe and forwards a valid message to the embed-item origin', () => {
    // Setup
    const forward = vi.spyOn(embedItemIframe.contentWindow!, 'postMessage');

    // Run
    postMessage(SHOW_ITEM_DETAILS, LANDSCAPE_ORIGIN, embedIframe.contentWindow);

    // Check
    expect(embedItemIframe.style.display).toBe('block');
    expect(document.body.style.overflowY).toBe('hidden');
    expect(forward).toHaveBeenCalledExactlyOnceWith(SHOW_ITEM_DETAILS, LANDSCAPE_ORIGIN);
  });

  it('restores the host overflow-y on hideItemDetails without echoing it', () => {
    // Setup a host page that scrolls, with the item details shown
    document.body.style.overflowY = 'scroll';
    postMessage(SHOW_ITEM_DETAILS, LANDSCAPE_ORIGIN, embedIframe.contentWindow);
    const forward = vi.spyOn(embedItemIframe.contentWindow!, 'postMessage');

    // Close the item details from embed-item
    postMessage({ type: 'hideItemDetails' }, LANDSCAPE_ORIGIN, embedItemIframe.contentWindow);

    // Verify the iframe is hidden, the host overflow restored and nothing echoed
    expect(embedItemIframe.style.display).toBe('none');
    expect(document.body.style.overflowY).toBe('scroll');
    expect(forward).not.toHaveBeenCalled();
  });

  it('accepts hideItemDetails only from the embed-item iframe', () => {
    // Setup the item details shown
    postMessage(SHOW_ITEM_DETAILS, LANDSCAPE_ORIGIN, embedIframe.contentWindow);

    // Try to close them from the embed view and from the host page
    postMessage({ type: 'hideItemDetails' }, LANDSCAPE_ORIGIN, embedIframe.contentWindow);
    postMessage({ type: 'hideItemDetails' }, LANDSCAPE_ORIGIN, window);

    // Verify the item details are still shown
    expect(embedItemIframe.style.display).toBe('block');
    expect(document.body.style.overflowY).toBe('hidden');
  });
});

// Adds an iframe to the host page.
const addIframe = (id: string, src: string): HTMLIFrameElement => {
  const iframe = document.createElement('iframe');
  iframe.id = id;
  iframe.src = src;
  document.body.append(iframe);
  return iframe;
};

// Dispatches a message event on the host page window.
const postMessage = (data: unknown, origin: string, source: Window | null) => {
  window.dispatchEvent(new MessageEvent('message', { data, origin, source }));
};

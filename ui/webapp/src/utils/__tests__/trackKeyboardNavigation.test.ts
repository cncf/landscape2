import { afterEach, describe, expect, it } from 'vitest';

import trackKeyboardNavigation, { KEYBOARD_NAVIGATION_CLASS } from '../trackKeyboardNavigation';

describe('trackKeyboardNavigation', () => {
  let stop: (() => void) | undefined;

  afterEach(() => {
    stop?.();
    stop = undefined;
  });

  it('starts without the class', () => {
    stop = trackKeyboardNavigation();
    expect(hasClass()).toBe(false);
  });

  it('sets the class on a key press and removes it on a pointer press', () => {
    stop = trackKeyboardNavigation();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(hasClass()).toBe(true);

    document.dispatchEvent(new Event('pointerdown'));
    expect(hasClass()).toBe(false);
  });

  it('ignores keyboard shortcuts', () => {
    stop = trackKeyboardNavigation();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', metaKey: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', altKey: true }));
    expect(hasClass()).toBe(false);
  });

  it('sets the class on Tab with modifiers, as Safari moves the focus to buttons with Option+Tab', () => {
    stop = trackKeyboardNavigation();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', altKey: true }));
    expect(hasClass()).toBe(true);
  });

  it('removes the listeners and the class when stopped', () => {
    stop = trackKeyboardNavigation();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    stop();
    stop = undefined;

    expect(hasClass()).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(hasClass()).toBe(false);
  });
});

// Helpers.

/** Checks whether the root element has the keyboard navigation class. */
function hasClass(): boolean {
  return document.documentElement.classList.contains(KEYBOARD_NAVIGATION_CLASS);
}

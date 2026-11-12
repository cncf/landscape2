import { createRoot, createSignal } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useModalFocus } from '../useModalFocus';

describe('useModalFocus', () => {
  let animationFrameCallbacks: Map<number, FrameRequestCallback>;
  let disposeTestRoot: (() => void) | undefined;
  let nextAnimationFrameId: number;

  beforeEach(() => {
    animationFrameCallbacks = new Map();
    disposeTestRoot = undefined;
    nextAnimationFrameId = 0;
    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((animationFrameId: number) => {
        animationFrameCallbacks.delete(animationFrameId);
      })
    );
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        nextAnimationFrameId += 1;
        animationFrameCallbacks.set(nextAnimationFrameId, callback);
        return nextAnimationFrameId;
      })
    );
  });

  afterEach(() => {
    disposeTestRoot?.();
    document.body.replaceChildren();
  });

  it('should close only the nested modal and restore focus to its trigger', async () => {
    const parentModal = document.createElement('div');
    const childModal = document.createElement('div');
    const childCloseButton = document.createElement('button');
    const childModalTrigger = document.createElement('button');
    const onChildClose = vi.fn();
    const onParentClose = vi.fn();

    markVisible(childCloseButton);
    markVisible(childModalTrigger);
    childModal.appendChild(childCloseButton);
    parentModal.append(childModalTrigger, childModal);
    document.body.appendChild(parentModal);
    childModalTrigger.focus();

    disposeTestRoot = createRoot((disposeRoot) => {
      const [childOpen, setChildOpen] = createSignal(true);
      const [parentOpen, setParentOpen] = createSignal(true);

      useModalFocus(
        () => parentModal,
        parentOpen,
        () => {
          onParentClose();
          setParentOpen(false);
        }
      );
      useModalFocus(
        () => childModal,
        childOpen,
        () => {
          onChildClose();
          setChildOpen(false);
        }
      );

      return disposeRoot;
    });

    await Promise.resolve();
    runAnimationFrames(animationFrameCallbacks);
    expect(document.activeElement).toBe(childCloseButton);

    childCloseButton.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onChildClose).toHaveBeenCalledTimes(1);
    expect(onParentClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(childModalTrigger);

    childModal.remove();
  });

  it('should wrap focus without including hidden controls', async () => {
    const modal = document.createElement('div');
    const firstButton = document.createElement('button');
    const hiddenButton = document.createElement('button');
    const lastButton = document.createElement('button');

    hiddenButton.style.display = 'none';
    markVisible(firstButton);
    markVisible(lastButton);
    modal.append(firstButton, lastButton, hiddenButton);
    document.body.appendChild(modal);

    disposeTestRoot = createRoot((disposeRoot) => {
      const [open] = createSignal(true);
      useModalFocus(() => modal, open, vi.fn());
      return disposeRoot;
    });

    await Promise.resolve();
    runAnimationFrames(animationFrameCallbacks);
    expect(document.activeElement).toBe(firstButton);

    lastButton.focus();
    lastButton.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
    expect(document.activeElement).toBe(firstButton);

    firstButton.focus();
    firstButton.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab', shiftKey: true }));
    expect(document.activeElement).toBe(lastButton);
  });

  it('calls onClose on Escape', async () => {
    // Open the modal with a focusable button
    const modal = createModal();
    const button = document.createElement('button');
    const onClose = vi.fn();
    markVisible(button);
    modal.appendChild(button);

    disposeTestRoot = createRoot((disposeRoot) => {
      const [open] = createSignal(true);
      useModalFocus(() => modal, open, onClose);
      return disposeRoot;
    });
    await Promise.resolve();
    runAnimationFrames(animationFrameCallbacks);

    // Press Escape inside the modal
    const escapeEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' });
    button.dispatchEvent(escapeEvent);

    // Check onClose ran and the default was prevented
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(escapeEvent.defaultPrevented).toBe(true);
  });

  it('focuses the modal itself when it has no focusable child', async () => {
    // Open a modal without focusable children and check it takes the focus
    const modal = createModal();
    modal.appendChild(document.createElement('p'));

    disposeTestRoot = createRoot((disposeRoot) => {
      const [open] = createSignal(true);
      useModalFocus(() => modal, open, vi.fn());
      return disposeRoot;
    });
    await Promise.resolve();
    runAnimationFrames(animationFrameCallbacks);
    expect(document.activeElement).toBe(modal);

    // Tab keeps the focus on the modal
    const tabEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' });
    modal.dispatchEvent(tabEvent);

    // Check the focus stayed on the modal and the default was prevented
    expect(document.activeElement).toBe(modal);
    expect(tabEvent.defaultPrevented).toBe(true);
  });

  it('wraps Shift+Tab from outside the modal to its last element', async () => {
    // Open the modal with two buttons and keep a button outside it
    const modal = createModal();
    const firstButton = document.createElement('button');
    const lastButton = document.createElement('button');
    const outsideButton = document.createElement('button');
    markVisible(firstButton);
    markVisible(lastButton);
    modal.append(firstButton, lastButton);
    document.body.appendChild(outsideButton);

    disposeTestRoot = createRoot((disposeRoot) => {
      const [open] = createSignal(true);
      useModalFocus(() => modal, open, vi.fn());
      return disposeRoot;
    });
    await Promise.resolve();
    runAnimationFrames(animationFrameCallbacks);

    // Move the focus out of the modal and press Shift+Tab on it
    outsideButton.focus();
    modal.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab', shiftKey: true }));

    // Check the focus wrapped to the last element
    expect(document.activeElement).toBe(lastButton);
  });

  it('cancels the pending initial focus when disposed', async () => {
    // Open the modal and check the initial focus is still pending
    const modal = createModal();
    const button = document.createElement('button');
    markVisible(button);
    modal.appendChild(button);

    disposeTestRoot = createRoot((disposeRoot) => {
      const [open] = createSignal(true);
      useModalFocus(() => modal, open, vi.fn());
      return disposeRoot;
    });
    await Promise.resolve();
    expect(animationFrameCallbacks.size).toBe(1);

    // Dispose before the animation frame runs
    disposeTestRoot();
    disposeTestRoot = undefined;
    runAnimationFrames(animationFrameCallbacks);

    // Check the frame was cancelled and the button never got the focus
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(document.activeElement).not.toBe(button);
  });

  it('does not restore the focus to a trigger removed from the document', async () => {
    // Focus the trigger, then open the modal
    const modal = createModal();
    const button = document.createElement('button');
    const trigger = document.createElement('button');
    const triggerFocusSpy = vi.spyOn(trigger, 'focus');
    markVisible(button);
    modal.appendChild(button);
    document.body.appendChild(trigger);
    trigger.focus();
    triggerFocusSpy.mockClear();

    disposeTestRoot = createRoot((disposeRoot) => {
      const [open] = createSignal(true);
      useModalFocus(() => modal, open, vi.fn());
      return disposeRoot;
    });
    await Promise.resolve();
    runAnimationFrames(animationFrameCallbacks);
    expect(document.activeElement).toBe(button);

    // Remove the trigger, then close the modal
    trigger.remove();
    disposeTestRoot();
    disposeTestRoot = undefined;

    // Check the removed trigger was not focused again
    expect(triggerFocusSpy).not.toHaveBeenCalled();
  });
});

/** Creates a focusable modal attached to the document, like the `Modal` component's dialog. */
const createModal = (): HTMLDivElement => {
  const modal = document.createElement('div');
  modal.tabIndex = -1;
  document.body.appendChild(modal);
  return modal;
};

/** Makes jsdom report the element as rendered, so the hook treats it as focusable. */
const markVisible = (element: HTMLElement) => {
  vi.spyOn(element, 'getClientRects').mockReturnValue([{} as DOMRect] as unknown as DOMRectList);
};

/** Runs and clears the stubbed animation frame callbacks. */
const runAnimationFrames = (animationFrameCallbacks: Map<number, FrameRequestCallback>) => {
  const callbacks = Array.from(animationFrameCallbacks.values());
  animationFrameCallbacks.clear();
  callbacks.forEach((callback) => callback(performance.now()));
};

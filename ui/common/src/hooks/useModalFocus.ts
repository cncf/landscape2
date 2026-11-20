import { Accessor, createEffect, onCleanup } from 'solid-js';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Moves the focus to a modal when it opens, keeps keyboard focus inside it and restores it when
 * the modal closes. The initial focus goes to `initialFocusRef` (for example the area of the
 * modal that scrolls, so the keyboard scrolls it) or, when not provided, to the modal itself.
 */
export const useModalFocus = (
  modalRef: Accessor<HTMLElement | undefined>,
  open: Accessor<boolean>,
  onClose: () => void,
  initialFocusRef?: Accessor<HTMLElement | undefined>
) => {
  createEffect(() => {
    if (!open()) return;

    const modal = modalRef();
    if (!modal) return;

    const previouslyFocusedElement = document.activeElement as HTMLElement | null;
    const focusableElements = () =>
      Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
    const animationFrame = requestAnimationFrame(() => {
      (initialFocusRef?.() ?? modal).focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'Tab') return;

      event.stopPropagation();

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      const availableElements = focusableElements();
      if (availableElements.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }

      // Wrap around when the focus is outside the modal or no control follows the focused
      // element in the direction of the move (otherwise the browser moves the focus)
      const activeElement = document.activeElement;
      const direction = event.shiftKey ? Node.DOCUMENT_POSITION_PRECEDING : Node.DOCUMENT_POSITION_FOLLOWING;
      const hasControlAhead =
        !!activeElement &&
        modal.contains(activeElement) &&
        availableElements.some((element) => (activeElement.compareDocumentPosition(element) & direction) !== 0);
      if (!hasControlAhead) {
        event.preventDefault();
        availableElements[event.shiftKey ? availableElements.length - 1 : 0].focus();
      }
    };

    modal.addEventListener('keydown', handleKeyDown);

    onCleanup(() => {
      cancelAnimationFrame(animationFrame);
      modal.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus();
      }
    });
  });
};

const isVisible = (element: HTMLElement) =>
  element.getClientRects().length > 0 && window.getComputedStyle(element).visibility !== 'hidden';

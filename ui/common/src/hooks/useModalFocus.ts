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
 * Keep keyboard focus inside an open modal and restore it when the modal closes.
 */
export const useModalFocus = (
  modalRef: Accessor<HTMLElement | undefined>,
  open: Accessor<boolean>,
  onClose: () => void
) => {
  createEffect(() => {
    if (!open()) return;

    const modal = modalRef();
    if (!modal) return;

    const previouslyFocusedElement = document.activeElement as HTMLElement | null;
    const focusableElements = () => Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    const animationFrame = requestAnimationFrame(() => {
      (focusableElements()[0] || modal).focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const availableElements = focusableElements();
      if (availableElements.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const firstElement = availableElements[0];
      const lastElement = availableElements[availableElements.length - 1];
      if (event.shiftKey && (document.activeElement === firstElement || !modal.contains(document.activeElement))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    onCleanup(() => {
      cancelAnimationFrame(animationFrame);
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus();
      }
    });
  });
};

/** Class set on the root element while the user is navigating with the keyboard (also used in styles/cookies.css). */
export const KEYBOARD_NAVIGATION_CLASS = 'keyboard-nav';

/**
 * Sets `KEYBOARD_NAVIGATION_CLASS` on the root element after a key press and
 * removes it after a pointer press, so styles can target keyboard navigation.
 *
 * @returns A function that removes the listeners and the class
 */
const trackKeyboardNavigation = (): (() => void) => {
  const root = document.documentElement;
  const onKeyDown = (e: KeyboardEvent) => {
    // Shortcuts (copy, paste, browser shortcuts) do not move the focus, but Tab always does,
    // also with modifiers (Safari moves the focus to buttons with Option+Tab by default)
    if (e.key !== 'Tab' && (e.altKey || e.ctrlKey || e.metaKey)) return;
    root.classList.add(KEYBOARD_NAVIGATION_CLASS);
  };
  const onPointerDown = () => {
    root.classList.remove(KEYBOARD_NAVIGATION_CLASS);
  };

  // Capture phase, so the class is set before other handlers move the focus
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('pointerdown', onPointerDown, true);

  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('pointerdown', onPointerDown, true);
    root.classList.remove(KEYBOARD_NAVIGATION_CLASS);
  };
};

export default trackKeyboardNavigation;

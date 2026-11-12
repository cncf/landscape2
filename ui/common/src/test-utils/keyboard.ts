import type { UserEvent } from '@testing-library/user-event';

/** Most Tab presses `tabTo` makes before giving up. */
const MAX_TAB_PRESSES = 20;

/**
 * Presses Tab until the element given has the focus, so tests reach it the way
 * keyboard users do.
 *
 * @param user - User event instance of the test
 * @param element - Element to reach
 * @throws When the element is not reached after 20 presses
 */
export const tabTo = async (user: UserEvent, element: HTMLElement): Promise<void> => {
  for (let presses = 0; presses < MAX_TAB_PRESSES && document.activeElement !== element; presses++) {
    await user.tab();
  }
  if (document.activeElement !== element) {
    throw new Error(`Element not reached with ${MAX_TAB_PRESSES} Tab presses: ${element.outerHTML}`);
  }
};

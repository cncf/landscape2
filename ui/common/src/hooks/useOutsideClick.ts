import { Accessor, createEffect, onCleanup } from 'solid-js';

/**
 * Calls `onClickOutside` on a mousedown outside every ref and every excluded element (by id), while enabled.
 */
export const useOutsideClick = (
  refs: Accessor<HTMLElement | undefined>[],
  excludedIds: string[],
  enabled: Accessor<boolean>,
  onClickOutside: (e: MouseEvent) => void
) => {
  const isOutside = (target: Node) =>
    refs.every((ref) => {
      const element = ref();
      return element === undefined || !element.contains(target);
    });

  const isExcluded = (target: Node) =>
    excludedIds.some((id) => {
      const excludedElement = document.getElementById(id);
      return excludedElement !== null && excludedElement.contains(target);
    });

  const onEvent = (e: MouseEvent) => {
    const target = e.target as Node;
    if (enabled() && isOutside(target) && !isExcluded(target)) {
      onClickOutside(e);
    }
  };

  createEffect(() => {
    if (enabled()) {
      document.addEventListener('mousedown', onEvent, { passive: true });
    } else {
      document.removeEventListener('mousedown', onEvent);
    }
  });

  onCleanup(() => {
    document.removeEventListener('mousedown', onEvent);
  });
};

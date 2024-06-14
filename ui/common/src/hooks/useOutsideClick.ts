import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { Accessor, createEffect, onCleanup } from 'solid-js';

export const useOutsideClick = (
  refs: Accessor<HTMLElement | HTMLDivElement | undefined>[],
  excludedIds: string[],
  enabled: Accessor<boolean>,
  onClickOutside: (e: MouseEvent) => void
) => {
  const isOutside = (e: MouseEvent) => {
    const test = refs.map((r) => {
      if (isUndefined(r())) return true;
      return !r()!.contains(e.target as HTMLElement);
    });
    return test.every(Boolean);
  };

  const isExcluded = (e: MouseEvent) => {
    if (excludedIds.length === 0) return false;
    const test = excludedIds.map((id: string) => {
      const excludedItem = document.getElementById(id);
      if (isNull(excludedItem)) return false;
      return e.target === excludedItem || excludedItem!.contains(e.target as HTMLElement);
    });
    return test.some(Boolean);
  };

  const onEvent = (e: MouseEvent) => {
    if (isOutside(e) && !isExcluded(e) && enabled()) {
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

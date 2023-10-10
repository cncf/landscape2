import isUndefined from 'lodash/isUndefined';
import { Accessor, createEffect, onCleanup } from 'solid-js';

export const useOutsideClick = (
  refs: Accessor<HTMLElement | HTMLDivElement | undefined>[],
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

  const onEvent = (e: MouseEvent) => {
    if (isOutside(e) && enabled()) {
      onClickOutside(e);
    }
  };

  createEffect(() => {
    if (enabled()) {
      document.addEventListener('mousedown', onEvent);
    } else {
      document.removeEventListener('mousedown', onEvent);
    }
  });

  onCleanup(() => {
    document.removeEventListener('mousedown', onEvent);
  });
};

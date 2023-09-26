import { Accessor, createEffect, onCleanup } from 'solid-js';

export const useBodyScroll = (blocked: Accessor<boolean>, elType: string) => {
  const className = `noScroll-${elType}`;

  createEffect(() => {
    if (blocked()) {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }
  });

  onCleanup(() => {
    document.body.classList.remove(className);
  });
};

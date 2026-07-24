import { Accessor, createEffect, onCleanup } from 'solid-js';

const bodyScrollLocks = new Map<string, Set<symbol>>();

/** Keeps body scrolling locked while the provided accessor is blocked. */
export const useBodyScroll = (blocked: Accessor<boolean>, elType: string) => {
  const className = `noScroll-${elType}`;
  const lockId = Symbol(className);

  createEffect(() => {
    if (blocked()) {
      const locks = bodyScrollLocks.get(className) || new Set<symbol>();
      locks.add(lockId);
      bodyScrollLocks.set(className, locks);
      document.body.classList.add(className);
    } else {
      releaseBodyScrollLock(className, lockId);
    }
  });

  onCleanup(() => {
    releaseBodyScrollLock(className, lockId);
  });
};

const releaseBodyScrollLock = (className: string, lockId: symbol) => {
  const locks = bodyScrollLocks.get(className);
  if (!locks) {
    return;
  }

  locks.delete(lockId);
  if (locks.size === 0) {
    bodyScrollLocks.delete(className);
    document.body.classList.remove(className);
  }
};

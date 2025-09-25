import { Accessor, createEffect, createSignal, onCleanup } from 'solid-js';

interface Options {
  delayMs?: number;
  enabled?: Accessor<boolean>;
  initial?: number;
  step?: number;
}

const DEFAULT_INITIAL = 120;
const DEFAULT_STEP = 120;
const DEFAULT_DELAY = 16;

/**
 * Incrementally increases the number of rendered items to spread rendering cost across frames.
 */
const createIncrementalLimit = (total: Accessor<number>, options?: Options): Accessor<number> => {
  const [limit, setLimit] = createSignal<number>(0);
  const initial = options?.initial ?? DEFAULT_INITIAL;
  const step = options?.step ?? DEFAULT_STEP;
  const delay = options?.delayMs ?? DEFAULT_DELAY;
  const isEnabled = options?.enabled ?? (() => true);

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const clearScheduled = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  const scheduleMore = () => {
    if (timeoutId || !isEnabled()) return;
    if (limit() >= total()) return;

    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      if (!isEnabled()) return;
      const count = total();
      if (limit() >= count) return;

      setLimit((prev) => {
        const next = Math.min(prev + step, count);
        return next;
      });

      if (limit() < count) {
        scheduleMore();
      }
    }, delay);
  };

  createEffect(() => {
    const enabled = isEnabled();
    const count = total();

    clearScheduled();

    if (!enabled || count === 0) {
      setLimit(0);
      return;
    }

    const next = Math.min(count, initial);
    setLimit(next);

    if (next < count) {
      scheduleMore();
    }
  });

  onCleanup(() => clearScheduled());

  return limit;
};

export default createIncrementalLimit;

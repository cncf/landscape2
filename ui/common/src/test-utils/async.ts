/** A promise together with the functions that settle it from outside. */
export interface Deferred<T> {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T) => void;
}

/** Creates a promise that the test settles explicitly, to control the order of async work. */
export const createDeferred = <T>(): Deferred<T> => {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    reject = promiseReject;
    resolve = promiseResolve;
  });
  return { promise, reject, resolve };
};

/** Waits for one macrotask, so every pending promise callback and Solid update has run. */
export const flushPromises = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

// eslint-disable-next-line @typescript-eslint/ban-types
const throttle = (fn: Function, wait = 300) => {
  let inThrottle: boolean, lastFn: ReturnType<typeof setTimeout>, lastTime: number;
  return function (ctxt: unknown) {
    const context = ctxt,
      // eslint-disable-next-line prefer-rest-params
      args = arguments;
    if (!inThrottle) {
      fn.apply(context, args);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFn);
      lastFn = setTimeout(
        () => {
          if (Date.now() - lastTime >= wait) {
            fn.apply(context, args);
            lastTime = Date.now();
          }
        },
        Math.max(wait - (Date.now() - lastTime), 0)
      );
    }
  };
};

export default throttle;

/** Scrolls the window, or the landscape container when `onWindow` is false, back to the top. */
const scrollToTop = (onWindow: boolean) => {
  if (onWindow) {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  } else {
    document.getElementById('landscape')!.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }
};

export default scrollToTop;

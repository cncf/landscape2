import { DEFAULT_STICKY_MOBILE_NAVBAR_HEIGHT, DEFAULT_STICKY_NAVBAR_HEIGHT } from '../data';

const goToElement = (onWindow: boolean, id: string, offset?: number): boolean => {
  const target = window.document.getElementById(id);
  if (target) {
    const elementPosition = target.getBoundingClientRect().top;
    // Sticky navbar for small devices
    const extraOffset =
      window.innerWidth < 992
        ? window.scrollY < 130
          ? DEFAULT_STICKY_MOBILE_NAVBAR_HEIGHT * 2 + 20
          : DEFAULT_STICKY_MOBILE_NAVBAR_HEIGHT
        : DEFAULT_STICKY_NAVBAR_HEIGHT;
    const offsetPosition = elementPosition - (offset || 0) - extraOffset;

    if (onWindow) {
      window.scrollBy({
        top: offsetPosition,
        behavior: 'instant',
      });
    } else {
      document.getElementById('landscape')!.scrollBy({
        top: offsetPosition,
        behavior: 'instant',
      });
    }
    return true;
  } else {
    return false;
  }
};

export default goToElement;

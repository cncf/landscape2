import { DEFAULT_STICKY_NAVBAR_HEIGHT } from '../data';

const goToElement = (id: string, offset?: number): boolean => {
  const target = window.document.getElementById(id);
  if (target) {
    const elementPosition = target.getBoundingClientRect().top;
    // Sticky navbar for small devices
    const extraOffset =
      window.innerWidth < 992
        ? window.scrollY < 130
          ? DEFAULT_STICKY_NAVBAR_HEIGHT * 2 + 20
          : DEFAULT_STICKY_NAVBAR_HEIGHT
        : 0;
    const offsetPosition = elementPosition - (offset || 0) - extraOffset;

    window.scrollBy({
      top: offsetPosition,
      behavior: 'instant',
    });
    return true;
  } else {
    return false;
  }
};

export default goToElement;

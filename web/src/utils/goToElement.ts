const goToElement = (id: string, offset?: number): boolean => {
  const target = window.document.getElementById(id);
  if (target) {
    const elementPosition = target.getBoundingClientRect().top;
    const offsetPosition = elementPosition - (offset || 0);

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

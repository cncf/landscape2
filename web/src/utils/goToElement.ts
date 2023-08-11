const goToElement = (id: string, offset?: number) => {
  const target = window.document.getElementById(id);
  if (target) {
    const elementPosition = target.getBoundingClientRect().top;
    const offsetPosition = elementPosition - (offset || 0);

    window.scrollBy({
      top: offsetPosition,
      behavior: 'instant',
    });
  }
};

export default goToElement;

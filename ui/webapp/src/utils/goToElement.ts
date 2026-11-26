/** Scrolls the element with the id given to the top of the viewport, on the next tick. */
const goToElement = (id: string) => {
  const target = document.getElementById(id);

  if (target) {
    setTimeout(() => {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
};

export default goToElement;

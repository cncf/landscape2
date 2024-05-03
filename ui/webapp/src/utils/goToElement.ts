const goToElement = (id: string) => {
  const target = document.getElementById(id);

  if (target) {
    setTimeout(() => {
      target!.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
};

export default goToElement;

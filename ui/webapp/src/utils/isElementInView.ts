import isNull from 'lodash/isNull';

const isElementInView = (id: string) => {
  try {
    const item = document.querySelector(id);
    return !isNull(item);
  } catch {
    return false;
  }
};

export default isElementInView;

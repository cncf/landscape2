const MAX_LENGTH = 10;

/** Cuts a string to the given length, adding an ellipsis when it is longer. */
export const cutString = (str: string, length: number = MAX_LENGTH): string => {
  if (str.length <= length) {
    return str;
  }

  return `${str.substring(0, length)}...`;
};

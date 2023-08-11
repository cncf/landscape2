const convertStringSpaces = (s: string): string => {
  return s.replace(/ /g, '+');
};

export default convertStringSpaces;

import { REGEX_SPACE } from '../data';

const convertStringSpaces = (s: string): string => {
  return s.replace(REGEX_SPACE, '+');
};

export default convertStringSpaces;

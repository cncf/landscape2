import { FOUNDATION, REGEX_SPACE } from '../data';

const getFoundationNameLabel = (): string => {
  const foundation: string = FOUNDATION;
  return foundation.toLowerCase().replace(REGEX_SPACE, '');
};

export default getFoundationNameLabel;

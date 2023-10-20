import { REGEX_SPACE } from '../data';

const getFoundationNameLabel = (): string => {
  const FOUNDATION: string = window.baseDS.foundation;
  return FOUNDATION.toLowerCase().replace(REGEX_SPACE, '');
};

export default getFoundationNameLabel;

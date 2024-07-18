import { REGEX_UNDERSCORE } from '../data/data';

const REGEX_NON = /non/g;

export const formatProfitLabel = (text: string): string => {
  return text.replace(REGEX_UNDERSCORE, ' ').replace(REGEX_NON, 'not');
};

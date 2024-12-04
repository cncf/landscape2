import { REGEX_UNDERSCORE } from '../data/data';

export const formatProfitLabel = (text: string): string => {
  return text.replace(REGEX_UNDERSCORE, ' ');
};

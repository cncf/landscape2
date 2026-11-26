import { REGEX_UNDERSCORE } from '../data/data';

/** Formats a Crunchbase profit kind (`for_profit`) as a label by replacing underscores with spaces. */
export const formatProfitLabel = (text: string): string => {
  return text.replace(REGEX_UNDERSCORE, ' ');
};

import { REGEX_UNDERSCORE } from '../data';
const REGEX_NON = /non/g;

const formatProfitLabel = (text: string): string => {
  return text.replace(REGEX_UNDERSCORE, ' ').replace(REGEX_NON, 'not');
};

export default formatProfitLabel;

import { REGEX_UNDERSCORE } from '../data';

const formatProfitLabel = (text: string): string => {
  return text.replace(REGEX_UNDERSCORE, ' ');
};

export default formatProfitLabel;

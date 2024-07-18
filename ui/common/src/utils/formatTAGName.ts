import { REGEX_DASH } from '../data/data';
import { capitalizeFirstLetter } from './capitalizeFirstLetter';

export const formatTAGName = (t: string): string => {
  const tag = t.replace(REGEX_DASH, ' ');
  const words = tag.split(' ');

  for (let i = 0; i < words.length; i++) {
    words[i] = capitalizeFirstLetter(words[i]);
  }

  return words.join(' ');
};

import { REGEX_DASH, REGEX_UNDERSCORE, REGEX_SPACE } from '../data/data';
// `badgeContent` message needs special character handling for shields.io:
// - Single dash → double dash (dash is used as separator)
// - Space → %20 (proper URL encoding)
// - Underscore → double underscore (underscore renders as space in badge)
// https://shields.io/badges/static-badge
export const formatShieldsBadgeContent = (n: string): string => {
  return n
    .replace(REGEX_DASH, '--')
    .replace(REGEX_UNDERSCORE, '__')
    .replace(REGEX_SPACE, '%20');
};

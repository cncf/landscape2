import { REGEX_DASH, REGEX_UNDERSCORE } from '../data/data';

/**
 * Formats a text as a shields.io static badge message: dashes and underscores are doubled (a single one is a
 * separator or a space for shields.io), then the text is URL-encoded. See https://shields.io/badges/static-badge.
 */
export const formatShieldsBadgeContent = (text: string): string =>
  encodeURIComponent(text.replace(REGEX_DASH, '--').replace(REGEX_UNDERSCORE, '__'));

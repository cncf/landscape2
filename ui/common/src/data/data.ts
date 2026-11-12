import { Breakpoint } from '../types/types';

export const REGEX_DASH = /-/g;
export const REGEX_URL = /^https?:\/\//;
export const REGEX_UNDERSCORE = /_/g;
export const REGEX_SPACE = /\s/g;

export const BANNER_ID = 'banner-event';

/** Breakpoints where the web application and embed-item show their mobile layouts. */
export const SMALL_DEVICES_BREAKPOINTS: Breakpoint[] = [Breakpoint.XS, Breakpoint.SM, Breakpoint.MD];

/** Placeholder rendered when an item has no resolved description. */
export const DEFAULT_ITEM_DESCRIPTION = 'This item does not have a description available yet';

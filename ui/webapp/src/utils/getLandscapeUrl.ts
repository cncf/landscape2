import getBasePath from './getBasePath';

/** Returns the landscape URL: the origin given (the current one by default) plus the base path. */
const getLandscapeUrl = (origin: string = window.location.origin): string => `${origin}${getBasePath()}`;

export default getLandscapeUrl;

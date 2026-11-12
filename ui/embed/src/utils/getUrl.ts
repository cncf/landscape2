import { getBasePath } from './dataOrigin';

/**
 * Returns the landscape url the embed belongs to: the embed origin plus the
 * `base-path` parameter when it is a valid base path (otherwise the origin).
 */
const getUrl = (): string => `${location.origin}${getBasePath()}`;

export default getUrl;

const BASE_PATH = /^\/(?!\/)[A-Za-z0-9._~\-/]*$/;
const TRAILING_SLASHES = /\/+$/;

/**
 * Checks the `base-path` embed parameter is a path on the landscape origin:
 * empty, or an absolute path (not protocol-relative) made of unreserved URL
 * characters, without `..` segments.
 *
 * @param value - Raw `base-path` value
 * @returns Whether the value can be used as the landscape base path
 */
export const isValidBasePath = (value: string): boolean =>
  value === '' || (BASE_PATH.test(value) && !value.split('/').includes('..'));

/**
 * Reads the `base-path` embed parameter as the prefix of the landscape urls
 * (data, logos, embed setup). Trailing slashes are dropped, so `/` becomes
 * `''` and joining the prefix with `/data/...` never yields a
 * protocol-relative url.
 *
 * @param value - Raw `base-path` value (`null` when the param is missing)
 * @returns The prefix (`''` when missing), or `null` when the value is invalid
 */
export const parseBasePath = (value: string | null): string | null => {
  if (value === null) return '';
  return isValidBasePath(value) ? value.replace(TRAILING_SLASHES, '') : null;
};

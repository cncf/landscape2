const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/**
 * Checks a link target taken from the landscape data is an absolute `http`,
 * `https` or `mailto` URL, so it can be rendered as a link.
 *
 * @param value - Link target
 * @returns Whether the value is safe to use as an `href`
 */
export const isSafeHref = (value: string): boolean => {
  try {
    return SAFE_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    // Relative and malformed values have no base to resolve against
    return false;
  }
};

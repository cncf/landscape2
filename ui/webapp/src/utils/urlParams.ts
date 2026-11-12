/** Raw value of a query param, as read from the router search params. */
export type RawParam = string | string[] | undefined;

/**
 * Returns `search` with the updates applied, as a `?`-prefixed search string, or an
 * empty string when no params are left. Untouched keys, repeated ones included, are
 * kept as they are. A string replaces the key's values in place, an array replaces
 * them with each of its values appended, and `undefined` deletes the key.
 */
export const withParams = (search: string, updates: Record<string, string | string[] | undefined>): string => {
  const params = new URLSearchParams(search);

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      params.delete(key);
    } else if (Array.isArray(value)) {
      params.delete(key);
      value.forEach((entry) => params.append(key, entry));
    } else {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query === '' ? '' : `?${query}`;
};

/** Joins a pathname, a search (with or without its `?`) and a hash into a path. */
export const buildPath = (pathname: string, search: string, hash: string): string => {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return `${pathname}${query === '' ? '' : `?${query}`}${hash}`;
};

/** Returns the value of an enum query param when it is one of `allowed`, or `fallback`. */
export const parseEnum = <T extends string>(raw: RawParam, allowed: readonly T[], fallback: T): T => {
  return typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
};

/** Returns the item id of the item query param, or `undefined` when it is empty, missing or repeated. */
export const parseItemId = (raw: RawParam): string | undefined => {
  return typeof raw === 'string' && raw !== '' ? raw : undefined;
};

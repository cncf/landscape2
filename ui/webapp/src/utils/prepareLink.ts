import overlayData from './overlayData';

/**
 * Returns a link to `path` that keeps the active overlay params, followed by the
 * `extraQuery` params: `path?query`, or just `path` when there are no params.
 */
const prepareLink = (path: string, extraQuery?: string): string => {
  const params = new URLSearchParams(overlayData.getUrlParams());
  new URLSearchParams(extraQuery).forEach((value, key) => params.append(key, value));

  const query = params.toString();
  return query === '' ? path : `${path}?${query}`;
};

export default prepareLink;

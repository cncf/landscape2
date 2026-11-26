import { BASE_PATH_PARAM, parseBasePath } from 'common/embed';

// Origin of the data in development, served by `landscape2 serve`
const DEV_DATA_ORIGIN = 'http://localhost:8000';

/**
 * Returns the landscape base path the embed was given in its `base-path`
 * param, when it is a valid one.
 *
 * @returns The validated base path, without trailing slashes (`''` when
 *   missing or invalid)
 */
export const getBasePath = (): string => parseBasePath(new URLSearchParams(location.search).get(BASE_PATH_PARAM)) ?? '';

/**
 * Returns the prefix of the landscape data and logos urls: the development
 * server origin in development, otherwise the landscape base path.
 *
 * @param basePath - Validated landscape base path (read from the url by default)
 * @returns The prefix, without a trailing slash
 */
export const getDataOrigin = (basePath: string = getBasePath()): string =>
  import.meta.env.MODE === 'development' ? DEV_DATA_ORIGIN : basePath;

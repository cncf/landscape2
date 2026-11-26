/** Origin the landscape is served from by `landscape2 serve` during development. */
const DEV_ORIGIN = 'http://localhost:8000';

/**
 * Returns the origin the landscape data is served from: the local `landscape2 serve`
 * origin in development mode, the fallback given otherwise.
 */
const getDevOrigin = (fallback: string): string => (import.meta.env.MODE === 'development' ? DEV_ORIGIN : fallback);

export default getDevOrigin;

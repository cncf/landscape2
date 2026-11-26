/** Returns the landscape base path from the base dataset (empty when it is served from the root). */
const getBasePath = (): string => window.baseDS?.base_path || '';

export default getBasePath;

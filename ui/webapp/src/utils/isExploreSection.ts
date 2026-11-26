import { EMBED_SETUP_PATH, EXPLORE_PATH } from '../data';

/** Checks whether the path is the Explore section (including the embed setup path). */
const isExploreSection = (path: string): boolean => path === EXPLORE_PATH || path === EMBED_SETUP_PATH;

export default isExploreSection;

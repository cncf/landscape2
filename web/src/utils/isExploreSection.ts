import { EMBED_SETUP_PATH, EXPLORE_PATH } from '../data';

const isExploreSection = (path: string): boolean => {
  return path === EXPLORE_PATH || path === EMBED_SETUP_PATH;
};

export default isExploreSection;

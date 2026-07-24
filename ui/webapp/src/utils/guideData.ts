/** Return the environment-specific URL for the guide dataset. */
export const getGuideUrl = () =>
  import.meta.env.MODE === 'development' ? '../../static/data/guide.json' : './data/guide.json';

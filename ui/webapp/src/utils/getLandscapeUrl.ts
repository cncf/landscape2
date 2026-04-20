import getBasePath from './getBasePath';

const getLandscapeUrl = (origin: string = window.location.origin): string => {
  return `${origin}${getBasePath()}`;
};

export default getLandscapeUrl;

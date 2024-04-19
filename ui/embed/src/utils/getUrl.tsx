import { BASE_PATH_PARAM } from '../types';

const getUrl = (): string => {
  const urlParams = new URLSearchParams(location.search);
  const basePathParam = urlParams.get(BASE_PATH_PARAM);
  return `${location.origin}${basePathParam || ''}`;
};

export default getUrl;

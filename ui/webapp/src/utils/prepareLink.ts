import { isUndefined } from 'lodash';

import overlayData from './overlayData';

const prepareLink = (path: string, extraQuery?: string): string => {
  if (overlayData.isActiveOverlay()) {
    return `${path}?${overlayData.getUrlParams()}${!isUndefined(extraQuery) ? `&${extraQuery}` : ''}`;
  } else {
    return `${path}${!isUndefined(extraQuery) ? `/?${extraQuery}` : ''}`;
  }
};

export default prepareLink;

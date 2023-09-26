import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';

const isSectionInGuide = (categoryName: string, subcategoryName?: string): boolean => {
  const guideSummary = window.baseDS.guide_summary;

  if (!isUndefined(guideSummary) && !isEmpty(guideSummary)) {
    if (!isUndefined(subcategoryName)) {
      if (!isUndefined(guideSummary[categoryName]) && guideSummary[categoryName].includes(subcategoryName)) {
        return true;
      } else {
        return false;
      }
    } else {
      if (!isUndefined(guideSummary[categoryName])) {
        return true;
      } else {
        return false;
      }
    }
  } else {
    return false;
  }
};

export default isSectionInGuide;

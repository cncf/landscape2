import isUndefined from 'lodash/isUndefined';

import { Group } from '../types';

const getGroupName = (group?: string): string | undefined => {
  if (!isUndefined(group)) {
    const groups: Group[] | undefined = window.baseDS.groups;
    if (!isUndefined(groups)) {
      const selectedGroup = groups.find((g: Group) => g.normalized_name === group);
      if (!isUndefined(selectedGroup)) {
        return selectedGroup.name;
      }
    }
  }
};

export default getGroupName;

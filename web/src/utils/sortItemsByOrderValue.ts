import { sortBy } from 'lodash';

import { BaseItem } from '../types';

const sortItemsByOrderValue = (items: BaseItem[]): BaseItem[] => {
  return sortBy(items, ['featured.order']);
};

export default sortItemsByOrderValue;

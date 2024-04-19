import sortBy from 'lodash/sortBy';

import { BaseItem } from '../types';

const sortItemsByOrderValue = (items: BaseItem[]): BaseItem[] => {
  return sortBy(items, ['featured.order']);
};

export default sortItemsByOrderValue;

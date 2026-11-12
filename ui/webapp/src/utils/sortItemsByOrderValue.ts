import sortBy from 'lodash/sortBy';

import { BaseItem } from '../types';

/** Sorts the items by their featured order, keeping the items that are not featured last. */
const sortItemsByOrderValue = <T extends BaseItem>(items: T[]): T[] => sortBy(items, ['featured.order']);

export default sortItemsByOrderValue;

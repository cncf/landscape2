import groupBy from 'lodash/groupBy';
import mapValues from 'lodash/mapValues';

import { BaseItem, Item } from '../types';

const nestArray = (seq: (BaseItem | Item)[], keys: string[]): unknown => {
  if (!keys.length) return seq;
  const first = keys[0];
  const rest = keys.slice(1);
  return mapValues(groupBy(seq, first), (value: (BaseItem | Item)[]) => {
    return nestArray(value, rest);
  });
};

export default nestArray;

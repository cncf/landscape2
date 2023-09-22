import { BaseData, Stats } from './types';

declare global {
  interface Window {
    baseDS: BaseData;
    statsDS: Stats;
  }
}

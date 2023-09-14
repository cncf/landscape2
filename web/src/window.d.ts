import { BaseData } from './types';

declare global {
  interface Window {
    baseDS: BaseData;
  }
}

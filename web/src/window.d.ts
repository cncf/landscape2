import { BaseData, Stats } from './types';

declare global {
  interface Window {
    baseDS: BaseData;
    statsDS: Stats;
    Osano: { cm: { showDrawer: (t: string) => void; addEventListener: (t: string, f: unknown) => void } };
  }
}

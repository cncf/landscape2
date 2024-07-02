import { BaseData, Guide, Stats } from './types';

declare global {
  interface Window {
    baseDS: BaseData;
    statsDS: Stats;
    guide?: Guide;
    basePath?: string;
    Osano: { cm: { showDrawer: (t: string) => void; addEventListener: (t: string, f: unknown) => void } };
  }
}

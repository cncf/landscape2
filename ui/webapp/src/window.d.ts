import type { BaseData, Guide, Stats } from 'common';

declare global {
  interface Window {
    baseDS: BaseData;
    statsDS: Stats;
    guide?: Guide;
    Osano?: { cm: { showDrawer: (t: string) => void; addEventListener: (t: string, f: unknown) => void } };
  }
}

import type { BaseData } from '../types';

/** Canonical landscape palette (`Colors::default()` in the core crate). */
const DEFAULT_COLORS: BaseData['colors'] = {
  color1: 'rgba(0, 107, 204, 1)',
  color2: 'rgba(255, 0, 170, 1)',
  color3: 'rgba(96, 149, 214, 1)',
  color4: 'rgba(0, 42, 81, 0.7)',
  color5: 'rgba(1, 107, 204, 0.7)',
  color6: 'rgba(0, 42, 81, 0.7)',
  color7: 'rgba(180, 219, 255, 1)',
};

/** Creates a minimal valid base dataset; overrides replace or extend the default fields. */
export const createBaseData = (overrides: Partial<BaseData> = {}): BaseData => ({
  categories: [],
  colors: DEFAULT_COLORS,
  finances_available: false,
  foundation: 'Test Foundation',
  items: [],
  url: 'https://landscape.example.org',
  ...overrides,
});

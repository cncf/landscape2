import { BaseData } from '../types';
import getLandscapeUrl from './getLandscapeUrl';

const createBaseData = (overrides: Partial<BaseData> = {}): BaseData => ({
  finances_available: false,
  foundation: '',
  categories: [],
  items: [],
  ...overrides,
});

describe('getLandscapeUrl', () => {
  it('should append the configured base path to the provided origin', () => {
    window.baseDS = createBaseData({ base_path: '/some-landscape' });

    expect(getLandscapeUrl('https://example.com')).toBe('https://example.com/some-landscape');
  });

  it('should return the provided origin when no base path is configured', () => {
    window.baseDS = createBaseData();

    expect(getLandscapeUrl('https://example.com')).toBe('https://example.com');
  });

  it('should return the provided origin when base data is not available', () => {
    window.baseDS = undefined as unknown as BaseData;

    expect(getLandscapeUrl('https://example.com')).toBe('https://example.com');
  });
});

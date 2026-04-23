import { BaseData, Group } from '../types';
import sortCategoriesByGroupOrder from './sortCategoriesByGroupOrder';

const createGroup = (overrides: Partial<Group> = {}): Group => ({
  name: 'AI Native',
  normalized_name: 'ai-native',
  categories: ['AI Agent', 'Inference', 'Training', 'Data', 'AI Native Infra'],
  ...overrides,
});

const createBaseData = (overrides: Partial<BaseData> = {}): BaseData => ({
  finances_available: false,
  foundation: '',
  categories: [],
  items: [],
  ...overrides,
});

describe('sortCategoriesByGroupOrder', () => {
  it('should follow the configured group category order', () => {
    window.baseDS = createBaseData({
      groups: [createGroup()],
    });

    expect(sortCategoriesByGroupOrder(['AI Agent', 'Training', 'Data', 'Inference'], 'ai-native')).toEqual([
      'AI Agent',
      'Inference',
      'Training',
      'Data',
    ]);
  });

  it('should keep categories unchanged for the all group option', () => {
    window.baseDS = createBaseData({
      groups: [createGroup()],
    });

    expect(sortCategoriesByGroupOrder(['AI Agent', 'Training', 'Data', 'Inference'], 'all')).toEqual([
      'AI Agent',
      'Training',
      'Data',
      'Inference',
    ]);
  });
});

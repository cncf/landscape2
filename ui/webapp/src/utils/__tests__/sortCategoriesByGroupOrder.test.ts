import { describe, expect, it } from 'vitest';

import { createBaseData } from '../../test-utils/fixtures';
import type { Group } from '../../types';
import sortCategoriesByGroupOrder from '../sortCategoriesByGroupOrder';

const CATEGORIES = ['AI Agent', 'Training', 'Data', 'Inference'];

describe('sortCategoriesByGroupOrder', () => {
  it('follows the category order configured for the group', () => {
    window.baseDS = createBaseData({ groups: [createGroup()] });

    expect(sortCategoriesByGroupOrder(CATEGORIES, 'ai-native')).toEqual(['AI Agent', 'Inference', 'Training', 'Data']);
  });

  it('places the categories outside the group after the group ones, in their given order', () => {
    window.baseDS = createBaseData({ groups: [createGroup({ categories: ['Inference', 'AI Agent'] })] });

    expect(sortCategoriesByGroupOrder(['Training', 'AI Agent', 'Data', 'Inference'], 'ai-native')).toEqual([
      'Inference',
      'AI Agent',
      'Training',
      'Data',
    ]);
  });

  it.each([
    ['the all option', 'all', [createGroup()]],
    ['an unknown group', 'unknown', [createGroup()]],
    ['a landscape with no groups configured', 'ai-native', undefined],
  ])('keeps the given order for %s', (_, group, groups) => {
    window.baseDS = createBaseData({ groups });

    expect(sortCategoriesByGroupOrder(CATEGORIES, group)).toEqual(CATEGORIES);
  });
});

// Helpers.

/** Creates a group with the categories of an AI landscape, with the overrides given. */
function createGroup(overrides: Partial<Group> = {}): Group {
  return {
    name: 'AI Native',
    normalized_name: 'ai-native',
    categories: ['AI Agent', 'Inference', 'Training', 'Data', 'AI Native Infra'],
    ...overrides,
  };
}

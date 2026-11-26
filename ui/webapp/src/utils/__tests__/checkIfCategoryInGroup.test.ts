import { describe, expect, it } from 'vitest';

import { ALL_OPTION } from '../../data';
import { createBaseData } from '../../test-utils/fixtures';
import type { Group } from '../../types';
import checkIfCategoryInGroup from '../checkIfCategoryInGroup';

/** Group with one category. */
const GROUPS: Group[] = [{ categories: ['Category A'], name: 'Group 1', normalized_name: 'group-1' }];

describe('checkIfCategoryInGroup', () => {
  it.each([
    ['a category of the group', GROUPS, 'Category A', 'group-1', true],
    ['a category outside the group', GROUPS, 'Category B', 'group-1', false],
    ['an unknown group', GROUPS, 'Category A', 'unknown', false],
    ['the all option', GROUPS, 'Category B', ALL_OPTION, true],
    ['a landscape with no groups configured', undefined, 'Category A', 'group-1', true],
  ])('checks %s', (_, groups, category, group, expected) => {
    window.baseDS = createBaseData({ groups });

    expect(checkIfCategoryInGroup(category, group)).toBe(expected);
  });
});

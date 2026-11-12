import { describe, expect, it, vi } from 'vitest';

import { createBaseData } from '../../test-utils/fixtures';
import type { Group } from '../../types';
import { findGroupByAliasPath, getGroupAliasRoutes, normalizeAlias } from '../groupAlias';

describe('normalizeAlias', () => {
  it.each([
    ['projects', 'projects'],
    ['/projects/', 'projects'],
    ['//projects//', 'projects'],
    ['  projects  ', 'projects'],
    [' / projects / ', 'projects'],
  ])('normalizes %j to %j', (alias, expected) => {
    expect(normalizeAlias(alias)).toBe(expected);
  });

  it.each([[undefined], [''], ['   '], ['/'], [' // ']])('gives no alias for %j', (alias) => {
    expect(normalizeAlias(alias)).toBeUndefined();
  });
});

describe('getGroupAliasRoutes', () => {
  it('lists the normalized aliases once, keeping the first group of a duplicate', () => {
    const groups = [
      createGroup('Projects', { alias: '/projects/', normalized_name: 'projects-group' }),
      createGroup('No alias', { normalized_name: 'no-alias' }),
      createGroup('Empty alias', { alias: ' / ', normalized_name: 'empty-alias' }),
      createGroup('Not normalized', { alias: 'raw' }),
      createGroup('Duplicate', { alias: 'projects', normalized_name: 'duplicate' }),
      createGroup('Members', { alias: ' members ', normalized_name: 'members-group' }),
    ];

    expect(getGroupAliasRoutes(groups)).toEqual([
      { alias: 'projects', normalized: 'projects-group' },
      { alias: 'members', normalized: 'members-group' },
    ]);
  });

  it('gives no routes when the landscape has no groups', () => {
    expect(getGroupAliasRoutes(undefined)).toEqual([]);
  });
});

describe('findGroupByAliasPath', () => {
  const groups = [
    createGroup('Projects', { alias: ' /projects/ ', normalized_name: 'projects-group' }),
    createGroup('Empty alias', { alias: '', normalized_name: 'empty-alias' }),
    createGroup('Duplicate', { alias: 'projects', normalized_name: 'duplicate' }),
  ];

  it.each([['/projects'], ['/projects/'], ['//projects//']])('finds the group of the alias path %j', (pathname) => {
    expect(findGroupByAliasPath(pathname, groups)).toBe('projects-group');
  });

  it('keeps the first group when an alias is duplicated', () => {
    const duplicatedGroups = [
      createGroup('Other', { alias: '/other/', normalized_name: 'other' }),
      createGroup('First', { alias: 'shared', normalized_name: 'first' }),
      createGroup('Last', { alias: '/shared/', normalized_name: 'last' }),
    ];

    expect(findGroupByAliasPath('/shared', duplicatedGroups)).toBe('first');
  });

  it.each([['/'], ['/members'], ['/projects/extra'], ['/stats']])('finds no group for the path %j', (pathname) => {
    expect(findGroupByAliasPath(pathname, groups)).toBeUndefined();
  });

  it('finds no group when the landscape has no groups', () => {
    expect(findGroupByAliasPath('/projects', undefined)).toBeUndefined();
  });

  it('finds the alias under the base path only', async () => {
    // Load the module for a landscape served under a base path
    vi.resetModules();
    window.baseDS = createBaseData({ base_path: '/landscape' });
    const groupAlias = await import('../groupAlias');

    // Verify the alias is matched after the base path, and not at the root
    expect(groupAlias.findGroupByAliasPath('/landscape/projects', groups)).toBe('projects-group');
    expect(groupAlias.findGroupByAliasPath('/projects', groups)).toBeUndefined();
  });
});

// Helpers.

/** Creates a group with the name provided, a category and the optional fields given. */
const createGroup = (name: string, fields: Pick<Group, 'alias' | 'normalized_name'>): Group => ({
  categories: ['Category'],
  name,
  ...fields,
});

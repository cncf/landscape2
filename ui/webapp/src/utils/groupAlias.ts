import { EXPLORE_PATH } from '../data';
import type { Group } from '../types';

/** Route of a group alias: the normalized alias and the normalized name of its group. */
export interface GroupAliasRoute {
  alias: string;
  normalized: string;
}

/**
 * Returns the group whose alias matches the path after the Explore path (ignoring
 * surrounding slashes), or `undefined`. When an alias is duplicated, the first group wins.
 */
export const findGroupByAliasPath = (pathname: string, groups: Group[] | undefined): string | undefined => {
  if (!pathname.startsWith(EXPLORE_PATH)) return undefined;

  const path = normalizeAlias(pathname.slice(EXPLORE_PATH.length));
  if (path === undefined) return undefined;

  return getGroupAliasRoutes(groups).find((route) => route.alias === path)?.normalized;
};

/**
 * Lists the alias routes of the groups that have an alias and a normalized name, once
 * per normalized alias: when an alias is duplicated, the first group wins.
 */
export const getGroupAliasRoutes = (groups: Group[] | undefined): GroupAliasRoute[] => {
  const routes: GroupAliasRoute[] = [];

  for (const group of groups ?? []) {
    const alias = normalizeAlias(group.alias);
    if (alias === undefined || !group.normalized_name) continue;
    if (routes.some((route) => route.alias === alias)) continue;
    routes.push({ alias, normalized: group.normalized_name });
  }

  return routes;
};

/** Returns the alias without surrounding whitespace and slashes, or `undefined` when nothing is left. */
export const normalizeAlias = (alias?: string): string | undefined => {
  const normalized = alias
    ?.trim()
    .replace(/^\/+|\/+$/g, '')
    .trim();
  return normalized ? normalized : undefined;
};

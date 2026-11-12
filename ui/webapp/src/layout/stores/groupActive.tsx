import { useLocation, useNavigate, useSearchParams } from '@solidjs/router';
import { createContext, createEffect, createMemo, ParentComponent, useContext } from 'solid-js';

import { ALL_OPTION, GROUP_PARAM } from '../../data';
import { findGroupByAliasPath } from '../../utils/groupAlias';
import isExploreSection from '../../utils/isExploreSection';
import itemsDataGetter from '../../utils/itemsDataGetter';
import { buildPath, RawParam, withParams } from '../../utils/urlParams';

/** Inputs of the active group resolution. */
interface ResolveGroupInput {
  /** Group query param. */
  groupParam: RawParam;
  /** Normalized names of the groups with categories, `undefined` when the landscape has no groups. */
  groups: string[] | undefined;
  /** Current pathname, which may be a group alias. */
  pathname: string;
}

function useGroupActiveProvider() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const group = createMemo(() =>
    resolveGroup({
      groupParam: searchParams[GROUP_PARAM],
      groups: itemsDataGetter.getGroups(),
      pathname: location.pathname,
    })
  );

  // Correct an invalid group param on Explore, keeping every other param and the hash
  createEffect(() => {
    const groupParam = searchParams[GROUP_PARAM];
    const groups = itemsDataGetter.getGroups();
    const firstGroup = groups?.[0];
    if (
      groupParam === undefined ||
      groups === undefined ||
      firstGroup === undefined ||
      !isExploreSection(location.pathname) ||
      isValidGroupParam(groupParam, groups)
    ) {
      return;
    }

    navigate(buildPath(location.pathname, withParams(location.search, { [GROUP_PARAM]: firstGroup }), location.hash), {
      replace: true,
      scroll: false,
    });
  });

  return { group };
}

type ContextGroupActiveType = ReturnType<typeof useGroupActiveProvider>;

const GroupActiveContext = createContext<ContextGroupActiveType | undefined>(undefined);

export const GroupActiveProvider: ParentComponent = (props) => {
  const value = useGroupActiveProvider();
  return <GroupActiveContext.Provider value={value}>{props.children}</GroupActiveContext.Provider>;
};

function useGroupActiveContext() {
  const context = useContext(GroupActiveContext);
  if (context === undefined) {
    throw new Error(`useGroupActiveContext must be used within a GroupActiveProvider`);
  }
  return context;
}

/** Returns the active group accessor, which gives the all option when the landscape has no groups. */
export function useGroupActive() {
  const group = useResolvedGroup();
  return () => group() ?? ALL_OPTION;
}

/** Returns the resolved group accessor, which gives `undefined` when the landscape has no groups. */
export function useResolvedGroup() {
  return useGroupActiveContext().group;
}

/** Checks whether the group param names one of the groups or the all option. */
function isValidGroupParam(groupParam: RawParam, groups: string[]): groupParam is string {
  return typeof groupParam === 'string' && (groupParam === ALL_OPTION || groups.includes(groupParam));
}

/**
 * Resolves the active group: the group of an alias path, else a valid group param or
 * the all option, else the first group. `undefined` when the landscape has no groups.
 */
function resolveGroup({ groupParam, groups, pathname }: ResolveGroupInput): string | undefined {
  if (groups === undefined) return undefined;

  const aliasGroup = findGroupByAliasPath(pathname, window.baseDS?.groups);
  if (aliasGroup !== undefined && groups.includes(aliasGroup)) return aliasGroup;

  return isValidGroupParam(groupParam, groups) ? groupParam : groups[0];
}

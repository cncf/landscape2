import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';

import {
  DEFAULT_VIEW_MODE,
  EXPLORE_PATH,
  GAMES_PATH,
  GROUP_PARAM,
  GUIDE_PATH,
  STATS_PATH,
  VIEW_MODE_PARAM,
} from '../../data';
import isExploreSection from '../../utils/isExploreSection';
import itemsDataGetter from '../../utils/itemsDataGetter';

/** Internal navigation link shared by the header and the mobile navigation menu. */
export interface NavLink {
  /** Visible label. */
  label: string;
  /** Path the link points to. */
  path: string;
  /** Whether the link is shown, given whether the stats page is available. */
  isVisible: (statsVisible: boolean) => boolean;
  /** Query added to the link, read when the link is rendered. */
  query?: () => string;
}

/** Internal navigation links, in display order. GitHub is an external link and stays separate. */
export const NAV_LINKS: NavLink[] = [
  { label: 'Explore', path: EXPLORE_PATH, isVisible: () => true, query: () => getDefaultExploreQuery() },
  {
    label: 'Guide',
    path: GUIDE_PATH,
    isVisible: () => !isUndefined(window.baseDS.guide_summary) && !isEmpty(window.baseDS.guide_summary),
  },
  { label: 'Stats', path: STATS_PATH, isVisible: (statsVisible) => statsVisible },
  { label: 'Games', path: GAMES_PATH, isVisible: () => !isUndefined(window.baseDS.games_available) },
];

/**
 * Returns the query of the default Explore view: the first group, when the landscape
 * has groups, and the default view mode.
 */
export const getDefaultExploreQuery = (): string => {
  const params = new URLSearchParams();
  const firstGroup = itemsDataGetter.getGroups()?.[0];
  if (!isUndefined(firstGroup)) {
    params.set(GROUP_PARAM, firstGroup);
  }
  params.set(VIEW_MODE_PARAM, DEFAULT_VIEW_MODE);
  return params.toString();
};

/**
 * Checks whether the link points to the current page. Explore is current on every
 * path that renders it (the embed setup path too); the other links on their own path.
 */
export const isNavLinkActive = (link: NavLink, pathname: string): boolean =>
  link.path === EXPLORE_PATH ? isExploreSection(pathname) : link.path === pathname;

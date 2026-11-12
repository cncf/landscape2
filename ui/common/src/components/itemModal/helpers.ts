import type { Item } from '../../types/datasets';
import { SVGIconKind } from '../../types/types';
import { prettifyNumber } from '../../utils/prettifyNumber';

/** Header link of an item, in the order the item modal displays them. */
export interface HeaderLink {
  href: string;
  icon: SVGIconKind;
  key: string;
  label: string;
}

/** Headquarters location parts of an organization. */
export interface LocationParts {
  city?: string;
  country?: string;
  region?: string;
}

// Host of the GitHub repositories urls
const GITHUB_HOST = 'github.com';

// Icon of each package manager, by host; subdomains of a host get its icon too
const PACKAGE_MANAGER_ICONS: Record<string, SVGIconKind> = {
  'cocoapods.org': SVGIconKind.Cocoapods,
  'cpan.org': SVGIconKind.Perl,
  'crates.io': SVGIconKind.Rust,
  'hex.pm': SVGIconKind.Erlang,
  'maven.apache.org': SVGIconKind.MavenApache,
  'metacpan.org': SVGIconKind.Perl,
  'npmjs.com': SVGIconKind.NPM,
  'nuget.org': SVGIconKind.Nuget,
  'packagist.org': SVGIconKind.Packagist,
  'pub.dev': SVGIconKind.Flutter,
  'pypi.org': SVGIconKind.PyPi,
  'rubygems.org': SVGIconKind.RubyGems,
};

/**
 * Formats the employees range of an organization.
 *
 * @param min - Minimum number of employees
 * @param max - Maximum number of employees
 * @returns `min - max`, `> min`, `< max`, or `-` when both are missing
 */
export const formatEmployeesRange = (min?: number, max?: number): string => {
  if (min !== undefined && max !== undefined) return `${prettifyNumber(min)} - ${prettifyNumber(max)}`;
  if (min !== undefined) return `> ${prettifyNumber(min)}`;
  if (max !== undefined) return `< ${prettifyNumber(max)}`;
  return '-';
};

/**
 * Formats a location from its present parts.
 *
 * @param parts - City, region and country, each optional
 * @returns The present parts joined with `, `, or an empty string when none is present
 */
export const formatLocation = (parts: LocationParts): string =>
  [parts.city, parts.region, parts.country].filter((part) => part !== undefined && part !== '').join(', ');

/**
 * Returns the `owner/repo` path of a GitHub repository url. This is a presentation check on the url host,
 * used to choose the repository icon and badge.
 *
 * @param url - Repository url
 * @returns `owner/repo`, or `null` when the url is not a GitHub repository url
 */
export const getGitHubRepoPath = (url: string): string | null => {
  const parsedUrl = parseUrl(url);
  if (parsedUrl?.hostname !== GITHUB_HOST) return null;

  const segments = parsedUrl.pathname.split('/').filter((segment) => segment !== '');
  return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : null;
};

/**
 * Returns the header links of an item, in display order. Only the links whose field is set are returned.
 *
 * @param item - Item to get the links of
 * @returns Ordered links, each with a stable key, its label (also used as title) and icon
 */
export const getItemLinks = (item: Item): HeaderLink[] => {
  const primaryRepo = item.repositories?.find((repo) => repo.primary);
  const linkedInUrl = getLinkedInUrl(item);
  const links: (Omit<HeaderLink, 'href'> & { href?: string })[] = [
    { key: 'website', label: 'Website', href: item.website, icon: SVGIconKind.World },
    {
      key: 'repository',
      label: 'Repository',
      href: primaryRepo?.url,
      icon:
        primaryRepo !== undefined && getGitHubRepoPath(primaryRepo.url) !== null
          ? SVGIconKind.GitHubCircle
          : SVGIconKind.Link,
    },
    { key: 'devstats', label: 'Devstats', href: item.devstats_url, icon: SVGIconKind.Stats },
    { key: 'twitter', label: 'X (Twitter)', href: item.twitter_url, icon: SVGIconKind.Twitter },
    { key: 'youtube', label: 'Youtube', href: item.youtube_url, icon: SVGIconKind.Youtube },
    { key: 'linkedin', label: 'LinkedIn', href: linkedInUrl, icon: SVGIconKind.LinkedIn },
    { key: 'slack', label: 'Slack', href: item.slack_url, icon: SVGIconKind.Slack },
    { key: 'discord', label: 'Discord', href: item.discord_url, icon: SVGIconKind.Discord },
    { key: 'docker', label: 'Docker', href: item.docker_url, icon: SVGIconKind.Docker },
    { key: 'stack-overflow', label: 'Stack overflow', href: item.stack_overflow_url, icon: SVGIconKind.StackOverflow },
    // Projects link their organization through the Organization section, not the header
    {
      key: 'crunchbase',
      label: 'Crunchbase',
      href: item.maturity === undefined ? item.crunchbase_url : undefined,
      icon: SVGIconKind.Crunchbase,
    },
    { key: 'blog', label: 'Blog', href: item.blog_url, icon: SVGIconKind.Blog },
    { key: 'mailing-list', label: 'Mailing list', href: item.mailing_list_url, icon: SVGIconKind.MailingList },
    {
      key: 'openssf-best-practices',
      label: 'OpenSSF best practices',
      href: item.openssf_best_practices_url,
      icon: SVGIconKind.OpenssfBestPractices,
    },
    { key: 'artwork', label: 'Artwork', href: item.artwork_url, icon: SVGIconKind.Artwork },
    {
      key: 'github-discussions',
      label: 'Github discussions',
      href: item.github_discussions_url,
      icon: SVGIconKind.Discussions,
    },
    { key: 'documentation', label: 'Documentation', href: item.documentation_url, icon: SVGIconKind.Book },
    {
      key: 'package-manager',
      label: 'Package manager',
      href: item.package_manager_url,
      icon:
        item.package_manager_url !== undefined
          ? getPackageManagerIcon(item.package_manager_url)
          : SVGIconKind.PackageManager,
    },
    { key: 'pinterest', label: 'Pinterest', href: item.pinterest_url, icon: SVGIconKind.Pinterest },
    { key: 'reddit', label: 'Reddit', href: item.reddit_url, icon: SVGIconKind.Reddit },
    { key: 'bluesky', label: 'Bluesky', href: item.bluesky_url, icon: SVGIconKind.Bluesky },
    { key: 'facebook', label: 'Facebook', href: item.facebook_url, icon: SVGIconKind.Facebook },
    { key: 'gitter', label: 'Gitter', href: item.gitter_url, icon: SVGIconKind.Discussions },
  ];

  return links.filter((link): link is HeaderLink => link.href !== undefined && link.href !== '');
};

/**
 * Returns the LinkedIn url of an item: its own, or its organization's one from Crunchbase.
 *
 * @param item - Item to get the LinkedIn url of
 * @returns LinkedIn url, or `undefined` when none is available
 */
export const getLinkedInUrl = (item: Item): string | undefined =>
  item.linkedin_url ?? item.crunchbase_data?.linkedin_url;

/**
 * Returns the icon of a package manager url, matching its host exactly or as a subdomain.
 *
 * @param url - Package manager url
 * @returns Icon of the package manager, or the generic package manager icon for unknown hosts
 */
export const getPackageManagerIcon = (url: string): SVGIconKind => {
  const hostname = parseUrl(url)?.hostname;
  if (hostname === undefined) return SVGIconKind.PackageManager;

  const host = Object.keys(PACKAGE_MANAGER_ICONS).find((key) => hostname === key || hostname.endsWith(`.${key}`));
  return host !== undefined ? PACKAGE_MANAGER_ICONS[host] : SVGIconKind.PackageManager;
};

/**
 * Checks whether an item has a CLOMonitor report to display: both its CLOMonitor name and the report
 * summary the build fetched.
 *
 * @param item - Item to check
 * @returns Whether both CLOMonitor fields are present
 */
export const hasClomonitorReport = (item: Item): boolean =>
  item.clomonitor_name !== undefined &&
  item.clomonitor_name !== '' &&
  item.clomonitor_report_summary !== undefined &&
  item.clomonitor_report_summary !== '';

/** Parses a url, returning `undefined` when it is not valid. */
const parseUrl = (url: string): URL | undefined => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};
